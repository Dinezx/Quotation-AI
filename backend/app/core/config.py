import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Quotation AI Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./quotation_ai.db"
    )

    # Supabase credentials (New JWT Signing Keys / JWKS & Secret Key architecture)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://hmnaquolktpeztopanja.supabase.co")
    SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))

    # JWKS Key Caching TTL
    JWKS_CACHE_TTL_SECONDS: int = 3600  # 1 hour cache

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @property
    def SUPABASE_JWKS_URL(self) -> str:
        base = self.SUPABASE_URL.rstrip("/")
        return f"{base}/auth/v1/.well-known/jwks.json"

    @property
    def SUPABASE_JWT_ISSUER(self) -> str:
        base = self.SUPABASE_URL.rstrip("/")
        return f"{base}/auth/v1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )

settings = Settings()
