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
    ACCEPTED = 'accepted'
    DECLINED = 'declined'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    PAID = 'paid'
    CANCELLED = 'cancelled'
    DISPUTED = 'disputed'

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
    sent_messages = relationship('Message', back_populates='sender')
    reviews_given = relationship('Review', back_populates='reviewer', foreign_keys='Review.reviewer_id')
    admin_actions = relationship('AdminAction', back_populates='admin', foreign_keys='AdminAction.admin_id')

class SkillCategory(Base):
    __tablename__ = 'skill_categories'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    icon = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    pros = relationship('ProProfile', back_populates='skill_category')
    jobs = relationship('Job', back_populates='skill_category')

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
    avg_rating = Column(Float, default=0.0, nullable=False)
    total_reviews = Column(Integer, default=0, nullable=False)
    total_jobs_completed = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship('User', back_populates='pro_profile')
    skill_category = relationship('SkillCategory', back_populates='pros')

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
    uploaded_at = Column(DateTime, default=utcnow, nullable=False)

    job = relationship('Job', back_populates='photos')

class Message(Base):
    __tablename__ = 'messages'

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), index=True, nullable=False)
    sender_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=utcnow, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)

    job = relationship('Job', back_populates='messages')
    sender = relationship('User', back_populates='sent_messages')

class Payment(Base):
    __tablename__ = 'payments'

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), index=True, nullable=False)
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
