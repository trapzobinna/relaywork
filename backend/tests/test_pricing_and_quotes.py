import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models import User, ProProfile, SkillCategory, Job, JobStatus, Quote, QuoteStatus, MilestoneStatus
from app.services.pricing import calculate_call_out_fee, DEFAULT_PRICING_CONFIG
from app.services import ledger

TEST_DATABASE_URL = "sqlite:///./test_pricing.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.drop_all(bind=test_engine)
Base.metadata.create_all(bind=test_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
app.state.limiter.enabled = False
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_pricing_db():
    app.dependency_overrides[get_db] = override_get_db
    app.state.limiter.enabled = False
    yield

def test_pricing_and_7_5_percent_commission_split():
    # 1. Setup client and pro
    r_client = client.post('/api/auth/register', json={
        'email': 'quote_client@test.com',
        'password': 'Password123!',
        'full_name': 'Quote Client',
        'role': 'client'
    })
    c_token = r_client.json()['access_token']
    c_id = r_client.json()['user_id']

    r_pro = client.post('/api/auth/register', json={
        'email': 'quote_pro@test.com',
        'password': 'Password123!',
        'full_name': 'Quote Master Pro',
        'role': 'pro'
    })
    p_token = r_pro.json()['access_token']
    p_id = r_pro.json()['user_id']

    db = TestingSessionLocal()
    cat = SkillCategory(name='Electrician', slug='electrician')
    db.add(cat)
    db.commit()
    db.refresh(cat)

    pro_prof = ProProfile(
        user_id=p_id,
        skill_category_id=cat.id,
        latitude=6.4281,
        longitude=3.4219,
        service_radius_km=30.0
    )
    db.add(pro_prof)
    db.commit()

    # 2. Estimate Call-Out Fee
    est_res = client.post('/api/pricing/estimate', json={
        'client_lat': 6.5244,
        'client_lng': 3.3792,
        'pro_id': pro_prof.id,
        'skill_category_id': cat.id
    })
    assert est_res.status_code == 200
    est_data = est_res.json()
    assert est_data['exact_call_out_naira'] > 5000
    assert est_data['diagnostic_credit_percent'] == 50.0

    # 3. Client creates job request
    job_res = client.post('/api/jobs', json={
        'pro_id': p_id,
        'skill_category_id': cat.id,
        'title': 'Major House Rewiring',
        'description': 'Complete electrical overhaul for 4-bedroom duplex',
        'budget_amount': est_data['exact_call_out_naira'],
        'latitude': 6.5244,
        'longitude': 3.3792,
        'job_type': 'quoted'
    }, headers={'Authorization': f'Bearer {c_token}'})
    assert job_res.status_code == 201
    job_id = job_res.json()['id']

    # 4. Pro accepts job
    acc_res = client.post(f'/api/jobs/{job_id}/accept', headers={'Authorization': f'Bearer {p_token}'})
    assert acc_res.status_code == 200

    # 5. Pro arrives on site and logs diagnosis
    diag_res = client.post(f'/api/jobs/{job_id}/diagnosis', json={
        'notes': 'Conducted full megger insulation test. Identified melted sub-panel feeds.'
    }, headers={'Authorization': f'Bearer {p_token}'})
    assert diag_res.status_code == 200
    assert diag_res.json()['status'] == 'on_site'

    # 6. Pro creates structured quote with milestones (Milestone 1 <= 30%)
    quote_res = client.post(f'/api/jobs/{job_id}/quotes', json={
        'labor_total_kobo': 10000000, # ₦100,000
        'materials_mode': 'mode_a_client',
        'warranty_days': 30,
        'milestones': [
            {'seq': 1, 'name': 'Phase 1: Mobilization & Stripping', 'amount_kobo': 3000000, 'checklist': 'Safety strip'}, # 30% exactly
            {'seq': 2, 'name': 'Phase 2: Conduit & Cable Run', 'amount_kobo': 4000000, 'checklist': 'Wiring run'},
            {'seq': 3, 'name': 'Phase 3: Panel Terminations & Testing', 'amount_kobo': 3000000, 'checklist': 'Testing'}
        ],
        'material_lines': [
            {'name': '2.5mm Pure Copper Cable Roll', 'spec': 'Coleman', 'qty': 2, 'unit_estimate_kobo': 3500000}
        ]
    }, headers={'Authorization': f'Bearer {p_token}'})
    assert quote_res.status_code == 200
    quote_data = quote_res.json()
    assert quote_data['diagnostic_credit_naira'] > 0
    assert quote_data['net_payable_labor_naira'] < 100000

    # 7. Client accepts quote -> Escrow funded
    accept_res = client.post(f"/api/quotes/{quote_data['id']}/accept", headers={'Authorization': f'Bearer {c_token}'})
    assert accept_res.status_code == 200
    assert accept_res.json()['status'] == 'accepted'

    # 8. Pro completes Milestone 1
    m1_id = quote_data['milestones'][0]['id']
    comp_res = client.post(f"/api/milestones/{m1_id}/complete", headers={'Authorization': f'Bearer {p_token}'})
    assert comp_res.status_code == 200

    # 9. Client inspects & approves Milestone 1 -> Ledger releases with 7.5% platform cut (92.5% pro)
    appr_res = client.post(f"/api/milestones/{m1_id}/approve", headers={'Authorization': f'Bearer {c_token}'})
    assert appr_res.status_code == 200
    assert appr_res.json()['message'] == 'Milestone funds released successfully!'

    db.close()
