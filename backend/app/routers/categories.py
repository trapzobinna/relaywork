from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import SkillCategory, User
from app.schemas import SkillCategoryOut, SkillCategoryCreate
from app.core.deps import require_admin

router = APIRouter(prefix='/api/skill-categories', tags=['Skill Categories'])

@router.get('', response_model=List[SkillCategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(SkillCategory).order_by(SkillCategory.name.asc()).all()

@router.post('', response_model=SkillCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(data: SkillCategoryCreate, db: Session = Depends(get_db), current_admin: User = Depends(require_admin)):
    existing = db.query(SkillCategory).filter(
        (SkillCategory.name == data.name) | (SkillCategory.slug == data.slug)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail='Category with this name or slug already exists')
    
    category = SkillCategory(
        name=data.name,
        slug=data.slug,
        icon=data.icon,
        description=data.description
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
