import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum, Index
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    CLIENT = 'client'
    PRO = 'pro'
    ADMIN = 'admin'

class VerificationStatus(str, enum.Enum):
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'

class JobStatus(str, enum.Enum):
    REQUESTED = 'requested'
    MATCHED = 'matched'
    ACCEPTED = 'accepted'
    DECLINED = 'declined'
    EN_ROUTE = 'en_route'
    ON_SITE = 'on_site'
    QUICK_FIX_DONE = 'quick_fix_done'
    QUOTE_SENT = 'quote_sent'
    QUOTE_FUNDED = 'quote_funded'
    IN_PROGRESS = 'in_progress'
    DELIVERED = 'delivered'
    COMPLETED = 'completed'
    RELEASED = 'released'
    PAID = 'paid'
    CANCELLED = 'cancelled'
    DISPUTED = 'disputed'

class JobType(str, enum.Enum):
    QUICK_FIX = 'quick_fix'
    QUOTED = 'quoted'

class QuoteStatus(str, enum.Enum):
    DRAFT = 'draft'
    SENT = 'sent'
    ACCEPTED = 'accepted'
    DECLINED = 'declined'
    EXPIRED = 'expired'
    VOIDED = 'voided'

class MilestoneStatus(str, enum.Enum):
    PENDING = 'pending'
    FUNDED = 'funded'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    RELEASED = 'released'

class MaterialsMode(str, enum.Enum):
    MODE_A_CLIENT = 'mode_a_client'
    MODE_B_WALLET = 'mode_b_wallet'

class DisputeStatus(str, enum.Enum):
    OPEN = 'open'
    UNDER_REVIEW = 'under_review'
    RESOLVED = 'resolved'
    APPEALED = 'appealed'

class LedgerAccountKind(str, enum.Enum):
    GATEWAY_CLEARING = 'gateway_clearing'
    JOB_ESCROW = 'job_escrow'
    MATERIALS_WALLET = 'materials_wallet'
    PRO_PAYABLE = 'pro_payable'
    PLATFORM_REVENUE = 'platform_revenue'
    GATEWAY_FEE_EXPENSE = 'gateway_fee_expense'

class LedgerDirection(str, enum.Enum):
    DEBIT = 'debit'
    CREDIT = 'credit'

class PaymentStatus(str, enum.Enum):
    PENDING = 'pending'
    PAID = 'paid'
    FAILED = 'failed'
    REFUNDED = 'refunded'

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CLIENT, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    pro_profile = relationship('ProProfile', back_populates='user', uselist=False, cascade='all, delete-orphan')
    client_jobs = relationship('Job', back_populates='client', foreign_keys='Job.client_id')
    pro_jobs = relationship('Job', back_populates='pro', foreign_keys='Job.pro_id')
    messages_sent = relationship('Message', back_populates='sender')
    reviews_given = relationship('Review', back_populates='reviewer', foreign_keys='Review.reviewer_id')
    admin_actions = relationship('AdminAction', back_populates='admin', foreign_keys='AdminAction.admin_id')

class SkillCategory(Base):
    __tablename__ = 'skill_categories'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    icon = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)

    pros = relationship('ProProfile', back_populates='skill_category')
    jobs = relationship('Job', back_populates='skill_category')
    catalog_items = relationship('CatalogItem', back_populates='skill_category')

class ProProfile(Base):
    __tablename__ = 'pro_profiles'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True, index=True, nullable=False)
    skill_category_id = Column(Integer, ForeignKey('skill_categories.id'), index=True, nullable=False)
    bio = Column(Text, nullable=True)
    service_radius_km = Column(Float, default=25.0, nullable=False)
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    address_text = Column(String(255), nullable=True)
    id_document_path = Column(String(255), nullable=True)
    certification_document_path = Column(String(255), nullable=True)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING, index=True, nullable=False)
    verification_notes = Column(Text, nullable=True)
    bank_name = Column(String(100), nullable=True)
    bank_code = Column(String(50), nullable=True)
    account_number = Column(String(50), nullable=True)
    account_name = Column(String(100), nullable=True)
    paystack_subaccount_code = Column(String(100), index=True, nullable=True)
    is_available = Column(Boolean, default=True, nullable=False, index=True)
    avg_rating = Column(Float, default=0.0, nullable=False)
    total_reviews = Column(Integer, default=0, nullable=False)
    total_jobs_completed = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship('User', back_populates='pro_profile')
    skill_category = relationship('SkillCategory', back_populates='pros')
    portfolio_photos = relationship('PortfolioPhoto', back_populates='pro_profile', cascade='all, delete-orphan', order_by='PortfolioPhoto.uploaded_at.desc()')

