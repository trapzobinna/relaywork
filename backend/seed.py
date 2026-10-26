import os
import json
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import (
    User, ProProfile, SkillCategory, Job, JobPhoto, Message, Payment, Review,
    AdminAction, UserRole, VerificationStatus, JobStatus, PaymentStatus,
    PricingConfig, CatalogItem, LedgerAccount, LedgerAccountKind
)
from app.core.security import get_password_hash
from app.core.config import settings
from app.services.pricing import DEFAULT_PRICING_CONFIG

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

    # 2. Seed PricingConfig v1.0 per PDF Specification
    existing_config = db.query(PricingConfig).filter(PricingConfig.version == 'v1.0').first()
    if not existing_config:
        cfg = PricingConfig(
            version='v1.0',
            params=json.dumps(DEFAULT_PRICING_CONFIG)
        )
        db.add(cfg)
        db.commit()
        print('PricingConfig v1.0 seeded.')
    else:
        existing_config.params = json.dumps(DEFAULT_PRICING_CONFIG)
        db.commit()
        print('PricingConfig v1.0 updated with 7.5% platform commission.')

    # 3. Seed Catalog Items (Quick-Fix Standard Rate Card)
    cats = {c.slug: c for c in db.query(SkillCategory).all()}

    catalog_data = [
        # Electrician
        {'slug': 'electrician', 'name': 'Socket / Switch Replacement', 'labor_kobo': 800000, 'parts_allowance_kobo': 250000, 'included_parts': '1x Standard 13A double socket'},
        {'slug': 'electrician', 'name': 'Light Fixture / Chandelier Install', 'labor_kobo': 750000, 'parts_allowance_kobo': 0, 'included_parts': 'Mounting anchors & insulation tape'},
        {'slug': 'electrician', 'name': 'Distribution Board Breaker Swap', 'labor_kobo': 1200000, 'parts_allowance_kobo': 500000, 'included_parts': 'Single pole 32A/63A miniature circuit breaker'},
        {'slug': 'electrician', 'name': 'Generator Changeover Switch Installation', 'labor_kobo': 1500000, 'parts_allowance_kobo': 0, 'included_parts': 'Cabling clips and lugs'},
        # Plumber
        {'slug': 'plumber', 'name': 'Tap / Angle Valve Replacement', 'labor_kobo': 700000, 'parts_allowance_kobo': 350000, 'included_parts': '1x Heavy duty brass angle valve & thread seal tape'},
        {'slug': 'plumber', 'name': 'Sink Drain Trap Unclog & Clean', 'labor_kobo': 900000, 'parts_allowance_kobo': 0, 'included_parts': 'Chemical drain cleaner & new rubber gasket'},
        {'slug': 'plumber', 'name': 'Toilet Cistern Flush Valve Rebuild', 'labor_kobo': 1000000, 'parts_allowance_kobo': 600000, 'included_parts': 'Universal dual-flush cistern mechanism'},
        {'slug': 'plumber', 'name': 'Surface Water Pump Pressure Connection', 'labor_kobo': 1400000, 'parts_allowance_kobo': 0, 'included_parts': 'PPR pipe couplings and union'},
        # AC Repair
        {'slug': 'ac-repair', 'name': 'Split AC Standard Servicing & Filter Wash', 'labor_kobo': 1000000, 'parts_allowance_kobo': 0, 'included_parts': 'Anti-bacterial coil wash & blower cleaning'},
        {'slug': 'ac-repair', 'name': 'Refrigerant Gas Top-up (R22 / R410)', 'labor_kobo': 1800000, 'parts_allowance_kobo': 800000, 'included_parts': 'Up to 1.5kg approved refrigerant charge'},
        {'slug': 'ac-repair', 'name': 'AC Compressor Capacitor Replacement', 'labor_kobo': 850000, 'parts_allowance_kobo': 450000, 'included_parts': 'Dual run capacitor (45+5 uF)'},
        # Carpenter
        {'slug': 'carpenter', 'name': 'Door Mortise Lock & Handle Replacement', 'labor_kobo': 800000, 'parts_allowance_kobo': 700000, 'included_parts': 'Standard 3-lever mortise lockset with keys'},
        {'slug': 'carpenter', 'name': 'Kitchen Cabinet Hinges Re-alignment (up to 4)', 'labor_kobo': 700000, 'parts_allowance_kobo': 300000, 'included_parts': 'Hydraulic soft-close hinges'},
        {'slug': 'carpenter', 'name': 'Wooden Bed Frame Reinforcement', 'labor_kobo': 1200000, 'parts_allowance_kobo': 400000, 'included_parts': 'Hardwood support beams and brackets'},
        # Painter
        {'slug': 'painter', 'name': 'Single Room Refresh Coat (Labor)', 'labor_kobo': 2000000, 'parts_allowance_kobo': 0, 'included_parts': 'Masking tape and drop sheet protection'},
        # Mason
        {'slug': 'mason', 'name': 'Floor Tile Patch & Re-grouting (up to 5 tiles)', 'labor_kobo': 1200000, 'parts_allowance_kobo': 400000, 'included_parts': 'Tile adhesive & white cement grout'},
    ]

    for item in catalog_data:
        cat = cats.get(item['slug'])
        if cat:
            existing_item = db.query(CatalogItem).filter(
                CatalogItem.skill_category_id == cat.id,
                CatalogItem.name == item['name']
            ).first()
            if not existing_item:
                c = CatalogItem(
                    skill_category_id=cat.id,
                    trade=cat.slug,
                    name=item['name'],
                    labor_kobo=item['labor_kobo'],
                    parts_allowance_kobo=item['parts_allowance_kobo'],
                    included_parts=item['included_parts']
                )
                db.add(c)
    db.commit()
    print('Catalog rate card items seeded.')

    # 4. Seed System Ledger Accounts
    system_accounts = [
        (LedgerAccountKind.GATEWAY_CLEARING, 'system', None),
        (LedgerAccountKind.PLATFORM_REVENUE, 'system', None),
        (LedgerAccountKind.GATEWAY_FEE_EXPENSE, 'system', None),
    ]
    for kind, owner_type, owner_id in system_accounts:
        acc = db.query(LedgerAccount).filter(
            LedgerAccount.kind == kind,
            LedgerAccount.owner_type == owner_type
        ).first()
        if not acc:
            db.add(LedgerAccount(kind=kind, owner_type=owner_type, owner_id=owner_id))
    db.commit()
    print('System ledger accounts seeded.')

    # 5. Seed Demo Client
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

    # 6. Seed Demo Verified Pro 1 (Electrician in Lagos, Victoria Island / Lekki coordinates: 6.4281, 3.4219)
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

    # 7. Seed Demo Verified Pro 2 (Plumber in Ikeja coordinates: 6.5957, 3.3421)
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

    # 8. Seed Pending Pro 3 (For Admin verification demo)
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
