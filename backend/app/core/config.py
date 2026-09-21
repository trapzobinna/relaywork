from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = 'RelayWork API'
    DATABASE_URL: str = 'sqlite:///./relaywork.db'
    JWT_SECRET: str = 'demo_jwt_secret_key_relaywork_super_safe_32_chars_long'
    JWT_ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    PLATFORM_COMMISSION_PERCENT: float = 15.0

    PAYSTACK_SECRET_KEY: str = ''
    PAYSTACK_PUBLIC_KEY: str = ''
    PAYSTACK_MOCK_MODE: bool = True

    FRONTEND_ORIGIN: str = 'http://localhost:5173'
    ADMIN_BOOTSTRAP_TOKEN: str = 'relaywork_bootstrap_secure_token_2026'

    UPLOAD_DIR: str = './uploads'

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

settings = Settings()
