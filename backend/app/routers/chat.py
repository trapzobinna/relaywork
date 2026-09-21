import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db, SessionLocal
from app.core.security import decode_token
from app.core.deps import get_current_user
from app.models import User, Job, Message, UserRole
from app.schemas import MessageOut, MessageCreate
from app.services.chat_manager import manager

router = APIRouter(tags=['Chat'])

def utcnow():
    return datetime.now(timezone.utc)

@router.get('/api/jobs/{id}/messages', response_model=List[MessageOut])
def get_job_messages(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    if current_user.role != UserRole.ADMIN and job.client_id != current_user.id and job.pro_id != current_user.id:
        raise HTTPException(status_code=403, detail='You do not have permission to view messages for this job')

    messages = db.query(Message).filter(Message.job_id == id).order_by(Message.sent_at.asc()).all()
    return [
        MessageOut(
            id=m.id,
            job_id=m.job_id,
            sender_id=m.sender_id,
            sender_name=m.sender.full_name if m.sender else 'User',
            content=m.content,
            sent_at=m.sent_at,
            read_at=m.read_at
        )
        for m in messages
    ]

@router.websocket('/ws/jobs/{job_id}/chat')
@router.websocket('/api/chat/ws/{job_id}')
async def websocket_chat_endpoint(
    websocket: WebSocket,
    job_id: int,
    token: str = Query(...)
):
    payload = decode_token(token)
    if not payload or payload.get('type') != 'access':
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload.get('sub')
    user_role = payload.get('role')

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        job = db.query(Job).filter(Job.id == job_id).first()

        if not user or not job or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        if user_role != UserRole.ADMIN.value and job.client_id != user.id and job.pro_id != user.id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(job_id, websocket)

        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                content = data.get('content', '').strip()
            except Exception:
                content = raw_text.strip()

            if not content:
                continue

            msg = Message(
                job_id=job_id,
                sender_id=user.id,
                content=content,
                sent_at=utcnow()
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)

            broadcast_payload = {
                'id': msg.id,
                'job_id': msg.job_id,
                'sender_id': msg.sender_id,
                'sender_name': user.full_name,
                'content': msg.content,
                'sent_at': msg.sent_at.isoformat()
            }
            await manager.broadcast_to_job(job_id, broadcast_payload)

    except WebSocketDisconnect:
        manager.disconnect(job_id, websocket)
    except Exception:
        manager.disconnect(job_id, websocket)
    finally:
        db.close()
