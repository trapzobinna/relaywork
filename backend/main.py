import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.database import engine, Base
import app.models

from app.routers import auth, categories, pros, jobs, chat, payments, reviews, admin, portfolio
from seed import seed as run_seed

Base.metadata.create_all(bind=engine)

def run_migrations():
    try:
        with engine.connect() as conn:
            if engine.dialect.name == 'sqlite':
                raw_conn = conn.connection
                cursor = raw_conn.cursor()
                def add_col(table, col, col_def):
                    cursor.execute(f"PRAGMA table_info({table})")
                    cols = [r[1] for r in cursor.fetchall()]
                    if cols and col not in cols:
                        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
                        raw_conn.commit()
                add_col('pro_profiles', 'is_available', 'BOOLEAN DEFAULT 1 NOT NULL')
                add_col('jobs', 'is_en_route', 'BOOLEAN DEFAULT 0 NOT NULL')
                add_col('jobs', 'has_arrived', 'BOOLEAN DEFAULT 0 NOT NULL')
                add_col('jobs', 'last_location_updated_at', 'DATETIME')
            else:
                from sqlalchemy import text
                conn.execute(text("ALTER TABLE pro_profiles ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE NOT NULL;"))
                conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_en_route BOOLEAN DEFAULT FALSE NOT NULL;"))
                conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS has_arrived BOOLEAN DEFAULT FALSE NOT NULL;"))
                conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMP;"))
                conn.commit()
    except Exception as e:
        print(f"[Migration] Warning: migration step encountered: {e}")

run_migrations()

# Auto-seed on startup — safe to run every time (all inserts are idempotent)
try:
    run_seed()
except Exception as e:
    print(f'[Seed] Warning: seed step failed — {e}')


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
app.include_router(portfolio.router)

@app.get('/api/health', tags=['Health'])
def health_check():
    return {
        'status': 'healthy',
        'project': settings.PROJECT_NAME,
        'commission_percent': settings.PLATFORM_COMMISSION_PERCENT,
        'paystack_mode': 'mock' if settings.PAYSTACK_MOCK_MODE else 'live'
    }
