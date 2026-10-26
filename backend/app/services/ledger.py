import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import (
    LedgerAccount,
    LedgerTxn,
    LedgerEntry,
    LedgerAccountKind,
    LedgerDirection
)

class LedgerError(Exception):
    pass

def get_or_create_account(
    db: Session,
    owner_type: str,
    kind: LedgerAccountKind,
    owner_id: Optional[int] = None
) -> LedgerAccount:
    """Finds or creates a ledger account uniquely identified by (owner_type, owner_id, kind)."""
    query = db.query(LedgerAccount).filter(
        LedgerAccount.owner_type == owner_type,
        LedgerAccount.kind == kind
    )
    if owner_id is not None:
        query = query.filter(LedgerAccount.owner_id == owner_id)
    else:
        query = query.filter(LedgerAccount.owner_id.is_(None))
    
    account = query.first()
    if not account:
        account = LedgerAccount(
            owner_type=owner_type,
            owner_id=owner_id,
            kind=kind
        )
        db.add(account)
        db.flush()
    return account

def record_transaction(
    db: Session,
    kind: str,
    job_id: Optional[int],
    idempotency_key: str,
    entries: List[Dict[str, Any]]
) -> LedgerTxn:
    """
    Enforces double-entry balanced accounting:
    sum(debits) must equal sum(credits).
    Atomically writes LedgerTxn + LedgerEntries.
    """
    # 1. Idempotency check
    existing = db.query(LedgerTxn).filter(LedgerTxn.idempotency_key == idempotency_key).first()
    if existing:
        return existing

    # 2. Balance check
    total_debits = sum(e['amount_kobo'] for e in entries if e['direction'] == LedgerDirection.DEBIT)
    total_credits = sum(e['amount_kobo'] for e in entries if e['direction'] == LedgerDirection.CREDIT)

    if total_debits != total_credits:
        raise LedgerError(
            f"Double-entry transaction unbalanced! Debits: {total_debits} kobo, Credits: {total_credits} kobo."
        )

    if total_debits <= 0:
        raise LedgerError("Transaction amount must be strictly positive.")

    # 3. Create Txn
    txn = LedgerTxn(
        kind=kind,
        job_id=job_id,
        idempotency_key=idempotency_key
    )
    db.add(txn)
    db.flush()

    # 4. Create Entries
    for e in entries:
        account = e['account']
        entry = LedgerEntry(
            txn_id=txn.id,
            account_id=account.id,
            direction=e['direction'],
            amount_kobo=e['amount_kobo']
        )
        db.add(entry)
    
    db.flush()
    return txn

# Standard Transaction Helpers

def fund_call_out(db: Session, job_id: int, amount_kobo: int, idempotency_key: Optional[str] = None) -> LedgerTxn:
    """Client pays call-out fee into job escrow via gateway clearing."""
    idem = idempotency_key or f"fund_call_out_job_{job_id}_{uuid.uuid4().hex[:8]}"
    gateway_acc = get_or_create_account(db, 'system', LedgerAccountKind.GATEWAY_CLEARING)
    escrow_acc = get_or_create_account(db, 'job', LedgerAccountKind.JOB_ESCROW, owner_id=job_id)

    entries = [
        {'account': gateway_acc, 'direction': LedgerDirection.DEBIT, 'amount_kobo': amount_kobo},
        {'account': escrow_acc, 'direction': LedgerDirection.CREDIT, 'amount_kobo': amount_kobo},
    ]
    return record_transaction(db, 'CALL_OUT_FUNDED', job_id, idem, entries)

def earn_call_out(db: Session, job_id: int, pro_user_id: int, amount_kobo: int, idempotency_key: Optional[str] = None) -> LedgerTxn:
    """
    On diagnosis completion, call-out fee is released:
    92.5% to pro_payable, 7.5% to platform_revenue (7.5% charging fee).
    """
    idem = idempotency_key or f"earn_call_out_job_{job_id}_{uuid.uuid4().hex[:8]}"
    escrow_acc = get_or_create_account(db, 'job', LedgerAccountKind.JOB_ESCROW, owner_id=job_id)
    pro_acc = get_or_create_account(db, 'pro', LedgerAccountKind.PRO_PAYABLE, owner_id=pro_user_id)
    platform_acc = get_or_create_account(db, 'system', LedgerAccountKind.PLATFORM_REVENUE)

    platform_cut = int(round(amount_kobo * 0.075))
    pro_cut = amount_kobo - platform_cut

    entries = [
        {'account': escrow_acc, 'direction': LedgerDirection.DEBIT, 'amount_kobo': amount_kobo},
        {'account': pro_acc, 'direction': LedgerDirection.CREDIT, 'amount_kobo': pro_cut},
        {'account': platform_acc, 'direction': LedgerDirection.CREDIT, 'amount_kobo': platform_cut},
    ]
    return record_transaction(db, 'CALL_OUT_EARNED', job_id, idem, entries)