class PricingConfig(Base):
    __tablename__ = 'pricing_configs'

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(50), unique=True, index=True, nullable=False)
    effective_from = Column(DateTime, default=utcnow, nullable=False)
    params = Column(Text, nullable=False)  # JSON string
    created_at = Column(DateTime, default=utcnow, nullable=False)

class CatalogItem(Base):
    __tablename__ = 'catalog_items'

    id = Column(Integer, primary_key=True, index=True)
    skill_category_id = Column(Integer, ForeignKey('skill_categories.id'), index=True, nullable=False)
    trade = Column(String(100), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    labor_kobo = Column(Integer, nullable=False)
    included_parts = Column(Text, nullable=True)
    parts_allowance_kobo = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    skill_category = relationship('SkillCategory', back_populates='catalog_items')

class Job(Base):
    __tablename__ = 'jobs'

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    pro_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=True)
    skill_category_id = Column(Integer, ForeignKey('skill_categories.id'), index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    budget_amount = Column(Float, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_address = Column(String(255), nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.REQUESTED, index=True, nullable=False)
    job_type = Column(String(50), default='quoted', nullable=False)
    call_out_kobo = Column(Integer, default=600000, nullable=False)
    surge_multiplier = Column(Float, default=1.0, nullable=False)
    surge_reason = Column(String(100), nullable=True)
    pricing_config_version = Column(String(50), default='v1.0', nullable=True)
    diagnosis_notes = Column(Text, nullable=True)
    is_en_route = Column(Boolean, default=False, nullable=False)
    has_arrived = Column(Boolean, default=False, nullable=False)
    last_location_updated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    client = relationship('User', back_populates='client_jobs', foreign_keys=[client_id])
    pro = relationship('User', back_populates='pro_jobs', foreign_keys=[pro_id])
    skill_category = relationship('SkillCategory', back_populates='jobs')
    photos = relationship('JobPhoto', back_populates='job', cascade='all, delete-orphan')
    messages = relationship('Message', back_populates='job', cascade='all, delete-orphan')
    payments = relationship('Payment', back_populates='job', cascade='all, delete-orphan')
    location_pings = relationship('JobLocationPing', back_populates='job', cascade='all, delete-orphan', order_by='JobLocationPing.recorded_at.desc()')
    review = relationship('Review', back_populates='job', uselist=False, cascade='all, delete-orphan')
    quotes = relationship('Quote', back_populates='job', cascade='all, delete-orphan')
    events = relationship('JobEvent', back_populates='job', cascade='all, delete-orphan', order_by='JobEvent.created_at.desc()')
    disputes = relationship('Dispute', back_populates='job', cascade='all, delete-orphan')

class JobEvent(Base):
    __tablename__ = 'job_events'

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), index=True, nullable=False)
    from_status = Column(String(50), nullable=False)
    to_status = Column(String(50), nullable=False)
    actor_type = Column(String(50), nullable=False)  # client, pro, system, admin
    actor_id = Column(Integer, nullable=True)
    reason_code = Column(String(100), nullable=True)
    idempotency_key = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    job = relationship('Job', back_populates='events')

class Quote(Base):
    __tablename__ = 'quotes'

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), index=True, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    status = Column(Enum(QuoteStatus), default=QuoteStatus.SENT, index=True, nullable=False)
    labor_total_kobo = Column(Integer, default=0, nullable=False)
    materials_mode = Column(Enum(MaterialsMode), default=MaterialsMode.MODE_A_CLIENT, nullable=False)
    materials_estimate_kobo = Column(Integer, default=0, nullable=False)
    diagnostic_credit_kobo = Column(Integer, default=0, nullable=False)
    warranty_days = Column(Integer, default=7, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    job = relationship('Job', back_populates='quotes')
    milestones = relationship('Milestone', back_populates='quote', cascade='all, delete-orphan', order_by='Milestone.seq.asc()')
    material_lines = relationship('MaterialLine', back_populates='quote', cascade='all, delete-orphan')

class Milestone(Base):
    __tablename__ = 'milestones'

    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey('quotes.id', ondelete='CASCADE'), index=True, nullable=False)
    seq = Column(Integer, default=1, nullable=False)
    name = Column(String(255), nullable=False)
    amount_kobo = Column(Integer, nullable=False)
    checklist = Column(Text, nullable=True)
    status = Column(Enum(MilestoneStatus), default=MilestoneStatus.PENDING, index=True, nullable=False)
    funded_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    auto_release_at = Column(DateTime, nullable=True)

    quote = relationship('Quote', back_populates='milestones')

class MaterialLine(Base):
    __tablename__ = 'material_lines'

    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey('quotes.id', ondelete='CASCADE'), index=True, nullable=False)
    name = Column(String(200), nullable=False)
    spec = Column(String(255), nullable=True)
    qty = Column(Integer, default=1, nullable=False)
    unit_estimate_kobo = Column(Integer, default=0, nullable=False)

    quote = relationship('Quote', back_populates='material_lines')

