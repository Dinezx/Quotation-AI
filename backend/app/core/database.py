from typing import Generator
from datetime import datetime
import uuid
from sqlalchemy import create_engine, DateTime, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, Session
from app.core.config import settings

class Base(DeclarativeBase):
    """Declarative base class for all database models."""
    pass

class TimestampMixin:
    """Reusable audit timestamps for all business models."""
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow, 
        nullable=False
    )

def generate_uuid() -> str:
    return str(uuid.uuid4())

connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
    "pool_size": 25,
    "max_overflow": 25,
    "pool_timeout": 30,
}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    # Sized for concurrent multi-user load against Supabase transaction pooler (port 6543)
    engine_kwargs["pool_recycle"] = 1800

engine_kwargs["connect_args"] = connect_args

engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """Database session generator dependency with auto-closing lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
