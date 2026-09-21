import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import settings
from app.core.deps import get_current_user, require_client
from app.models import User, Job, Payment, ProProfile, JobStatus, PaymentStatus, UserRole
from app.schemas import PaymentInitializeRequest, PaymentInitializeResponse, PaymentOut
from app.services.paystack import PaystackService

router = APIRouter(prefix='/api/payments', tags=['Payments'])

def utcnow():
    return datetime.now(timezone.utc)

@router.post('/initialize', response_model=PaymentInitializeResponse)
async def initialize_payment(data: PaymentInitializeRequest, current_user: User = Depends(require_client), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    if job.client_id != current_user.id:
        raise HTTPException(status_code=403, detail='Only the job client can pay for this job')
    if job.status not in [JobStatus.COMPLETED, JobStatus.IN_PROGRESS, JobStatus.ACCEPTED]:
        raise HTTPException(status_code=400, detail='Cannot initiate payment for current job status')
    commission_rate = settings.PLATFORM_COMMISSION_PERCENT / 100.0
    commission_amount = round(job.budget_amount * commission_rate, 2)
    pro_payout_amount = round(job.budget_amount - commission_amount, 2)
    reference = 'rw_' + str(job.id) + '_' + str(uuid.uuid4().hex[:12])
    pro_profile = db.query(ProProfile).filter(ProProfile.user_id == job.pro_id).first() if job.pro_id else None
    subaccount_code = pro_profile.paystack_subaccount_code if pro_profile else None
    paystack_res = await PaystackService.initialize_transaction(email=current_user.email, amount_naira=job.budget_amount, reference=reference, subaccount_code=subaccount_code)
    if not paystack_res.get('status') or 'data' not in paystack_res:
        raise HTTPException(status_code=502, detail='Failed to initialize Paystack transaction')
    payment = Payment(job_id=job.id, amount=job.budget_amount, commission_amount=commission_amount, pro_payout_amount=pro_payout_amount, paystack_reference=reference, status=PaymentStatus.PENDING)
    db.add(payment)
    db.commit()
    return PaymentInitializeResponse(authorization_url=paystack_res['data'].get('authorization_url', ''), access_code=paystack_res['data'].get('access_code', ''), reference=reference, amount=job.budget_amount, commission_amount=commission_amount, pro_payout_amount=pro_payout_amount)

@router.post('/webhook')
async def paystack_webhook(request: Request, db: Session = Depends(get_db), x_paystack_signature: str = Header(None)):
    raw_body = await request.body()
    if not x_paystack_signature or not PaystackService.verify_webhook_signature(raw_body, x_paystack_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid Paystack webhook signature')
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid JSON payload')
    event = payload.get('event')
    data = payload.get('data', {})
    if event == 'charge.success':
        reference = data.get('reference')
        if not reference:
            return {'status': 'ignored', 'reason': 'missing reference'}
        payment = db.query(Payment).filter(Payment.paystack_reference == reference).first()
        if not payment:
            return {'status': 'ignored', 'reason': 'payment reference not found'}
        if payment.status == PaymentStatus.PAID:
            return {'status': 'already_processed', 'message': 'Payment already marked as paid'}
        payment.status = PaymentStatus.PAID
        payment.paid_at = utcnow()
        job = db.query(Job).filter(Job.id == payment.job_id).first()
        if job:
            job.status = JobStatus.PAID
            job.paid_at = utcnow()
            if job.pro_id:
                pro_profile = db.query(ProProfile).filter(ProProfile.user_id == job.pro_id).first()
                if pro_profile:
                    pro_profile.total_jobs_completed += 1
        db.commit()
        return {'status': 'success', 'message': 'Payment and job successfully settled'}
    return {'status': 'ignored', 'event': event}

@router.get('/{job_id}/status', response_model=PaymentOut)
def get_payment_status(job_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.job_id == job_id).order_by(Payment.created_at.desc()).first()
    if not payment:
        raise HTTPException(status_code=404, detail='No payment record found for this job')
    job = payment.job
    if current_user.role != UserRole.ADMIN and job.client_id != current_user.id and job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail='Unauthorized to view payment status')
    return payment