def fund_quote_escrow(
    db: Session,
    job_id: int,
    quote_id: int,
    labor_kobo: int,
    diagnostic_credit_kobo: int = 0,
    materials_kobo: int = 0,
    is_mode_b_wallet: bool = False,
    idempotency_key: Optional[str] = None
) -> LedgerTxn:
    """
    Client accepts structured quote:
    - Client gateway payment = (labor - diagnostic_credit) + (materials if mode B)
    - Diagnostic credit is subsidized by platform
    - Job escrow credited with full labor_kobo
    - Materials wallet credited with materials_kobo if Mode B
    """
    idem = idempotency_key or f"fund_quote_{quote_id}_{uuid.uuid4().hex[:8]}"
    gateway_acc = get_or_create_account(db, 'system', LedgerAccountKind.GATEWAY_CLEARING)
    platform_acc = get_or_create_account(db, 'system', LedgerAccountKind.PLATFORM_REVENUE)
    escrow_acc = get_or_create_account(db, 'job', LedgerAccountKind.JOB_ESCROW, owner_id=job_id)

    client_labor_payment = labor_kobo - diagnostic_credit_kobo
    client_materials_payment = materials_kobo if is_mode_b_wallet else 0
    total_client_cash = client_labor_payment + client_materials_payment

    entries = [
        {'account': gateway_acc, 'direction': LedgerDirection.DEBIT, 'amount_kobo': total_client_cash},
    ]

    if diagnostic_credit_kobo > 0:
        entries.append({
            'account': platform_acc,
            'direction': LedgerDirection.DEBIT,
            'amount_kobo': diagnostic_credit_kobo
        })

    entries.append({
        'account': escrow_acc,
        'direction': LedgerDirection.CREDIT,
        'amount_kobo': labor_kobo
    })

    if is_mode_b_wallet and materials_kobo > 0:
        mat_wallet_acc = get_or_create_account(db, 'job', LedgerAccountKind.MATERIALS_WALLET, owner_id=job_id)
        entries.append({
            'account': mat_wallet_acc,
            'direction': LedgerDirection.CREDIT,
            'amount_kobo': materials_kobo
        })

    return record_transaction(db, 'QUOTE_FUNDED', job_id, idem, entries)

def release_milestone(
    db: Session,
    job_id: int,
    milestone_id: int,
    pro_user_id: int,
    amount_kobo: int,
    idempotency_key: Optional[str] = None
) -> LedgerTxn:
    """
    Client approves completed milestone:
    92.5% to pro_payable, 7.5% to platform_revenue (7.5% charging fee).
    """
    idem = idempotency_key or f"release_milestone_{milestone_id}_{uuid.uuid4().hex[:8]}"
    escrow_acc = get_or_create_account(db, 'job', LedgerAccountKind.JOB_ESCROW, owner_id=job_id)
    pro_acc = get_or_create_account(db, 'pro', LedgerAccountKind.PRO_PAYABLE, owner_id=pro_user_id)
    platform_acc = get_or_create_account(db, 'system', LedgerAccountKind.PLATFORM_REVENUE)

    platform_cut = int(round(amount_kobo * 0.075))
    pro_cut = amount_kobo - platform_cut

    entries = [
        {'account': escrow_acc, 'direction': LedgerDirection.DEBIT, 'amount_kobo': amount_kobo},
        {'account': pro_acc, 'direction': LedgerDirection.CREDIT, 'amount_kobo': pro_cut},
        {'account': platform_acc, 'direction': LedgerDirection.CREDIT, 'amount_kobo': platform_cut},
    ]
    return record_transaction(db, 'MILESTONE_RELEASED', job_id, idem, entries)

def release_materials_wallet(
    db: Session,
    job_id: int,
    pro_user_id: int,
    amount_kobo: int,
    idempotency_key: Optional[str] = None
) -> LedgerTxn:
    """Materials release: 100% to pro for verified material purchase (0% platform cut)."""
    idem = idempotency_key or f"release_materials_{job_id}_{uuid.uuid4().hex[:8]}"
    mat_wallet_acc = get_or_create_account(db, 'job', LedgerAccountKind.MATERIALS_WALLET, owner_id=job_id)
    pro_acc = get_or_create_account(db, 'pro', LedgerAccountKind.PRO_PAYABLE, owner_id=pro_user_id)

    entries = [
        {'account': mat_wallet_acc, 'direction': LedgerDirection.DEBIT, 'amount_kobo': amount_kobo},
        {'account': pro_acc, 'direction': LedgerDirection.CREDIT, 'amount_kobo': amount_kobo},
    ]
    return record_transaction(db, 'MATERIALS_RELEASED', job_id, idem, entries)

def refund_escrow(
    db: Session,
    job_id: int,
    amount_kobo: int,
    idempotency_key: Optional[str] = None
) -> LedgerTxn:
    """Escrow refund back to client clearing."""
    idem = idempotency_key or f"refund_escrow_{job_id}_{uuid.uuid4().hex[:8]}"
    escrow_acc = get_or_create_account(db, 'job', LedgerAccountKind.JOB_ESCROW, owner_id=job_id)
    gateway_acc = get_or_create_account(db, 'system', LedgerAccountKind.GATEWAY_CLEARING)

    entries = [
        {'account': escrow_acc, 'direction': LedgerDirection.DEBIT, 'amount_kobo': amount_kobo},
        {'account': gateway_acc, 'direction': LedgerDirection.CREDIT, 'amount_kobo': amount_kobo},
    ]
    return record_transaction(db, 'ESCROW_REFUNDED', job_id, idem, entries)
