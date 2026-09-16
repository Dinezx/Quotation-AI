from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Numeric, Boolean, ForeignKey
from app.db.base import Base, TimestampMixin, generate_uuid

class Material(Base, TimestampMixin):
    __tablename__ = "materials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    grade: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    density: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True) # g/cm3
    unit: Mapped[str] = mapped_column(String(20), default="kg", nullable=False)
    base_rate: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False) # INR / unit
    scrap_credit_rate: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False) # INR / unit
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="materials")
