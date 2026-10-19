import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.config import settings
from app.core.deps import get_current_user, require_pro
from app.models import User, ProProfile, PortfolioPhoto, UserRole
from app.schemas import PortfolioPhotoOut

router = APIRouter(prefix='/api/pros', tags=['Portfolio'])

MAX_PHOTOS = 10
ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
MAX_SIZE = 5 * 1024 * 1024  # 5MB

def _photo_to_out(photo: PortfolioPhoto, base_url: str) -> PortfolioPhotoOut:
    return PortfolioPhotoOut(
        id=photo.id,
        pro_profile_id=photo.pro_profile_id,
        image_url=f'{base_url}/api/pros/portfolio/file/{photo.file_path}',
        caption=photo.caption,
        uploaded_at=photo.uploaded_at,
    )

@router.get('/{pro_id}/portfolio', response_model=List[PortfolioPhotoOut])
def get_portfolio(pro_id: int, request_base: str = '', db: Session = Depends(get_db)):
    profile = db.query(ProProfile).filter(ProProfile.id == pro_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail='Pro profile not found')
    base = settings.FRONTEND_ORIGIN.replace('localhost:5173', 'localhost:8000') if 'localhost:5173' in settings.FRONTEND_ORIGIN else ''
    return [_photo_to_out(p, base) for p in profile.portfolio_photos]

@router.post('/{pro_id}/portfolio', response_model=PortfolioPhotoOut)
async def upload_portfolio_photo(
    pro_id: int,
    photo: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db),
):
    profile = db.query(ProProfile).filter(ProProfile.id == pro_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail='Pro profile not found')
    if profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail='You can only upload photos to your own portfolio')

    if photo.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail='Only JPEG, PNG, and WebP images are allowed')

    content = await photo.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail='Image must be under 5MB')

    existing_count = db.query(PortfolioPhoto).filter(PortfolioPhoto.pro_profile_id == profile.id).count()
    if existing_count >= MAX_PHOTOS:
        raise HTTPException(status_code=400, detail=f'Portfolio is full — maximum {MAX_PHOTOS} photos allowed')

    ext = os.path.splitext(photo.filename or 'photo.jpg')[1] or '.jpg'
    filename = f'portfolio_{profile.id}_{uuid.uuid4().hex[:10]}{ext}'
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(os.path.join(settings.UPLOAD_DIR, filename), 'wb') as f:
        f.write(content)

    new_photo = PortfolioPhoto(
        pro_profile_id=profile.id,
        file_path=filename,
        caption=caption.strip() if caption else None,
    )
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)
    return _photo_to_out(new_photo, '')

@router.delete('/{pro_id}/portfolio/{photo_id}', status_code=204)
def delete_portfolio_photo(
    pro_id: int,
    photo_id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db),
):
    profile = db.query(ProProfile).filter(ProProfile.id == pro_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail='Pro profile not found')
    if profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail='You can only delete your own portfolio photos')

    photo = db.query(PortfolioPhoto).filter(
        PortfolioPhoto.id == photo_id,
        PortfolioPhoto.pro_profile_id == profile.id
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail='Photo not found')

    # Remove file from disk
    file_path = os.path.join(settings.UPLOAD_DIR, photo.file_path)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(photo)
    db.commit()

@router.get('/portfolio/file/{filename}')
def serve_portfolio_file(filename: str, db: Session = Depends(get_db)):
    """Public endpoint — portfolio photos are visible to everyone."""
    photo = db.query(PortfolioPhoto).filter(PortfolioPhoto.file_path == filename).first()
    if not photo:
        raise HTTPException(status_code=404, detail='Photo not found')
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail='File not found on storage')
    return FileResponse(file_path)