class Dispute(Base):
    __tablename__ = 'disputes'

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), index=True, nullable=False)
    opened_by_user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    reason_code = Column(String(100), nullable=False)
    status = Column(Enum(DisputeStatus), default=DisputeStatus.OPEN, index=True, nullable=False)
    decision = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    job = relationship('Job', back_populates='disputes')
    opened_by = relationship('User', foreign_keys=[opened_by_user_id])

class LedgerAccount(Base):
    __tablename__ = 'ledger_accounts'

    id = Column(Integer, primary_key=True, index=True)
    owner_type = Column(String(50), nullable=False, index=True)  # system, pro, client
    owner_id = Column(Integer, nullable=True, index=True)
    kind = Column(Enum(LedgerAccountKind), nullable=False, index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    entries = relationship('LedgerEntry', back_populates='account')

class LedgerTxn(Base):
    __tablename__ = 'ledger_txns'

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String(100), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id'), nullable=True, index=True)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    entries = relationship('LedgerEntry', back_populates='txn', cascade='all, delete-orphan')

class LedgerEntry(Base):
    __tablename__ = 'ledger_entries'

    id = Column(Integer, primary_key=True, index=True)
    txn_id = Column(Integer, ForeignKey('ledger_txns.id', ondelete='CASCADE'), index=True, nullable=False)
    account_id = Column(Integer, ForeignKey('ledger_accounts.id'), index=True, nullable=False)
    direction = Column(Enum(LedgerDirection), nullable=False)
    amount_kobo = Column(Integer, nullable=False)

    txn = relationship('LedgerTxn', back_populates='entries')
    account = relationship('LedgerAccount', back_populates='entries')

class JobLocationPing(Base):
    __tablename__ = 'job_location_pings'

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=utcnow, nullable=False, index=True)

    job = relationship('Job', back_populates='location_pings')

class JobPhoto(Base):
    __tablename__ = 'job_photos'

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), index=True, nullable=False)
    file_path = Column(String(255), nullable=False)
    caption = Column(String(255), nullable=True)
    uploaded_at = Column(DateTime, default=utcnow, nullable=False)

    job = relationship('Job', back_populates='photos')

class Message(Base):
    __tablename__ = 'messages'

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), index=True, nullable=False)
    sender_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    body = Column(Text, nullable=False)
    attachment_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    job = relationship('Job', back_populates='messages')
    sender = relationship('User', back_populates='messages_sent')

class Payment(Base):
    __tablename__ = 'payments'

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id'), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    commission_amount = Column(Float, nullable=False)
    pro_payout_amount = Column(Float, nullable=False)
    paystack_reference = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, index=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    paid_at = Column(DateTime, nullable=True)

    job = relationship('Job', back_populates='payments')

class Review(Base):
    __tablename__ = 'reviews'

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), unique=True, index=True, nullable=False)
    reviewer_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    pro_user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    job = relationship('Job', back_populates='review')
    reviewer = relationship('User', back_populates='reviews_given', foreign_keys=[reviewer_id])

class AdminAction(Base):
    __tablename__ = 'admin_actions'

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    action_type = Column(String(100), nullable=False, index=True)
    target_user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    admin = relationship('User', back_populates='admin_actions', foreign_keys=[admin_id])

class PortfolioPhoto(Base):
    __tablename__ = 'portfolio_photos'

    id = Column(Integer, primary_key=True, index=True)
    pro_profile_id = Column(Integer, ForeignKey('pro_profiles.id', ondelete='CASCADE'), index=True, nullable=False)
    file_path = Column(String(255), nullable=False)
    caption = Column(String(300), nullable=True)
    uploaded_at = Column(DateTime, default=utcnow, nullable=False)

    pro_profile = relationship('ProProfile', back_populates='portfolio_photos')


class VisitorLog(Base):
    __tablename__ = 'visitor_logs'

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(100), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    session_id = Column(String(100), nullable=True, index=True)
    path = Column(String(255), nullable=False, index=True)
    method = Column(String(10), default='GET', nullable=False)
    status_code = Column(Integer, default=200, nullable=False)
    response_time_ms = Column(Float, default=0.0, nullable=False)
    user_agent = Column(Text, nullable=True)
    device = Column(String(50), default='Desktop', nullable=False)
    browser = Column(String(50), default='Chrome', nullable=False)
    os = Column(String(50), default='Windows', nullable=False)
    city = Column(String(100), default='Lagos', nullable=False)
    region = Column(String(100), default='Lagos State', nullable=False)
    country = Column(String(100), default='Nigeria', nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)

    user = relationship('User', foreign_keys=[user_id])
