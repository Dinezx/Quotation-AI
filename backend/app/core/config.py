import json
import os
from typing import List, Optional, Annotated
from pydantic import field_validator, ValidationInfo, Field
from pydantic_settings import BaseSettings, SettingsConfigDict, NoDecode

DEFAULT_DEV_CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

class Settings(BaseSettings):
    PROJECT_NAME: str = "Quotation AI Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./quotation_ai.db"
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if isinstance(v, str) and "your-project-ref" in v:
            return "sqlite:///./quotation_ai.db"
        return v

    # Supabase credentials (New JWT Signing Keys / JWKS & Secret Key architecture)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://hmnaquolktpeztopanja.supabase.co")
    SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))

    # JWKS Key Caching TTL
    JWKS_CACHE_TTL_SECONDS: int = 3600  # 1 hour cache

    # Supabase JWT Audience (standard Supabase access token audience is 'authenticated')
    SUPABASE_JWT_AUDIENCE: str = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")

    # Storage Configuration
    STORAGE_PROVIDER: str = os.getenv("STORAGE_PROVIDER", "supabase") # supabase, local
    QUOTATION_PDF_BUCKET: str = os.getenv("QUOTATION_PDF_BUCKET", "quotation-pdfs")

    # Email Configuration (Resend)
    EMAIL_PROVIDER: str = os.getenv("EMAIL_PROVIDER", "resend") # resend, fake
    RESEND_API_KEY: Optional[str] = os.getenv("RESEND_API_KEY", None)
    RESEND_FROM_EMAIL: Optional[str] = os.getenv("RESEND_FROM_EMAIL", None)
    RESEND_FROM_NAME: str = os.getenv("RESEND_FROM_NAME", "Quotation AI")

    # AI / OCR Extraction & Normalization Configuration
    PO_EXTRACTION_PROVIDER: str = os.getenv("PO_EXTRACTION_PROVIDER", "mock")
    PO_NORMALIZATION_PROVIDER: str = os.getenv("PO_NORMALIZATION_PROVIDER", "mock")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: Optional[str] = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", None)
    AZURE_DOCUMENT_INTELLIGENCE_KEY: Optional[str] = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY", None)

    # Environment & Deployment Mode
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development") # development, staging, production
    AZURE_FRONT_DOOR_ID: Optional[str] = os.getenv("AZURE_FRONT_DOOR_ID", None)
    RATELIMIT_ENABLED: bool = os.getenv("RATELIMIT_ENABLED", "true").lower() in ("true", "1", "yes")

    # CORS
    CORS_ORIGINS: Annotated[List[str], NoDecode] = Field(
        default_factory=lambda: [] if os.getenv("ENVIRONMENT", "").lower() == "production" else list(DEFAULT_DEV_CORS_ORIGINS),
        validate_default=True,
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v, info: ValidationInfo) -> List[str]:
        # 1. Parse string representation or iterable into a list of strings
        origins: List[str]
        if isinstance(v, str):
            v_clean = v.strip()
            if not v_clean:
                origins = []
            elif v_clean.startswith("[") or v_clean.endswith("]") or v_clean.startswith("{"):
                try:
                    parsed = json.loads(v_clean)
                except Exception as e:
                    raise ValueError(f"Malformed JSON for CORS_ORIGINS: {e}") from e
                if not isinstance(parsed, list):
                    raise ValueError("CORS_ORIGINS JSON must be a list of origin strings")
                origins = [str(item).strip() for item in parsed if str(item).strip()]
            else:
                # Comma-separated or single origin
                origins = [item.strip() for item in v_clean.split(",") if item.strip()]
        elif isinstance(v, (list, tuple, set)):
            origins = [str(item).strip() for item in v if str(item).strip()]
        elif v is None:
            origins = []
        else:
            raise ValueError(f"Invalid CORS_ORIGINS type: {type(v)}")

        # 2. Determine environment
        env = None
        if info and info.data:
            env = info.data.get("ENVIRONMENT")
        if env is None:
            env = os.getenv("ENVIRONMENT", "development")
        is_production = (env or "").lower() == "production"

        cleaned_origins: List[str] = []
        for origin in origins:
            # Reject wildcard in production
            if origin == "*" or "*" in origin:
                if is_production:
                    raise ValueError("Wildcard CORS ('*') is strictly forbidden in production")
                cleaned_origins.append(origin)
                continue

            # Check valid URL format
            if not (origin.startswith("http://") or origin.startswith("https://")):
                raise ValueError(f"Invalid CORS origin '{origin}': must start with http:// or https://")

            # Reject localhost/loopback in production
            origin_lower = origin.lower()
            if "localhost" in origin_lower or "127.0.0.1" in origin_lower or "0.0.0.0" in origin_lower:
                if is_production:
                    raise ValueError(f"Localhost/loopback origin '{origin}' is strictly forbidden in production")

            # Remove trailing slash for consistent origin matching
            cleaned_origins.append(origin.rstrip("/"))

        return cleaned_origins

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
