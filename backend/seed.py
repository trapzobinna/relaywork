import os
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, ProProfile, SkillCategory, Job, JobPhoto, Message, Payment, Review, AdminAction, UserRole, VerificationStatus, JobStatus, PaymentStatus
from app.core.security import get_password_hash
from app.core.config import settings

def seed():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # 1. Seed Skill Categories
    categories_data = [
        {'name': 'Electrician', 'slug': 'electrician', 'icon': 'Zap', 'description': 'Wiring, fault fixing, socket repair, generator installations & inverters'},
        {'name': 'Plumber', 'slug': 'plumber', 'icon': 'Wrench', 'description': 'Pipe repairs, leak fixing, bathroom fittings, water pumps & drainage'},
        {'name': 'Carpenter & Woodwork', 'slug': 'carpenter', 'icon': 'Hammer', 'description': 'Furniture making, door repairs, kitchen cabinets & roofing timber'},
        {'name': 'AC Repair & HVAC', 'slug': 'ac-repair', 'icon': 'Wind', 'description': 'Air conditioner servicing, gas refilling, installation & cooling maintenance'},
        {'name': 'Painter & Decorator', 'slug': 'painter', 'icon': 'Paintbrush', 'description': 'Interior & exterior painting, screeding, wallpaper & wall styling'},
        {'name': 'Appliance Repair', 'slug': 'appliance-repair', 'icon': 'Tv', 'description': 'Washing machines, microwave, refrigerators, blenders & ovens'},
        {'name': 'Welder & Fabricator', 'slug': 'welder', 'icon': 'Flame', 'description': 'Iron gates, burglar proofs, metal railings, security cages'},
        {'name': 'Mason & Bricklayer', 'slug': 'mason', 'icon': 'Layers', 'description': 'Tiling, plastering, interlocking stones, compound paving & masonry'}
    ]

    for cat in categories_data:
        existing = db.query(SkillCategory).filter(SkillCategory.slug == cat['slug']).first()
        if not existing:
            db.add(SkillCategory(**cat))
    db.commit()
    print('Skill categories seeded.')

    # 2. Seed Demo Client (No hardcoded admin!)
    demo_client = db.query(User).filter(User.email == 'client@relaywork.local').first()
    if not demo_client:
        demo_client = User(
            email='client@relaywork.local',
            password_hash=get_password_hash('ClientPass123!'),
            full_name='Chidi Okafor (Demo Client)',
            phone='+2348012345678',
            role=UserRole.CLIENT,
            is_active=True,
            is_verified=True
        )
        db.add(demo_client)
        db.commit()
        db.refresh(demo_client)
        print('Demo client created: client@relaywork.local / ClientPass123!')

    # 3. Seed Demo Verified Pro 1 (Electrician in Lagos, Victoria Island / Lekki coordinates: 6.4281, 3.4219)
    elec_cat = db.query(SkillCategory).filter(SkillCategory.slug == 'electrician').first()
    demo_pro = db.query(User).filter(User.email == 'pro.tunde@relaywork.local').first()
    if not demo_pro and elec_cat:
        demo_pro = User(
            email='pro.tunde@relaywork.local',
            password_hash=get_password_hash('ProPass123!'),
            full_name='Tunde Bakare (Certified Electrician)',
            phone='+2348098765432',
            role=UserRole.PRO,
            is_active=True,
            is_verified=True
        )
        db.add(demo_pro)
        db.commit()
        db.refresh(demo_pro)

        pro_profile = ProProfile(
            user_id=demo_pro.id,
            skill_category_id=elec_cat.id,
            bio='Master Electrician with 8+ years experience in domestic & commercial electrical installations, inverter setups, and troubleshooting.',
            service_radius_km=30.0,
            latitude=6.4281,
            longitude=3.4219,
            address_text='Victoria Island, Lagos',
            verification_status=VerificationStatus.APPROVED,
            bank_name='Access Bank',
            bank_code='044',
            account_number='0123456789',
            account_name='Tunde Bakare',
            paystack_subaccount_code='SUB_mock_tunde_elec',
            avg_rating=4.9,
            total_reviews=14,
            total_jobs_completed=18
        )
        db.add(pro_profile)
        db.commit()
        print('Demo pro created: pro.tunde@relaywork.local / ProPass123!')

    # 4. Seed Demo Verified Pro 2 (Plumber in Ikeja coordinates: 6.5957, 3.3421)
    plumb_cat = db.query(SkillCategory).filter(SkillCategory.slug == 'plumber').first()
    demo_pro2 = db.query(User).filter(User.email == 'pro.emeka@relaywork.local').first()
    if not demo_pro2 and plumb_cat:
        demo_pro2 = User(
            email='pro.emeka@relaywork.local',
            password_hash=get_password_hash('ProPass123!'),
            full_name='Emeka Nnamdi (Pro Plumber)',
            phone='+2348033334455',
            role=UserRole.PRO,
            is_active=True,
            is_verified=True
        )
        db.add(demo_pro2)
        db.commit()
        db.refresh(demo_pro2)

        pro_profile2 = ProProfile(
            user_id=demo_pro2.id,
            skill_category_id=plumb_cat.id,
            bio='Expert plumbing contractor specializing in pressurized piping, modern bathroom sanitary fixtures, and emergency burst pipes.',
            service_radius_km=25.0,
            latitude=6.5957,
            longitude=3.3421,
            address_text='Ikeja, Lagos',
            verification_status=VerificationStatus.APPROVED,
            bank_name='GTBank',
            bank_code='058',
            account_number='0987654321',
            account_name='Emeka Nnamdi',
            paystack_subaccount_code='SUB_mock_emeka_plumb',
            avg_rating=4.8,
            total_reviews=9,
            total_jobs_completed=12
        )
        db.add(pro_profile2)
        db.commit()
        print('Demo pro 2 created: pro.emeka@relaywork.local / ProPass123!')

    # 5. Seed Pending Pro 3 (For Admin verification demo)
    ac_cat = db.query(SkillCategory).filter(SkillCategory.slug == 'ac-repair').first()
    pending_pro = db.query(User).filter(User.email == 'pro.musa@relaywork.local').first()
    if not pending_pro and ac_cat:
        pending_pro = User(
            email='pro.musa@relaywork.local',
            password_hash=get_password_hash('ProPass123!'),
            full_name='Musa Bello (AC Technician)',
            phone='+2348077778899',
            role=UserRole.PRO,
            is_active=True,
            is_verified=False
        )
        db.add(pending_pro)
        db.commit()
        db.refresh(pending_pro)

        pro_profile3 = ProProfile(
            user_id=pending_pro.id,
            skill_category_id=ac_cat.id,
            bio='HVAC specialist with 4 years trade apprenticeship. Expert in split unit gas charging and duct maintenance.',
            service_radius_km=20.0,
            latitude=6.5244,
            longitude=3.3792,
            address_text='Surulere, Lagos',
            verification_status=VerificationStatus.PENDING,
            bank_name='Zenith Bank',
            bank_code='057',
            account_number='0246813579',
            account_name='Musa Bello',
            avg_rating=0.0,
            total_reviews=0,
            total_jobs_completed=0
        )
        db.add(pro_profile3)
        db.commit()
        print('Pending pro created for admin review demo: pro.musa@relaywork.local / ProPass123!')

    print('Database seed complete!')
    print('NOTE: Admin is created via the secure bootstrap endpoint using ADMIN_BOOTSTRAP_TOKEN in .env')

if __name__ == '__main__':
    seed()
