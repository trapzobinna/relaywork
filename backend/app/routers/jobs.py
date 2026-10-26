import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_current_user, require_client, require_pro
from app.models import (
    User, ProProfile, Job, JobStatus, SkillCategory, UserRole,
    VerificationStatus, JobLocationPing, JobEvent, CatalogItem, Quote
)
from app.schemas import (
    JobCreate, JobOut, JobPhotoOut, LocationUpdatePayload, JobLocationPingOut
)
from app.services.geolocation import haversine_distance
from app.services.chat_manager import manager
from app.services.pricing import calculate_call_out_fee, get_active_pricing_config
from app.services import ledger

router = APIRouter(prefix='/api/jobs', tags=['Jobs'])

def utcnow():
    return datetime.now(timezone.utc)

def format_job_out(job: Job) -> JobOut:
    latest_ping = job.location_pings[0] if job.location_pings else None
    has_quote = len(job.quotes) > 0 if getattr(job, 'quotes', None) else False
    call_out_kobo = job.call_out_kobo or 600000

    return JobOut(
        id=job.id,
        client_id=job.client_id,
        client_name=job.client.full_name if job.client else 'Unknown',
        pro_id=job.pro_id,
        pro_name=job.pro.full_name if job.pro else None,
        skill_category_id=job.skill_category_id,
        skill_category_name=job.skill_category.name if job.skill_category else 'Unknown',
        title=job.title,
        description=job.description,
        budget_amount=job.budget_amount,
        latitude=job.latitude,
        longitude=job.longitude,
        location_address=job.location_address,
        status=job.status,
        job_type=job.job_type or 'quoted',
        call_out_kobo=call_out_kobo,
        call_out_naira=call_out_kobo / 100.0,
        surge_multiplier=job.surge_multiplier or 1.0,
        surge_reason=job.surge_reason,
        diagnosis_notes=job.diagnosis_notes,
        is_en_route=job.is_en_route,
        has_arrived=job.has_arrived,
        pro_current_lat=latest_ping.latitude if latest_ping else None,
        pro_current_lng=latest_ping.longitude if latest_ping else None,
        last_location_updated_at=job.last_location_updated_at,
        created_at=job.created_at,
        accepted_at=job.accepted_at,
        completed_at=job.completed_at,
        paid_at=job.paid_at,
        photos=[JobPhotoOut(id=p.id, file_path=p.file_path, uploaded_at=p.uploaded_at) for p in job.photos],
        has_quote=has_quote
    )

