from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models import UserRole, VerificationStatus, JobStatus, PaymentStatus

# Auth & User Schemas
class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    role: UserRole = UserRole.CLIENT

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'
    user_id: int
    role: UserRole
    full_name: str
    email: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class RefreshTokenRequest(BaseModel):

    refresh_token: str

class UserOut(BaseModel):
    id: int
    email: str
    phone: Optional[str] = None
    full_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Skill Category Schemas
class SkillCategoryBase(BaseModel):
    name: str
    slug: str
    icon: Optional[str] = None
    description: Optional[str] = None

class SkillCategoryCreate(SkillCategoryBase):
    pass

class SkillCategoryOut(SkillCategoryBase):
    id: int

    class Config:
        from_attributes = True

# Pro Profile Schemas
class ProProfileCreate(BaseModel):
    skill_category_id: int
    bio: Optional[str] = None
    service_radius_km: float = Field(25.0, ge=1.0, le=200.0)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address_text: Optional[str] = None
    bank_name: Optional[str] = None
    bank_code: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None

class ProProfileUpdate(BaseModel):
    bio: Optional[str] = None
    service_radius_km: Optional[float] = Field(None, ge=1.0, le=200.0)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    address_text: Optional[str] = None

class ProProfileOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    user_phone: Optional[str] = None
    skill_category_id: int
    skill_category_name: str
    bio: Optional[str] = None
    service_radius_km: float
    hourly_rate: Optional[float] = 10000.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address_text: Optional[str] = None
    verification_status: VerificationStatus
    verification_notes: Optional[str] = None
    has_id_document: bool = False
    has_cert_document: bool = False
    masked_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    avg_rating: float
    total_reviews: int
    total_jobs_completed: int
    distance_km: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Job Schemas
class JobCreate(BaseModel):
    pro_id: Optional[int] = None
    skill_category_id: int
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    budget_amount: float = Field(..., gt=0)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None

class JobPhotoOut(BaseModel):
    id: int
    file_path: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class JobOut(BaseModel):
    id: int
    client_id: int
    client_name: str
    pro_id: Optional[int] = None
    pro_name: Optional[str] = None
    skill_category_id: int
    skill_category_name: str
    title: str
    description: str
    budget_amount: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    status: JobStatus
    is_en_route: bool = False
    has_arrived: bool = False
    pro_current_lat: Optional[float] = None
    pro_current_lng: Optional[float] = None
    last_location_updated_at: Optional[datetime] = None
    created_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    photos: List[JobPhotoOut] = []

    class Config:
        from_attributes = True

class LocationUpdatePayload(BaseModel):
    latitude: float
    longitude: float

class JobLocationPingOut(BaseModel):
    id: int
    job_id: int
    latitude: float
    longitude: float
    recorded_at: datetime

    class Config:
        from_attributes = True


# Message Schemas
class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)

class MessageOut(BaseModel):
    id: int
    job_id: int
    sender_id: int
    sender_name: str
    content: str
    sent_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Payment Schemas
class PaymentInitializeRequest(BaseModel):
    job_id: int

class PaymentInitializeResponse(BaseModel):
    authorization_url: str
    access_code: str
    reference: str
    amount: float
    commission_amount: float
    pro_payout_amount: float

class PaymentOut(BaseModel):
    id: int
    job_id: int
    amount: float
    commission_amount: float
    pro_payout_amount: float
    paystack_reference: str
    status: PaymentStatus
    created_at: datetime
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Review Schemas
class ReviewCreate(BaseModel):
    job_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewOut(BaseModel):
    id: int
    job_id: int
    reviewer_id: int
    reviewer_name: str
    pro_user_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Admin Schemas
class AdminBootstrapRequest(BaseModel):
    bootstrap_token: str
    email: str
    password: str = Field(..., min_length=8)
    full_name: str

class AdminProDecision(BaseModel):
    notes: Optional[str] = None

class AdminActionOut(BaseModel):
    id: int
    admin_id: int
    admin_name: str
    action_type: str
    target_user_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
