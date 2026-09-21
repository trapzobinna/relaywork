from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.rate_limiter import limiter
from app.core.deps import get_current_user
from app.models import User, UserRole
from app.schemas import UserRegister, UserLogin, TokenResponse, RefreshTokenRequest, UserOut, ChangePasswordRequest

router = APIRouter(prefix='/api/auth', tags=['Authentication'])


@router.post('/register', response_model=TokenResponse)
@limiter.limit('5/minute')
def register(request: Request, data: UserRegister, db: Session = Depends(get_db)):
    if data.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Admin accounts cannot be self-registered. Use bootstrap or admin invitation.'
        )
    
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='An account with this email already exists'
        )

    user = User(
        email=data.email.lower(),
        password_hash=get_password_hash(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
        is_active=True,
        is_verified=True if data.role == UserRole.CLIENT else False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token_payload = {'sub': str(user.id), 'role': user.role.value, 'email': user.email}
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
        email=user.email
    )

@router.post('/login', response_model=TokenResponse)
@limiter.limit('5/minute')
def login(request: Request, data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid email or password'
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Account is suspended')

    token_payload = {'sub': str(user.id), 'role': user.role.value, 'email': user.email}
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
        email=user.email
    )

@router.post('/refresh', response_model=TokenResponse)
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get('type') != 'refresh':
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid refresh token')

    user_id = payload.get('sub')
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found or suspended')

    token_payload = {'sub': str(user.id), 'role': user.role.value, 'email': user.email}
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
        email=user.email
    )

@router.get('/me', response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post('/change-password')
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Incorrect current password'
        )
    
    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {'status': 'success', 'message': 'Password updated successfully'}