@router.post('', response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    data: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [UserRole.CLIENT, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail='Only clients can create job booking requests')

    cat = db.query(SkillCategory).filter(SkillCategory.id == data.skill_category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail='Invalid skill category')

    assigned_pro_id = data.pro_id
    pro_profile_obj = None

    if assigned_pro_id:
        pro_profile_obj = db.query(ProProfile).filter(
            (ProProfile.id == assigned_pro_id) | (ProProfile.user_id == assigned_pro_id)
        ).first()
        if pro_profile_obj:
            assigned_pro_id = pro_profile_obj.user_id
        else:
            pro_user = db.query(User).filter(User.id == assigned_pro_id, User.role == UserRole.PRO).first()
            if pro_user:
                assigned_pro_id = pro_user.id

    # If no specific pro assigned, auto-pair with the closest verified available pro (Uber-style)
    if not assigned_pro_id:
        pros_query = db.query(ProProfile).join(User).filter(
            User.is_active == True,
            ProProfile.verification_status == VerificationStatus.APPROVED,
            ProProfile.skill_category_id == data.skill_category_id
        ).all()

        if pros_query:
            if data.latitude is not None and data.longitude is not None:
                scored_pros = []
                for p in pros_query:
                    if p.latitude is not None and p.longitude is not None:
                        dist = haversine_distance(data.latitude, data.longitude, p.latitude, p.longitude)
                        scored_pros.append((dist, p))
                    else:
                        scored_pros.append((9999.0, p))
                scored_pros.sort(key=lambda x: x[0])
                pro_profile_obj = scored_pros[0][1]
                assigned_pro_id = pro_profile_obj.user_id
            else:
                pro_profile_obj = pros_query[0]
                assigned_pro_id = pros_query[0].user_id

    # Check for Catalog Item (Quick Fix Rate Card)
    budget = data.budget_amount
    job_type = data.job_type or 'quoted'
    if data.catalog_item_id:
        catalog_item = db.query(CatalogItem).filter(CatalogItem.id == data.catalog_item_id).first()
        if catalog_item:
            budget = (catalog_item.labor_kobo + catalog_item.parts_allowance_kobo) / 100.0
            job_type = 'quick_fix'

    # Calculate dynamic call-out fee per Section 3 of specification
    config = get_active_pricing_config(db)
    client_lat = data.latitude or 6.5244
    client_lng = data.longitude or 3.3792
    pro_lat = pro_profile_obj.latitude if pro_profile_obj and pro_profile_obj.latitude else 6.5957
    pro_lng = pro_profile_obj.longitude if pro_profile_obj and pro_profile_obj.longitude else 3.3421

    calc = calculate_call_out_fee(
        client_lat=client_lat,
        client_lng=client_lng,
        pro_lat=pro_lat,
        pro_lng=pro_lng,
        is_emergency=data.is_emergency,
        config=config
    )

    job = Job(
        client_id=current_user.id,
        pro_id=assigned_pro_id,
        skill_category_id=data.skill_category_id,
        title=data.title,
        description=data.description,
        budget_amount=budget,
        latitude=data.latitude,
        longitude=data.longitude,
        location_address=data.location_address,
        status=JobStatus.REQUESTED,
        job_type=job_type,
        call_out_kobo=calc['call_out_kobo'],
        surge_multiplier=calc['surge_multiplier'],
        surge_reason=calc['surge_reason'],
        pricing_config_version=calc['pricing_version']
    )
    db.add(job)
    db.flush()

    # Record JobEvent
    db.add(JobEvent(
        job_id=job.id,
        from_status='none',
        to_status=JobStatus.REQUESTED.value,
        actor_type='client',
        actor_id=current_user.id,
        reason_code='JOB_CREATED'
    ))

    # Record initial call-out funding in double-entry ledger
    ledger.fund_call_out(db=db, job_id=job.id, amount_kobo=job.call_out_kobo)

    db.commit()
    db.refresh(job)
    return format_job_out(job)

@router.get('/mine', response_model=List[JobOut])
def get_my_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.CLIENT:
        jobs = db.query(Job).filter(Job.client_id == current_user.id).order_by(Job.created_at.desc()).all()
    elif current_user.role == UserRole.PRO:
        jobs = db.query(Job).filter(Job.pro_id == current_user.id).order_by(Job.created_at.desc()).all()
    elif current_user.role == UserRole.ADMIN:
        jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    else:
        jobs = []
    return [format_job_out(j) for j in jobs]

@router.get('/{id}', response_model=JobOut)
def get_job_by_id(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    if current_user.role != UserRole.ADMIN and job.client_id != current_user.id and job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail='You do not have permission to access this job')

    return format_job_out(job)

@router.post('/{id}/accept', response_model=JobOut)
def accept_job(
    id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    if job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail='This job request was not assigned to you')

    from_status = job.status.value if hasattr(job.status, 'value') else str(job.status)
    job.status = JobStatus.ACCEPTED
    job.accepted_at = utcnow()

    db.add(JobEvent(
        job_id=job.id,
        from_status=from_status,
        to_status=JobStatus.ACCEPTED.value,
        actor_type='pro',
        actor_id=current_user.id,
        reason_code='PRO_ACCEPTED'
    ))

    db.commit()
    db.refresh(job)
    return format_job_out(job)

@router.post('/{id}/decline', response_model=JobOut)
def decline_job(
    id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    if job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail='This job request was not assigned to you')

    from_status = job.status.value if hasattr(job.status, 'value') else str(job.status)
    job.status = JobStatus.DECLINED

    db.add(JobEvent(
        job_id=job.id,
        from_status=from_status,
        to_status=JobStatus.DECLINED.value,
        actor_type='pro',
        actor_id=current_user.id,
        reason_code='PRO_DECLINED'
    ))

    # Refund call-out fee in double-entry ledger if pro declines
    ledger.refund_escrow(db=db, job_id=job.id, amount_kobo=job.call_out_kobo)

    db.commit()
    db.refresh(job)
    return format_job_out(job)

@router.post('/{id}/start', response_model=JobOut)
def start_job(
    id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    if job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail='Only the assigned Pro can mark the job as started')

    from_status = job.status.value if hasattr(job.status, 'value') else str(job.status)
    job.status = JobStatus.IN_PROGRESS
    db.add(JobEvent(
        job_id=job.id,
        from_status=from_status,
        to_status=JobStatus.IN_PROGRESS.value,
        actor_type='pro',
        actor_id=current_user.id,
        reason_code='PRO_STARTED_WORK'
    ))

    db.commit()
    db.refresh(job)
    return format_job_out(job)

@router.post('/{id}/complete', response_model=JobOut)
def complete_job(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    if current_user.id != job.client_id and current_user.id != job.pro_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail='Unauthorized to complete this job')

    from_status = job.status.value if hasattr(job.status, 'value') else str(job.status)
    job.status = JobStatus.COMPLETED
    job.completed_at = utcnow()
    job.is_en_route = False

    db.add(JobEvent(
        job_id=job.id,
        from_status=from_status,
        to_status=JobStatus.COMPLETED.value,
        actor_type='pro' if current_user.id == job.pro_id else 'client',
        actor_id=current_user.id,
        reason_code='JOB_COMPLETED'
    ))

    db.commit()
    db.refresh(job)
    return format_job_out(job)

@router.post('/{id}/en-route', response_model=JobOut)
async def set_pro_en_route(
    id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    if job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail='Only the assigned Pro can set en route status')

    from_status = job.status.value if hasattr(job.status, 'value') else str(job.status)
    job.is_en_route = True
    job.status = JobStatus.EN_ROUTE
    job.last_location_updated_at = utcnow()

    db.add(JobEvent(
        job_id=job.id,
        from_status=from_status,
        to_status=JobStatus.EN_ROUTE.value,
        actor_type='pro',
        actor_id=current_user.id,
        reason_code='PRO_DISPATCHED_EN_ROUTE'
    ))

    db.commit()
    db.refresh(job)

    # Broadcast EN_ROUTE event over WebSocket
    await manager.broadcast_to_job(job.id, {
        'type': 'EN_ROUTE',
        'job_id': job.id,
        'message': f"{current_user.full_name} is now en route to your location!"
    })

    return format_job_out(job)

@router.post('/{id}/location')
async def update_pro_location(
    id: int,
    payload: LocationUpdatePayload,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    # Strict Ownership check: ONLY assigned Pro
    if job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail='Only the assigned Pro can update location')

    # Stop broadcasting once job is completed/cancelled (no-op return 200)
    if job.status not in [JobStatus.ACCEPTED, JobStatus.IN_PROGRESS, JobStatus.EN_ROUTE, JobStatus.ON_SITE]:
        return {'status': 'ignored', 'reason': 'Job is no longer active'}

    now = datetime.now(timezone.utc)

    # Throttling
    if job.last_location_updated_at:
        last_updated = job.last_location_updated_at
        if last_updated.tzinfo is None:
            last_updated = last_updated.replace(tzinfo=timezone.utc)
        diff_seconds = (now - last_updated).total_seconds()
        if diff_seconds < 4.9:
            return {'status': 'throttled', 'wait_seconds': round(5 - diff_seconds, 2)}

    ping = JobLocationPing(
        job_id=job.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        recorded_at=now
    )
    db.add(ping)
    job.last_location_updated_at = now
    job.is_en_route = True

    distance_meters = 0.0
    eta_minutes = 0
    if job.latitude is not None and job.longitude is not None:
        distance_km = haversine_distance(payload.latitude, payload.longitude, job.latitude, job.longitude)
        distance_meters = round(distance_km * 1000.0, 1)
        eta_minutes = max(1, int(round((distance_km / 25.0) * 60)))

    await manager.broadcast_to_job(job.id, {
        'type': 'LOCATION_UPDATE',
        'job_id': job.id,
        'latitude': payload.latitude,
        'longitude': payload.longitude,
        'distance_meters': distance_meters,
        'eta_minutes': eta_minutes,
        'timestamp': now.isoformat()
    })

    # Within 500m alert
    if distance_meters > 0 and distance_meters < 500 and not job.has_arrived:
        job.has_arrived = True
        await manager.broadcast_to_job(job.id, {
            'type': 'PRO_ARRIVED',
            'job_id': job.id,
            'distance_meters': distance_meters,
            'message': f"{current_user.full_name} is arriving now (within 500m)!"
        })

    db.commit()
    return {
        'status': 'updated',
        'distance_meters': distance_meters,
        'eta_minutes': eta_minutes,
        'has_arrived': job.has_arrived
    }

@router.get('/{id}/pings', response_model=List[JobLocationPingOut])
def get_job_pings(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    if current_user.role != UserRole.ADMIN and job.client_id != current_user.id and job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail='Unauthorized to view tracking pings')

    pings = db.query(JobLocationPing).filter(JobLocationPing.job_id == id).order_by(JobLocationPing.recorded_at.asc()).all()
    return pings
