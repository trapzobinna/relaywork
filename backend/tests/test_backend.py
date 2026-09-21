import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.core.config import settings
from main import app
from app.models import User, UserRole, Job, JobStatus, SkillCategory, ProProfile, VerificationStatus, Payment, PaymentStatus

TEST_SQLALCHEMY_DATABASE_URL = 'sqlite:///./test_relaywork.db'
test_engine = create_engine(TEST_SQLALCHEMY_DATABASE_URL, connect_args={'check_same_thread': False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope='module', autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    cat = SkillCategory(name='Test Electrical', slug='test-elec', icon='Zap')
    db.add(cat)
    db.commit()
    yield
    Base.metadata.drop_all(bind=test_engine)

def test_health():
    res = client.get('/api/health')
    assert res.status_code == 200
    assert res.json()['status'] == 'healthy'

def test_admin_bootstrap_flow():
    # 1. Reject invalid token
    res = client.post('/api/admin/bootstrap', json={
        'bootstrap_token': 'wrong_invalid_token',
        'email': 'admin_root@relaywork.local',
        'password': 'AdminPassword123!',
        'full_name': 'Root Admin'
    })
    assert res.status_code == 403

    # 2. Allow bootstrap with valid token
    res = client.post('/api/admin/bootstrap', json={
        'bootstrap_token': settings.ADMIN_BOOTSTRAP_TOKEN,
        'email': 'admin_root@relaywork.local',
        'password': 'AdminPassword123!',
        'full_name': 'Root Admin'
    })
    assert res.status_code == 200
    assert res.json()['role'] == 'admin'

    # 3. Deny subsequent bootstrap calls once an admin exists
    res_repeat = client.post('/api/admin/bootstrap', json={
        'bootstrap_token': settings.ADMIN_BOOTSTRAP_TOKEN,
        'email': 'another_admin@relaywork.local',
        'password': 'AdminPassword123!',
        'full_name': 'Intruder'
    })
    assert res_repeat.status_code == 400

def test_user_flow_and_ownership():
    # Register client
    res_c = client.post('/api/auth/register', json={
        'email': 'client_unit@test.com',
        'password': 'Password123!',
        'full_name': 'Unit Client',
        'role': 'client'
    })
    assert res_c.status_code == 200
    c_tok = res_c.json()['access_token']

    # Register pro
    res_p = client.post('/api/auth/register', json={
        'email': 'pro_unit@test.com',
        'password': 'Password123!',
        'full_name': 'Unit Pro',
        'role': 'pro'
    })
    assert res_p.status_code == 200
    p_tok = res_p.json()['access_token']

    # Client creates a job
    j_res = client.post('/api/jobs', json={
        'skill_category_id': 1,
        'title': 'Unit test job title',
        'description': 'Description for unit test job with enough length',
        'budget_amount': 15000.0,
        'latitude': 6.45,
        'longitude': 3.40
    }, headers={'Authorization': f'Bearer {c_tok}'})
    assert j_res.status_code == 201
    job_id = j_res.json()['id']

    # Unauthorized accept check: Pro not assigned cannot accept
    p_acc = client.post(f'/api/jobs/{job_id}/accept', headers={'Authorization': f'Bearer {p_tok}'})
    assert p_acc.status_code == 403

def test_webhook_idempotency():
    db = TestingSessionLocal()
    pay = Payment(
        job_id=1,
        amount=15000.0,
        commission_amount=2250.0,
        pro_payout_amount=12750.0,
        paystack_reference='ref_unit_idempotent_999',
        status=PaymentStatus.PENDING
    )
    db.add(pay)
    db.commit()

    payload_dict = {
        'event': 'charge.success',
        'data': {
            'reference': 'ref_unit_idempotent_999'
        }
    }
    
    # First call
    r1 = client.post('/api/payments/webhook', json=payload_dict, headers={
        'x-paystack-signature': 'mock_signature_test'
    })
    assert r1.status_code == 200
    assert r1.json()['status'] == 'success'

    # Second call (replay)
    r2 = client.post('/api/payments/webhook', json=payload_dict, headers={
        'x-paystack-signature': 'mock_signature_test'
    })
    assert r2.status_code == 200
    assert r2.json()['status'] == 'already_processed'

def test_live_location_tracking_and_ownership():
    db = TestingSessionLocal()
    
    # 1. Setup client and 2 pros
    res_c = client.post('/api/auth/register', json={
        'email': 'client_track@test.com',
        'password': 'Password123!',
        'full_name': 'Tracking Client',
        'role': 'client'
    })
    c_tok = res_c.json()['access_token']
    c_id = res_c.json()['user_id']

    res_p1 = client.post('/api/auth/register', json={
        'email': 'pro_assigned@test.com',
        'password': 'Password123!',
        'full_name': 'Assigned Pro',
        'role': 'pro'
    })
    p1_tok = res_p1.json()['access_token']
    p1_id = res_p1.json()['user_id']

    res_p2 = client.post('/api/auth/register', json={
        'email': 'pro_unassigned@test.com',
        'password': 'Password123!',
        'full_name': 'Unassigned Pro',
        'role': 'pro'
    })
    p2_tok = res_p2.json()['access_token']

    # 2. Create job assigned explicitly to Pro 1
    job = Job(
        client_id=c_id,
        pro_id=p1_id,
        skill_category_id=1,
        title='Pipe Repair at Victoria Island',
        description='Urgent pipe leak inspection',
        budget_amount=20000.0,
        latitude=6.4281,
        longitude=3.4219,
        status=JobStatus.ACCEPTED
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # 3. Ownership check: Unassigned Pro 2 cannot POST location
    unauth_loc = client.post(f'/api/jobs/{job.id}/location', json={
        'latitude': 6.5000,
        'longitude': 3.3500
    }, headers={'Authorization': f'Bearer {p2_tok}'})
    assert unauth_loc.status_code == 403

    # 4. Assigned Pro 1 POSTs location -> Accepted (distance ~8.9km)
    loc1 = client.post(f'/api/jobs/{job.id}/location', json={
        'latitude': 6.5000,
        'longitude': 3.3500
    }, headers={'Authorization': f'Bearer {p1_tok}'})
    assert loc1.status_code == 200
    assert loc1.json()['status'] == 'updated'
    assert loc1.json()['distance_meters'] > 500
    assert loc1.json()['has_arrived'] is False

    # 5. Server-side throttle check: Rapid ping under 5s is throttled
    loc_rapid = client.post(f'/api/jobs/{job.id}/location', json={
        'latitude': 6.5001,
        'longitude': 3.3501
    }, headers={'Authorization': f'Bearer {p1_tok}'})
    assert loc_rapid.status_code == 200
    assert loc_rapid.json()['status'] == 'throttled'

    # 6. Arrival alert check (<500m)
    db.expire_all()
    j_refresh = db.query(Job).filter(Job.id == job.id).first()
    j_refresh.last_location_updated_at = None # reset throttle for test
    db.commit()

    # Coordinates 200 meters away from job site (6.4281, 3.4219)
    loc_arrival = client.post(f'/api/jobs/{job.id}/location', json={
        'latitude': 6.4285,
        'longitude': 3.4225
    }, headers={'Authorization': f'Bearer {p1_tok}'})
    assert loc_arrival.status_code == 200
    assert loc_arrival.json()['status'] == 'updated'
    assert loc_arrival.json()['distance_meters'] < 500
    assert loc_arrival.json()['has_arrived'] is True

    # 7. Completed Job check: location update becomes a safe no-op
    db.expire_all()
    j_refresh = db.query(Job).filter(Job.id == job.id).first()
    j_refresh.status = JobStatus.COMPLETED
    j_refresh.last_location_updated_at = None
    db.commit()

    loc_completed = client.post(f'/api/jobs/{job.id}/location', json={
        'latitude': 6.4285,
        'longitude': 3.4225
    }, headers={'Authorization': f'Bearer {p1_tok}'})
    assert loc_completed.status_code == 200
    assert loc_completed.json()['status'] == 'ignored'


