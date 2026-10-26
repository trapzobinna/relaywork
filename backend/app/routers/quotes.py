import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user, require_pro, require_client
from app.models import (
    User, UserRole, Job, JobStatus, Quote, QuoteStatus, Milestone,
    MilestoneStatus, MaterialLine, MaterialsMode, JobEvent
)
from app.schemas import (
    DiagnosisSubmitRequest, QuoteCreate, QuoteOut, MilestoneOut,
    MaterialLineOut
)
from app.services import ledger

router = APIRouter(prefix='/api', tags=['Quotes & Milestones'])

def utcnow():
    return datetime.now(timezone.utc)

def format_quote_out(q: Quote) -> QuoteOut:
    net_labor = max(0, q.labor_total_kobo - q.diagnostic_credit_kobo)
    
    milestones_out = [
        MilestoneOut(
            id=m.id,
            seq=m.seq,
            name=m.name,
            amount_kobo=m.amount_kobo,
            amount_naira=m.amount_kobo / 100.0,
            checklist=m.checklist,
            status=m.status,
            funded_at=m.funded_at,
            completed_at=m.completed_at
        )
        for m in q.milestones
    ]

    materials_out = [
        MaterialLineOut(
            id=ml.id,
            name=ml.name,
            spec=ml.spec,
            qty=ml.qty,
            unit_estimate_kobo=ml.unit_estimate_kobo,
            unit_estimate_naira=ml.unit_estimate_kobo / 100.0,
            total_kobo=ml.unit_estimate_kobo * ml.qty,
            total_naira=(ml.unit_estimate_kobo * ml.qty) / 100.0
        )
        for ml in q.material_lines
    ]

    return QuoteOut(
        id=q.id,
        job_id=q.job_id,
        version=q.version,
        status=q.status,
        labor_total_kobo=q.labor_total_kobo,
        labor_total_naira=q.labor_total_kobo / 100.0,
        materials_mode=q.materials_mode,
        materials_estimate_kobo=q.materials_estimate_kobo,
        materials_estimate_naira=q.materials_estimate_kobo / 100.0,
        diagnostic_credit_kobo=q.diagnostic_credit_kobo,
        diagnostic_credit_naira=q.diagnostic_credit_kobo / 100.0,
        net_payable_labor_kobo=net_labor,
        net_payable_labor_naira=net_labor / 100.0,
        warranty_days=q.warranty_days,
        expires_at=q.expires_at,
        created_at=q.created_at,
        milestones=milestones_out,
        material_lines=materials_out
    )

