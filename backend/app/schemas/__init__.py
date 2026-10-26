from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models import (
    UserRole, VerificationStatus, JobStatus, PaymentStatus,
    QuoteStatus, MilestoneStatus, MaterialsMode, DisputeStatus
)

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

# Portfolio Photo Schemas
class PortfolioPhotoOut(BaseModel):
    id: int
    pro_profile_id: int
    image_url: str
    caption: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

# Pro Profile Schemas
class ProProfileCreate(BaseModel):
    skill_category_id: int
    bio: Optional[str] = None
    service_radius_km: float = Field(25.0, ge=1.0, le=200.0)
    latitude: Optional[float] = Field(6.5244, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(3.3792, ge=-180.0, le=180.0)
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

class ProAvailabilityUpdate(BaseModel):
    is_available: bool

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
    is_available: bool = True
    avg_rating: float
    total_reviews: int
    total_jobs_completed: int
    distance_km: Optional[float] = None
    created_at: datetime
    portfolio_photos: Optional[List[PortfolioPhotoOut]] = None

    class Config:
        from_attributes = True

# Pricing & Catalog Schemas
class PricingEstimateRequest(BaseModel):
    client_lat: Optional[float] = None
    client_lng: Optional[float] = None
    pro_id: Optional[int] = None
    skill_category_id: Optional[int] = None
    is_emergency: bool = False
    tolls_kobo: int = 0

class PricingEstimateResponse(BaseModel):
    min_kobo: int
    max_kobo: int
    min_naira: float
    max_naira: float
    display_range: str
    exact_call_out_kobo: Optional[int] = None
    exact_call_out_naira: Optional[float] = None
    straight_distance_km: Optional[float] = None
    estimated_road_km: Optional[float] = None
    estimated_minutes: Optional[int] = None
    surge_multiplier: float
    surge_reason: Optional[str] = None
    diagnostic_credit_percent: float = 50.0
    pricing_version: str = 'v1.0'

class CatalogItemOut(BaseModel):
    id: int
    skill_category_id: int
    trade: str
    name: str
    labor_kobo: int
    labor_naira: float
    parts_allowance_kobo: int
    parts_allowance_naira: float
    included_parts: Optional[str] = None
    is_active: bool

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
    job_type: str = 'quoted'  # 'quoted' or 'quick_fix'
    is_emergency: bool = False
    catalog_item_id: Optional[int] = None

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
    job_type: str = 'quoted'
    call_out_kobo: int = 600000
    call_out_naira: float = 6000.0
    surge_multiplier: float = 1.0
    surge_reason: Optional[str] = None
    diagnosis_notes: Optional[str] = None
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
    has_quote: bool = False

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

# Structured Diagnosis & Quotes
class DiagnosisSubmitRequest(BaseModel):
    notes: str = Field(..., min_length=10, description="Detailed diagnostic findings from on-site inspection")

class MaterialLineCreate(BaseModel):
    name: str = Field(..., min_length=2)
    spec: Optional[str] = None
    qty: int = Field(1, ge=1)
    unit_estimate_kobo: int = Field(0, ge=0)

class MaterialLineOut(BaseModel):
    id: int
    name: str
    spec: Optional[str] = None
    qty: int
    unit_estimate_kobo: int
    unit_estimate_naira: float
    total_kobo: int
    total_naira: float

class MilestoneCreate(BaseModel):
    seq: int = Field(1, ge=1, le=6)
    name: str = Field(..., min_length=3)
    amount_kobo: int = Field(..., gt=0)
    checklist: Optional[str] = None

class MilestoneOut(BaseModel):
    id: int
    seq: int
    name: str
    amount_kobo: int
    amount_naira: float
    checklist: Optional[str] = None
    status: MilestoneStatus
    funded_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class QuoteCreate(BaseModel):
    labor_total_kobo: int = Field(..., gt=0)
    materials_mode: MaterialsMode = MaterialsMode.MODE_A_CLIENT
    materials_estimate_kobo: int = Field(0, ge=0)
    warranty_days: int = Field(7, ge=0, le=365)
    milestones: List[MilestoneCreate]
    material_lines: Optional[List[MaterialLineCreate]] = []

class QuoteOut(BaseModel):
    id: int
    job_id: int
    version: int
    status: QuoteStatus
    labor_total_kobo: int
    labor_total_naira: float
    materials_mode: MaterialsMode
    materials_estimate_kobo: int
    materials_estimate_naira: float
    diagnostic_credit_kobo: int
    diagnostic_credit_naira: float
    net_payable_labor_kobo: int
    net_payable_labor_naira: float
    warranty_days: int
    expires_at: Optional[datetime] = None
    created_at: datetime
    milestones: List[MilestoneOut] = []
    material_lines: List[MaterialLineOut] = []

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
