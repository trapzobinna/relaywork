from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_current_user, require_client, require_pro
from app.models import User, ProProfile, Job, JobStatus, SkillCategory, UserRole, VerificationStatus, JobLocationPing
from app.schemas import JobCreate, JobOut, JobPhotoOut, LocationUpdatePayload, JobLocationPingOut
from app.services.geolocation import haversine_distance
from app.services.chat_manager import manager

router = APIRouter(prefix='/api/jobs', tags=['Jobs'])

def utcnow():
    return datetime.now(timezone.utc)

def format_job_out(job: Job) -> JobOut:
    latest_ping = job.location_pings[0] if job.location_pings else None
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
        is_en_route=job.is_en_route,
        has_arrived=job.has_arrived,
        pro_current_lat=latest_ping.latitude if latest_ping else None,
        pro_current_lng=latest_ping.longitude if latest_ping else None,
        last_location_updated_at=job.last_location_updated_at,
        created_at=job.created_at,
        accepted_at=job.accepted_at,
        completed_at=job.completed_at,
        paid_at=job.paid_at,
        photos=[JobPhotoOut(id=p.id, file_path=p.file_path, uploaded_at=p.uploaded_at) for p in job.photos]
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
    if assigned_pro_id:
        # Check if assigned_pro_id is a ProProfile ID rather than User ID
        profile = db.query(ProProfile).filter(ProProfile.id == assigned_pro_id).first()
        if profile:
            assigned_pro_id = profile.user_id
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
                # Rank by proximity to client location
                scored_pros = []
                for p in pros_query:
                    if p.latitude is not None and p.longitude is not None:
                        dist = haversine_distance(data.latitude, data.longitude, p.latitude, p.longitude)
                        scored_pros.append((dist, p.user_id))
                    else:
                        scored_pros.append((9999.0, p.user_id))
                scored_pros.sort(key=lambda x: x[0])
                assigned_pro_id = scored_pros[0][1]
            else:
                assigned_pro_id = pros_query[0].user_id


    job = Job(
        client_id=current_user.id,
        pro_id=assigned_pro_id,
        skill_category_id=data.skill_category_id,
        title=data.title,
        description=data.description,
        budget_amount=data.budget_amount,
        latitude=data.latitude,
        longitude=data.longitude,
        location_address=data.location_address,
        status=JobStatus.REQUESTED
    )
    db.add(job)
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

    job.status = JobStatus.ACCEPTED
    job.accepted_at = utcnow()
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

    job.status = JobStatus.DECLINED
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

    job.status = JobStatus.IN_PROGRESS
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

    job.status = JobStatus.COMPLETED
    job.completed_at = utcnow()
    job.is_en_route = False
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

    if job.status not in [JobStatus.ACCEPTED, JobStatus.IN_PROGRESS]:
        raise HTTPException(status_code=400, detail='Job must be accepted before going en route')

    job.is_en_route = True
    job.last_location_updated_at = utcnow()
    db.commit()
    db.refresh(job)

    # Broadcast EN_ROUTE event over WebSocket
    await manager.broadcast_to_job(job.id, {
        'type': 'EN_ROUTE',
        'job_id': job.id,
        'message': f"{current_user.full_name} is now on their way!"
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

    # 1. Strict Ownership check: ONLY the assigned Pro may post GPS coordinates
    if job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail='Only the assigned Pro can update location for this job')

    # 2. Stop broadcasting once job is completed/cancelled (no-op return 200)
    if job.status not in [JobStatus.ACCEPTED, JobStatus.IN_PROGRESS]:
        return {'status': 'ignored', 'reason': 'Job is no longer active'}

    now = datetime.now(timezone.utc)

    # 3. Server-side throttle: reject/ignore updates less than 5 seconds apart
    if job.last_location_updated_at:
        last_updated = job.last_location_updated_at
        if last_updated.tzinfo is None:
            last_updated = last_updated.replace(tzinfo=timezone.utc)
        diff_seconds = (now - last_updated).total_seconds()
        if diff_seconds < 4.9:
            return {'status': 'throttled', 'wait_seconds': round(5 - diff_seconds, 2)}

    # Record location ping history
    ping = JobLocationPing(
        job_id=job.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        recorded_at=now
    )
    db.add(ping)
    job.last_location_updated_at = now
    job.is_en_route = True

    # Compute straight-line distance (Haversine) and estimated travel time
    distance_meters = 0.0
    eta_minutes = 0
    if job.latitude is not None and job.longitude is not None:
        distance_km = haversine_distance(payload.latitude, payload.longitude, job.latitude, job.longitude)
        distance_meters = round(distance_km * 1000.0, 1)
        # Assumed average urban city speed: 25 km/h -> (distance_km / 25) * 60
        eta_minutes = max(1, int(round((distance_km / 25.0) * 60)))

    # Broadcast real-time LOCATION_UPDATE to client & pro over WebSocket
    await manager.broadcast_to_job(job.id, {
        'type': 'LOCATION_UPDATE',
        'job_id': job.id,
        'latitude': payload.latitude,
        'longitude': payload.longitude,
        'distance_meters': distance_meters,
        'eta_minutes': eta_minutes,
        'timestamp': now.isoformat()
    })

    # Check 500m threshold: trigger PRO_ARRIVED live alert once
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

