import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.config import settings
from app.core.deps import get_current_user, require_pro, require_admin
from app.models import User, ProProfile, SkillCategory, UserRole, VerificationStatus
from app.schemas import ProProfileCreate, ProProfileUpdate, ProProfileOut
from app.services.geolocation import haversine_distance

router = APIRouter(prefix='/api/pros', tags=['Pros'])

def mask_account(num: Optional[str]) -> Optional[str]:
    if not num or len(num) < 4:
        return None
    return f'•••• {num[-4:]}'

def format_pro_out(profile: ProProfile, distance_km: Optional[float] = None) -> ProProfileOut:
    return ProProfileOut(
        id=profile.id,
        user_id=profile.user.id,
        user_name=profile.user.full_name,
        user_email=profile.user.email,
        user_phone=profile.user.phone,
        skill_category_id=profile.skill_category_id,
        skill_category_name=profile.skill_category.name if profile.skill_category else '',
        bio=profile.bio,
        service_radius_km=profile.service_radius_km,
        latitude=profile.latitude,
        longitude=profile.longitude,
        address_text=profile.address_text,
        verification_status=profile.verification_status,
        verification_notes=profile.verification_notes,
        has_id_document=bool(profile.id_document_path),
        has_cert_document=bool(profile.certification_document_path),
        masked_account_number=mask_account(profile.account_number),
        bank_name=profile.bank_name,
        avg_rating=profile.avg_rating,
        total_reviews=profile.total_reviews,
        total_jobs_completed=profile.total_jobs_completed,
        distance_km=distance_km,
        created_at=profile.created_at
    )

@router.get('/search', response_model=List[ProProfileOut])
def search_pros(
    category_id: Optional[int] = None,
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    lng: Optional[float] = Query(None, ge=-180.0, le=180.0),
    radius_km: Optional[float] = Query(50.0, ge=1.0, le=500.0),
    sort: Optional[str] = 'distance',
    db: Session = Depends(get_db)
):
    query = db.query(ProProfile).join(User).filter(
        User.is_active == True,
        ProProfile.verification_status == VerificationStatus.APPROVED
    )

    if category_id:
        query = query.filter(ProProfile.skill_category_id == category_id)

    pros = query.all()
    results = []

    for p in pros:
        dist = None
        if lat is not None and lng is not None and p.latitude is not None and p.longitude is not None:
            dist = haversine_distance(lat, lng, p.latitude, p.longitude)
            # Must be within both search radius and the pro's own service radius
            if dist > radius_km or dist > p.service_radius_km:
                continue
        
        results.append(format_pro_out(p, dist))

    if sort == 'rating':
        results.sort(key=lambda x: (x.avg_rating, x.total_jobs_completed), reverse=True)
    elif lat is not None and lng is not None:
        results.sort(key=lambda x: (x.distance_km is None, x.distance_km, -x.avg_rating))
    else:
        results.sort(key=lambda x: (-x.avg_rating, -x.total_jobs_completed))

    return results

@router.get('/me', response_model=ProProfileOut)
def get_my_pro_profile(
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    profile = db.query(ProProfile).filter(ProProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail='Pro profile not created yet')
    return format_pro_out(profile)

@router.get('/{id}', response_model=ProProfileOut)
def get_pro_by_id(id: int, db: Session = Depends(get_db)):
    profile = db.query(ProProfile).filter(ProProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail='Pro profile not found')
    return format_pro_out(profile)

@router.post('/profile', response_model=ProProfileOut)
def create_or_update_profile(
    data: ProProfileCreate,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    cat = db.query(SkillCategory).filter(SkillCategory.id == data.skill_category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail='Invalid skill category')

    profile = db.query(ProProfile).filter(ProProfile.user_id == current_user.id).first()
    if not profile:
        profile = ProProfile(
            user_id=current_user.id,
            skill_category_id=data.skill_category_id,
            bio=data.bio,
            service_radius_km=data.service_radius_km,
            latitude=data.latitude,
            longitude=data.longitude,
            address_text=data.address_text,
            bank_name=data.bank_name,
            bank_code=data.bank_code,
            account_number=data.account_number,
            account_name=data.account_name,
            verification_status=VerificationStatus.PENDING
        )
        db.add(profile)
    else:
        profile.skill_category_id = data.skill_category_id
        profile.bio = data.bio
        profile.service_radius_km = data.service_radius_km
        profile.latitude = data.latitude
        profile.longitude = data.longitude
        profile.address_text = data.address_text
        if data.bank_name: profile.bank_name = data.bank_name
        if data.bank_code: profile.bank_code = data.bank_code
        if data.account_number: profile.account_number = data.account_number
        if data.account_name: profile.account_name = data.account_name

    db.commit()
    db.refresh(profile)
    return format_pro_out(profile)

@router.post('/documents')
async def upload_documents(
    id_document: Optional[UploadFile] = File(None),
    cert_document: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    profile = db.query(ProProfile).filter(ProProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail='Please complete profile details first before uploading documents')

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    max_size = 5 * 1024 * 1024  # 5MB

    if id_document:
        if id_document.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail='ID document must be a JPEG, PNG, or PDF file')
        content = await id_document.read()
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail='ID document exceeds 5MB size limit')
        
        ext = os.path.splitext(id_document.filename)[1] or '.jpg'
        saved_name = f'id_doc_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}'
        target_path = os.path.join(settings.UPLOAD_DIR, saved_name)
        with open(target_path, 'wb') as f:
            f.write(content)
        profile.id_document_path = saved_name

    if cert_document:
        if cert_document.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail='Trade certificate must be a JPEG, PNG, or PDF file')
        content = await cert_document.read()
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail='Trade certificate exceeds 5MB size limit')
        
        ext = os.path.splitext(cert_document.filename)[1] or '.jpg'
        saved_name = f'cert_doc_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}'
        target_path = os.path.join(settings.UPLOAD_DIR, saved_name)
        with open(target_path, 'wb') as f:
            f.write(content)
        profile.certification_document_path = saved_name

    db.commit()
    db.refresh(profile)
    return {'message': 'Documents uploaded successfully', 'profile': format_pro_out(profile)}

@router.get('/documents/{filename}')
def get_document_file(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Security: File serving is strictly authenticated and ownership-checked
    profile = db.query(ProProfile).filter(
        (ProProfile.id_document_path == filename) | (ProProfile.certification_document_path == filename)
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail='Document not found')

    # Allow only document owner (Pro) or Admin
    if current_user.role != UserRole.ADMIN and profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail='You do not have permission to view this document')

    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail='File not found on storage')

    return FileResponse(file_path)
