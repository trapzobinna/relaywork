import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.database import engine, Base
import app.models

from app.routers import auth, categories, pros, jobs, chat, payments, reviews, admin

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title='RelayWork API',
    description='Informal Skilled-Labor Marketplace Backend API',
    version='1.0.0',
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

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(pros.router)
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
