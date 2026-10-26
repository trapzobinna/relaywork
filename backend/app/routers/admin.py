from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.deps import require_admin, get_current_user
from app.models import (
    User, ProProfile, SkillCategory, Payment, AdminAction,
    UserRole, VerificationStatus, PaymentStatus, Job, JobStatus, VisitorLog
)
from app.schemas import (
    AdminBootstrapRequest, AdminProDecision, ProProfileOut,
    AdminActionOut, UserOut, PaymentOut
)
from app.routers.pros import format_pro_out
from app.services.paystack import PaystackService
from app.services.telemetry import telemetry_service

router = APIRouter(prefix='/api/admin', tags=['Admin'])

@router.post('/bootstrap', response_model=UserOut)
def bootstrap_admin(data: AdminBootstrapRequest, db: Session = Depends(get_db)):
    if not settings.ADMIN_BOOTSTRAP_TOKEN or data.bootstrap_token != settings.ADMIN_BOOTSTRAP_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Invalid bootstrap token')

    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Admin bootstrap already completed. Future admins must be created by an active admin.'
        )

    admin_user = User(
        email=data.email.lower(),
        password_hash=get_password_hash(data.password),
        full_name=data.full_name,
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    log = AdminAction(
        admin_id=admin_user.id,
        action_type='BOOTSTRAP_ADMIN_CREATED',
        target_user_id=admin_user.id,
        notes='Initial root administrator bootstrapped'
    )
    db.add(log)
    db.commit()

    return admin_user

@router.get('/pros/pending', response_model=List[ProProfileOut])
def get_pending_pros(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    pros = db.query(ProProfile).filter(
        ProProfile.verification_status == VerificationStatus.PENDING
    ).all()
    return [format_pro_out(p) for p in pros]

@router.post('/pros/{id}/approve', response_model=ProProfileOut)
async def approve_pro(
    id: int,
    decision: AdminProDecision,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    profile = db.query(ProProfile).filter(ProProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail='Pro profile not found')

    cat_name = profile.skill_category.name if profile.skill_category else 'Pro'
    if profile.bank_code and profile.account_number and not profile.paystack_subaccount_code:
        res = await PaystackService.create_subaccount(
            business_name=f'{profile.user.full_name} ({cat_name})',
            bank_code=profile.bank_code,
            account_number=profile.account_number,
            percentage_charge=settings.PLATFORM_COMMISSION_PERCENT
        )
        if res.get('status') and 'data' in res:
            profile.paystack_subaccount_code = res['data'].get('subaccount_code')

    profile.verification_status = VerificationStatus.APPROVED
    profile.verification_notes = decision.notes
    profile.user.is_verified = True

    log = AdminAction(
        admin_id=current_admin.id,
        action_type='PRO_APPROVED',
        target_user_id=profile.user_id,
        notes=f'Pro approved. Subaccount: {profile.paystack_subaccount_code or "None"}. Notes: {decision.notes or ""}'
    )
    db.add(log)
    db.commit()
    db.refresh(profile)
    return format_pro_out(profile)

@router.post('/pros/{id}/reject', response_model=ProProfileOut)
def reject_pro(
    id: int,
    decision: AdminProDecision,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    profile = db.query(ProProfile).filter(ProProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail='Pro profile not found')

    profile.verification_status = VerificationStatus.REJECTED
    profile.verification_notes = decision.notes
    profile.user.is_verified = False

    log = AdminAction(
        admin_id=current_admin.id,
        action_type='PRO_REJECTED',
        target_user_id=profile.user_id,
        notes=f'Pro rejected. Reason: {decision.notes or "None"}'
    )
    db.add(log)
    db.commit()
    db.refresh(profile)
    return format_pro_out(profile)

@router.get('/users', response_model=List[UserOut])
def list_all_users(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.post('/users/{id}/toggle-status', response_model=UserOut)
def toggle_user_status(
    id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail='Cannot suspend your own admin account')

    user.is_active = not user.is_active
    log = AdminAction(
        admin_id=current_admin.id,
        action_type='USER_STATUS_TOGGLED',
        target_user_id=user.id,
        notes=f'User active status changed to {user.is_active}'
    )
    db.add(log)
    db.commit()
    db.refresh(user)
    return user

@router.post('/users/{id}/promote-admin', response_model=UserOut)
def promote_to_admin(
    id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail='User is already an admin')
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail='You are already an admin')

    previous_role = user.role.value
    user.role = UserRole.ADMIN
    user.is_active = True
    user.is_verified = True

    log = AdminAction(
        admin_id=current_admin.id,
        action_type='USER_PROMOTED_TO_ADMIN',
        target_user_id=user.id,
        notes=f'User promoted from {previous_role} to ADMIN'
    )
    db.add(log)
    db.commit()
    db.refresh(user)
    return user

@router.post('/users/{id}/revoke-admin', response_model=UserOut)
def revoke_admin(
    id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    bootstrap_log = db.query(AdminAction).filter(
        AdminAction.action_type == 'BOOTSTRAP_ADMIN_CREATED'
    ).first()
    if not bootstrap_log or bootstrap_log.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only the original bootstrap admin can revoke admin privileges'
        )

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=400, detail='User is not an admin')
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail='You cannot revoke your own admin privileges')

    user.role = UserRole.CLIENT
    log = AdminAction(
        admin_id=current_admin.id,
        action_type='ADMIN_PRIVILEGES_REVOKED',
        target_user_id=user.id,
        notes='Admin privileges revoked — role changed to CLIENT'
    )
    db.add(log)
    db.commit()
    db.refresh(user)
    return user

@router.get('/transactions', response_model=List[PaymentOut])
def list_transactions(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(Payment).order_by(Payment.created_at.desc()).all()

@router.get('/stats')
def get_admin_stats(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    verified_pros = db.query(ProProfile).filter(ProProfile.verification_status == VerificationStatus.APPROVED).count()
    pending_pros = db.query(ProProfile).filter(ProProfile.verification_status == VerificationStatus.PENDING).count()
    total_jobs = db.query(Job).count()
    completed_jobs = db.query(Job).filter(Job.status == JobStatus.COMPLETED).count()
    total_payments = db.query(Payment).filter(Payment.status == PaymentStatus.PAID).count()

    bootstrap_log = db.query(AdminAction).filter(
        AdminAction.action_type == 'BOOTSTRAP_ADMIN_CREATED'
    ).first()
    bootstrap_admin_id = bootstrap_log.admin_id if bootstrap_log else None

    # Telemetry snapshot for the stats bar
    all_time_visits = db.query(VisitorLog).count()
    db_speed = telemetry_service.test_database_speed(db)
    live_users = telemetry_service.get_live_active_users()

    return {
        'total_users': total_users,
        'verified_pros': verified_pros,
        'pending_pros': pending_pros,
        'total_jobs': total_jobs,
        'completed_jobs': completed_jobs,
        'total_payments': total_payments,
        'commission_percent': settings.PLATFORM_COMMISSION_PERCENT,
        'bootstrap_admin_id': bootstrap_admin_id,
        'all_time_visits': max(all_time_visits, len(live_users)),
        'live_user_count': max(1, len(live_users)),
        'db_speed_ms': db_speed['db_latency_ms'],
        'db_status': db_speed['status']
    }

@router.get('/telemetry/live')
def get_live_telemetry(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Returns real-time intelligence:
    - Live user count and detailed active sessions with IPs and locations
    - All-time website visits & today's visits
    - Real-time database query latency & SQLite storage health
    - Real-time website API response times & RPM
    - Regional classification and user demographic breakdown
    """
    return telemetry_service.get_realtime_metrics(db)

@router.get('/telemetry/logs')
def get_telemetry_logs(
    limit: int = 50,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(VisitorLog).order_by(VisitorLog.created_at.desc()).limit(limit).all()
    return [
        {
            'id': l.id,
            'ip_address': l.ip_address,
            'user_id': l.user_id,
            'user_name': l.user.full_name if l.user else 'Guest Visitor',
            'user_role': l.user.role.value if l.user else 'guest',
            'path': l.path,
            'method': l.method,
            'status_code': l.status_code,
            'response_time_ms': l.response_time_ms,
            'device': l.device,
            'browser': l.browser,
            'os': l.os,
            'city': l.city,
            'region': l.region,
            'country': l.country,
            'created_at': l.created_at.isoformat()
        }
        for l in logs
    ]

@router.get('/jobs')
def list_all_jobs(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from app.routers.jobs import format_job_out
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return [format_job_out(j) for j in jobs]

@router.get('/audit-logs', response_model=List[AdminActionOut])
def list_audit_logs(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    actions = db.query(AdminAction).order_by(AdminAction.created_at.desc()).limit(100).all()
    out = []
    for a in actions:
        out.append(AdminActionOut(
            id=a.id,
            admin_id=a.admin_id,
            admin_name=a.admin.full_name if a.admin else 'System',
            action_type=a.action_type,
            target_user_id=a.target_user_id,
            notes=a.notes,
            created_at=a.created_at
        ))
    return out
