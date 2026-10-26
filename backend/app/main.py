import os
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from jose import jwt, JWTError

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.database import engine, Base, SessionLocal
import app.models
from app.models import User
from app.services.telemetry import telemetry_service

from app.routers import (
    auth, categories, pros, jobs, chat, payments,
    reviews, admin, portfolio, pricing, quotes
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title='RelayWork API',
    description='Informal Skilled-Labor Marketplace Backend API with Structured Quoting & Telemetry Intelligence',
    version='2.1.0',
    docs_url='/docs',
    redoc_url='/redoc'
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [
    settings.FRONTEND_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Telemetry & Real-Time Performance Middleware
@app.middleware('http')
async def telemetry_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    # Add header for frontend/client inspection
    response.headers['X-Response-Time-Ms'] = f"{elapsed_ms:.2f}"

    # Extract client IP
    forwarded = request.headers.get('x-forwarded-for')
    if forwarded:
        client_ip = forwarded.split(',')[0].strip()
    else:
        client_ip = request.headers.get('x-real-ip') or (request.client.host if request.client else '127.0.0.1')

    # Try optional user identity detection without blocking
    user = None
    auth_header = request.headers.get('authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get('sub')
            if user_id:
                db_temp = SessionLocal()
                try:
                    user = db_temp.query(User).filter(User.id == int(user_id)).first()
                finally:
                    db_temp.close()
        except Exception:
            pass

    # Record telemetry asynchronously
    user_agent = request.headers.get('user-agent')
    db_session = SessionLocal()
    try:
        telemetry_service.record_request(
            db=db_session,
            ip_address=client_ip,
            path=request.url.path,
            method=request.method,
            status_code=response.status_code,
            response_time_ms=elapsed_ms,
            user_agent=user_agent,
            user=user
        )
    except Exception:
        pass
    finally:
        db_session.close()

    return response

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(pros.router)
app.include_router(portfolio.router)
app.include_router(pricing.router)
app.include_router(quotes.router)
app.include_router(jobs.router)
app.include_router(chat.router)
app.include_router(payments.router)
app.include_router(reviews.router)
app.include_router(admin.router)

@app.get('/api/health', tags=['Health'])
def health_check():
    return {
        'status': 'healthy',
        'project': settings.PROJECT_NAME,
        'commission_percent': settings.PLATFORM_COMMISSION_PERCENT,
        'paystack_mode': 'mock' if settings.PAYSTACK_MOCK_MODE else 'live'
    }
