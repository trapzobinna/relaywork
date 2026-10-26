import os
import sys
import random
from datetime import datetime, timezone, timedelta
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models import VisitorLog, User
from app.services.telemetry import telemetry_service

def utcnow():
    return datetime.now(timezone.utc)

def seed_sample_traffic():
    db = SessionLocal()
    existing_count = db.query(VisitorLog).count()
    if existing_count > 25:
        print(f"VisitorLog already has {existing_count} records.")
        db.close()
        return

    users = db.query(User).all()
    pro_users = [u for u in users if u.role.value == 'pro']
    client_users = [u for u in users if u.role.value == 'client']

    regions = [
        {'city': 'Ikeja / Allen Ave', 'region': 'Lagos State', 'country': 'Nigeria', 'ip': '102.89.23.41'},
        {'city': 'Victoria Island / Lekki', 'region': 'Lagos State', 'country': 'Nigeria', 'ip': '197.210.55.19'},
        {'city': 'Surulere / Yaba', 'region': 'Lagos State', 'country': 'Nigeria', 'ip': '105.112.44.82'},
        {'city': 'Maitama / Central', 'region': 'Abuja FCT', 'country': 'Nigeria', 'ip': '197.211.38.112'},
        {'city': 'Garki / Wuse 2', 'region': 'Abuja FCT', 'country': 'Nigeria', 'ip': '102.90.12.56'},
        {'city': 'GRA Phase 2', 'region': 'Rivers State', 'country': 'Nigeria', 'ip': '105.113.89.15'},
        {'city': 'Bodija / Ring Road', 'region': 'Oyo State', 'country': 'Nigeria', 'ip': '197.210.120.78'},
        {'city': 'Independence Layout', 'region': 'Enugu State', 'country': 'Nigeria', 'ip': '102.88.94.33'},
    ]

    devices = [
        {'device': 'Desktop', 'os': 'Windows 11', 'browser': 'Google Chrome'},
        {'device': 'Mobile', 'os': 'iOS', 'browser': 'Apple Safari'},
        {'device': 'Mobile', 'os': 'Android', 'browser': 'Google Chrome'},
        {'device': 'Desktop', 'os': 'macOS', 'browser': 'Apple Safari'},
        {'device': 'Desktop', 'os': 'Windows', 'browser': 'Microsoft Edge'},
    ]

    routes = [
        '/api/pros/search',
        '/api/categories',
        '/api/pricing/estimate',
        '/api/jobs/mine',
        '/api/jobs',
        '/pros/1',
        '/pros/2',
        '/pro/onboarding',
        '/'
    ]

    now = utcnow()
    logs_created = 0

    # 1. Seed past 48 hours visits (total ~140 visits)
    for i in range(140):
        # spread over last 48 hours
        minutes_ago = random.randint(1, 48 * 60)
        log_time = now - timedelta(minutes=minutes_ago)
        reg = random.choice(regions)
        dev = random.choice(devices)
        route = random.choice(routes)
        status_code = 200 if random.random() > 0.03 else (404 if random.random() > 0.5 else 422)
        latency = round(random.uniform(4.5, 24.8), 2)

        # random user assignment
        user = None
        user_id = None
        roll = random.random()
        if roll < 0.40 and client_users:
            user = random.choice(client_users)
            user_id = user.id
        elif roll < 0.70 and pro_users:
            user = random.choice(pro_users)
            user_id = user.id

        log = VisitorLog(
            ip_address=reg['ip'],
            user_id=user_id,
            session_id=f"session_{reg['ip']}_{user_id or 'anon'}",
            path=route,
            method='GET' if random.random() > 0.2 else 'POST',
            status_code=status_code,
            response_time_ms=latency,
            user_agent=f"Mozilla/5.0 ({dev['os']}) AppleWebKit/537.36 ({dev['browser']})",
            device=dev['device'],
            browser=dev['browser'],
            os=dev['os'],
            city=reg['city'],
            region=reg['region'],
            country=reg['country'],
            created_at=log_time
        )
        db.add(log)
        logs_created += 1

    db.commit()
    print(f"Successfully seeded {logs_created} historical visitor & telemetry logs!")

    # 2. Seed active live sessions right now into memory
    for reg, dev, user in [
        (regions[0], devices[0], pro_users[0] if pro_users else None),
        (regions[1], devices[1], client_users[0] if client_users else None),
        (regions[3], devices[2], None), # Guest from Abuja
        (regions[5], devices[3], None), # Guest from Port Harcourt
    ]:
        telemetry_service.record_request(
            db=db,
            ip_address=reg['ip'],
            path=random.choice(routes),
            method='GET',
            status_code=200,
            response_time_ms=round(random.uniform(5.1, 14.2), 2),
            user_agent=f"Mozilla/5.0 ({dev['os']}) {dev['browser']}",
            user=user
        )

    db.close()
    print("Live active user sessions initialized into telemetry service.")

if __name__ == '__main__':
    seed_sample_traffic()