@router.post('/jobs/{job_id}/diagnosis')
def submit_diagnosis(
    job_id: int,
    payload: DiagnosisSubmitRequest,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """
    Artisan arrives on site and logs comprehensive diagnostic notes + findings.
    Transitions job status to ON_SITE and unlocks the call-out fee earning in ledger.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only assigned artisan can submit diagnosis")

    from_status = job.status.value if hasattr(job.status, 'value') else str(job.status)
    job.diagnosis_notes = payload.notes
    job.has_arrived = True
    job.status = JobStatus.ON_SITE

    # Log JobEvent
    db.add(JobEvent(
        job_id=job.id,
        from_status=from_status,
        to_status=JobStatus.ON_SITE.value,
        actor_type='pro',
        actor_id=current_user.id,
        reason_code='DIAGNOSIS_COMPLETED'
    ))

    # Trigger call-out fee earning in double-entry ledger (80% pro, 20% platform)
    try:
        ledger.earn_call_out(
            db=db,
            job_id=job.id,
            pro_user_id=current_user.id,
            amount_kobo=job.call_out_kobo
        )
    except Exception as e:
        # Don't fail the diagnosis if ledger entry was already recorded idempotently
        pass

    db.commit()
    db.refresh(job)
    return {
        "message": "Diagnosis recorded successfully. You can now build and submit the structured quote.",
        "job_id": job.id,
        "status": job.status,
        "diagnosis_notes": job.diagnosis_notes
    }

@router.post('/jobs/{job_id}/quotes', response_model=QuoteOut)
def create_quote(
    job_id: int,
    payload: QuoteCreate,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """
    Artisan creates structured quote per Section 4 & 5 of the specification:
    - On-site diagnosis must be logged
    - Milestone 1 <= 30% of labor
    - 1 to 6 milestones max
    - Automatic 50% Diagnostic Credit applied
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the assigned artisan can create a quote")

    if not job.diagnosis_notes:
        raise HTTPException(
            status_code=400,
            detail="On-site diagnosis notes are required before building a structured quote."
        )

    # Validate milestones
    if not payload.milestones or len(payload.milestones) == 0:
        raise HTTPException(status_code=400, detail="Quote requires at least 1 milestone.")
    if len(payload.milestones) > 6:
        raise HTTPException(status_code=400, detail="Maximum 6 milestones allowed per quote.")

    milestones_sum = sum(m.amount_kobo for m in payload.milestones)
    if milestones_sum != payload.labor_total_kobo:
        raise HTTPException(
            status_code=400,
            detail=f"Milestones total (₦{milestones_sum/100:,.2f}) does not match labor total (₦{payload.labor_total_kobo/100:,.2f})."
        )

    # Mobilization safety cap: Milestone 1 cannot exceed 30% of labor if multiple milestones
    if len(payload.milestones) > 1:
        first_m = payload.milestones[0]
        max_first = int(payload.labor_total_kobo * 0.30)
        if first_m.amount_kobo > max_first:
            raise HTTPException(
                status_code=400,
                detail=f"Milestone 1 (₦{first_m.amount_kobo/100:,.2f}) exceeds the 30% mobilization cap (₦{max_first/100:,.2f})."
            )

    # 50% Diagnostic Credit calculation: 50% of call-out fee credited off labor
    diag_credit = int(min(job.call_out_kobo * 0.50, payload.labor_total_kobo))

    # Calculate version
    existing_count = db.query(Quote).filter(Quote.job_id == job.id).count()
    version = existing_count + 1

    # Mark any previous open quotes voided
    db.query(Quote).filter(
        Quote.job_id == job.id,
        Quote.status.in_([QuoteStatus.SENT, QuoteStatus.DRAFT])
    ).update({'status': QuoteStatus.VOIDED})

    quote = Quote(
        job_id=job.id,
        version=version,
        status=QuoteStatus.SENT,
        labor_total_kobo=payload.labor_total_kobo,
        materials_mode=payload.materials_mode,
        materials_estimate_kobo=payload.materials_estimate_kobo,
        diagnostic_credit_kobo=diag_credit,
        warranty_days=payload.warranty_days,
        expires_at=utcnow() + timedelta(days=7)
    )
    db.add(quote)
    db.flush()

    for idx, m in enumerate(payload.milestones):
        milestone = Milestone(
            quote_id=quote.id,
            seq=m.seq or (idx + 1),
            name=m.name,
            amount_kobo=m.amount_kobo,
            checklist=m.checklist,
            status=MilestoneStatus.PENDING
        )
        db.add(milestone)

    if payload.material_lines:
        for ml in payload.material_lines:
            mat = MaterialLine(
                quote_id=quote.id,
                name=ml.name,
                spec=ml.spec,
                qty=ml.qty,
                unit_estimate_kobo=ml.unit_estimate_kobo
            )
            db.add(mat)

    # Update job status
    from_status = job.status.value if hasattr(job.status, 'value') else str(job.status)
    job.status = JobStatus.QUOTE_SENT
    db.add(JobEvent(
        job_id=job.id,
        from_status=from_status,
        to_status=JobStatus.QUOTE_SENT.value,
        actor_type='pro',
        actor_id=current_user.id,
        reason_code=f'QUOTE_SENT_V{version}'
    ))

    db.commit()
    db.refresh(quote)
    return format_quote_out(quote)

@router.get('/jobs/{job_id}/quotes', response_model=List[QuoteOut])
def get_job_quotes(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Access check: client, pro, or admin
    if current_user.role != UserRole.ADMIN and job.client_id != current_user.id and job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to view quotes for this job")

    quotes = db.query(Quote).filter(Quote.job_id == job.id).order_by(Quote.version.desc()).all()
    return [format_quote_out(q) for q in quotes]

@router.post('/quotes/{quote_id}/accept', response_model=QuoteOut)
def accept_quote(
    quote_id: int,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    """
    Client accepts structured quote:
    - Funds escrow in double-entry ledger (net labor + materials if Mode B)
    - Diagnostic credit applied
    - Milestones transitioned to FUNDED
    - Job transitioned to IN_PROGRESS
    """
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    job = db.query(Job).filter(Job.id == quote.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Associated job not found")
    if job.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only client who requested job can accept quote")

    if quote.status != QuoteStatus.SENT:
        raise HTTPException(status_code=400, detail=f"Cannot accept quote with status: {quote.status}")

    quote.status = QuoteStatus.ACCEPTED
    for m in quote.milestones:
        m.status = MilestoneStatus.FUNDED
        m.funded_at = utcnow()

    # Record double-entry ledger transaction
    ledger.fund_quote_escrow(
        db=db,
        job_id=job.id,
        quote_id=quote.id,
        labor_kobo=quote.labor_total_kobo,
        diagnostic_credit_kobo=quote.diagnostic_credit_kobo,
        materials_kobo=quote.materials_estimate_kobo,
        is_mode_b_wallet=(quote.materials_mode == MaterialsMode.MODE_B_WALLET)
    )

    from_status = job.status.value if hasattr(job.status, 'value') else str(job.status)
    job.status = JobStatus.IN_PROGRESS
    db.add(JobEvent(
        job_id=job.id,
        from_status=from_status,
        to_status=JobStatus.IN_PROGRESS.value,
        actor_type='client',
        actor_id=current_user.id,
        reason_code='QUOTE_ACCEPTED_AND_FUNDED'
    ))

    db.commit()
    db.refresh(quote)
    return format_quote_out(quote)

@router.post('/quotes/{quote_id}/decline', response_model=QuoteOut)
def decline_quote(
    quote_id: int,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    job = db.query(Job).filter(Job.id == quote.job_id).first()
    if not job or job.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    quote.status = QuoteStatus.DECLINED
    db.commit()
    db.refresh(quote)
    return format_quote_out(quote)

@router.post('/milestones/{milestone_id}/complete')
def complete_milestone(
    milestone_id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Artisan marks milestone finished and requests client approval for fund release."""
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    job = milestone.quote.job
    if job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    milestone.status = MilestoneStatus.COMPLETED
    milestone.completed_at = utcnow()
    milestone.auto_release_at = utcnow() + timedelta(hours=72)  # 72-hour auto release window per spec

    db.commit()
    return {"message": "Milestone submitted as completed. Client has been notified for release.", "status": milestone.status}

@router.post('/milestones/{milestone_id}/approve')
def approve_milestone(
    milestone_id: int,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db)
):
    """
    Client inspects delivered milestone and approves release:
    - Double-entry ledger releases 88% to pro, 12% to platform
    - Milestone marked RELEASED
    - If all milestones released, job marked COMPLETED
    """
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    job = milestone.quote.job
    if job.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only client can approve milestone release")

    # Release milestone funds in ledger
    ledger.release_milestone(
        db=db,
        job_id=job.id,
        milestone_id=milestone.id,
        pro_user_id=job.pro_id,
        amount_kobo=milestone.amount_kobo
    )

    milestone.status = MilestoneStatus.RELEASED

    # Check if all milestones are released
    all_milestones = milestone.quote.milestones
    all_released = all(m.status == MilestoneStatus.RELEASED for m in all_milestones)

    if all_released:
        from_status = job.status.value if hasattr(job.status, 'value') else str(job.status)
        job.status = JobStatus.COMPLETED
        job.completed_at = utcnow()
        db.add(JobEvent(
            job_id=job.id,
            from_status=from_status,
            to_status=JobStatus.COMPLETED.value,
            actor_type='client',
            actor_id=current_user.id,
            reason_code='ALL_MILESTONES_RELEASED'
        ))

    db.commit()
    return {
        "message": "Milestone funds released successfully!",
        "milestone_id": milestone.id,
        "all_completed": all_released,
        "job_status": job.status
    }
