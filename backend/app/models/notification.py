from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, DateTime, ForeignKey, Index
from app.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.user import User

class Notification(Base, TimestampMixin):
    """
    Authoritative workflow notification model.
    Strictly isolated by company_id (multi-tenant boundary).
    """
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_company_created", "company_id", "created_at"),
        Index("ix_notifications_company_read", "company_id", "read_at"),
        Index("ix_notifications_company_type_entity", "company_id", "type", "entity_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    severity: Mapped[str] = mapped_column(String(20), default="INFO", nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="notifications")
    user: Mapped[Optional["User"]] = relationship("User")

    @property
    def is_read(self) -> bool:
        return self.read_at is not None
