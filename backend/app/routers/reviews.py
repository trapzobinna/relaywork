from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.core.deps import get_current_user, require_client
from app.models import User, Job, Review, ProProfile, JobStatus, UserRole
from app.schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix='/api/reviews', tags=['Reviews'])

def utcnow():
    return datetime.now(timezone.utc)

@router.post('', response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    data: ReviewCreate,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    if job.client_id != current_user.id:
        raise HTTPException(status_code=403, detail='Only the client who requested this job can submit a review')

    if job.status != JobStatus.PAID:
        raise HTTPException(status_code=400, detail='Reviews can only be submitted for completed and paid jobs')

    if not job.pro_id:
        raise HTTPException(status_code=400, detail='No Pro was assigned to this job')

    existing_review = db.query(Review).filter(Review.job_id == job.id).first()
    if existing_review:
        raise HTTPException(status_code=400, detail='A review has already been submitted for this job')

    review = Review(
        job_id=job.id,
        reviewer_id=current_user.id,
        pro_user_id=job.pro_id,
        rating=data.rating,
        comment=data.comment,
        created_at=utcnow()
    )
    db.add(review)
    db.flush()

    pro_profile = db.query(ProProfile).filter(ProProfile.user_id == job.pro_id).first()
    if pro_profile:
        avg_score, total = db.query(func.avg(Review.rating), func.count(Review.id)).filter(
            Review.pro_user_id == job.pro_id
        ).first()
        pro_profile.avg_rating = round(float(avg_score or data.rating), 1)
        pro_profile.total_reviews = int(total or 1)

    db.commit()
    db.refresh(review)

    return ReviewOut(
        id=review.id,
        job_id=review.job_id,
        reviewer_id=review.reviewer_id,
        reviewer_name=current_user.full_name,
        pro_user_id=review.pro_user_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at
    )

@router.get('/pro/{pro_id}', response_model=List[ReviewOut])
def get_pro_reviews(pro_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.pro_user_id == pro_id).order_by(Review.created_at.desc()).all()
    return [
        ReviewOut(
            id=r.id,
            job_id=r.job_id,
            reviewer_id=r.reviewer_id,
            reviewer_name=r.reviewer.full_name if r.reviewer else 'Client',
            pro_user_id=r.pro_user_id,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at
        )
        for r in reviews
    ]
