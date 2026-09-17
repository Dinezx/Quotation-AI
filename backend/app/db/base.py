"""Compatibility forwarding shim for app.core.database."""
from app.core.database import Base, TimestampMixin, generate_uuid

__all__ = ["Base", "TimestampMixin", "generate_uuid"]
