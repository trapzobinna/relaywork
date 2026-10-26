import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models import User, UserRole, VisitorLog

TEST_DATABASE_URL = "sqlite:///./test_telemetry.db"
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
def setup_telemetry_db():
    app.dependency_overrides[get_db] = override_get_db
    app.state.limiter.enabled = False
    yield

def test_admin_live_telemetry_and_speeds():
    # 1. Create an admin user
    db = TestingSessionLocal()
    admin = User(
        email='telemetry_admin@relaywork.local',
        password_hash='hashed_pass',
        full_name='Chief Telemetry Admin',
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    # 2. Login as admin
    from app.core.security import create_access_token
    token = create_access_token(data={'sub': str(admin.id), 'role': 'admin'})

    # 3. Simulate requests from various IPs and User-Agents
    client.get('/api/health', headers={'X-Forwarded-For': '102.89.23.41', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'})
    client.get('/api/health', headers={'X-Forwarded-For': '197.211.38.112', 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605.1.15'})
    client.get('/api/health', headers={'X-Forwarded-For': '105.113.89.15', 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/128.0.0.0'})

    # 4. Query Live Telemetry endpoint
    res = client.get('/api/admin/telemetry/live', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    data = res.json()

    # Assert live user count and active sessions
    assert 'live_user_count' in data
    assert data['live_user_count'] >= 1
    assert 'live_users' in data
    assert len(data['live_users']) >= 1

    first_user = data['live_users'][0]
    assert 'ip_address' in first_user
    assert 'city' in first_user
    assert 'region' in first_user
    assert 'device' in first_user
    assert 'browser' in first_user
    assert 'os' in first_user
    assert 'role' in first_user

    # Assert real-time database speed
    assert 'database_speed' in data
    assert 'db_latency_ms' in data['database_speed']
    assert data['database_speed']['db_latency_ms'] >= 0.0
    assert 'status' in data['database_speed']

    # Assert real-time website speed
    assert 'website_speed' in data
    assert 'avg_response_time_ms' in data['website_speed']
    assert data['website_speed']['avg_response_time_ms'] >= 0.0

    # Assert all-time visits and regional breakdown
    assert 'all_time_visits' in data
    assert data['all_time_visits'] >= 1
    assert 'region_breakdown' in data
    assert len(data['region_breakdown']) >= 1
    assert 'user_type_breakdown' in data

    # 5. Query Telemetry logs endpoint
    logs_res = client.get('/api/admin/telemetry/logs?limit=10', headers={'Authorization': f'Bearer {token}'})
    assert logs_res.status_code == 200
    assert isinstance(logs_res.json(), list)

    db.close()
