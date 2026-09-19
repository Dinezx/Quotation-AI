from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from app.db.base import Base, TimestampMixin, generate_uuid

class PurchaseOrder(Base, TimestampMixin):
    __tablename__ = "purchase_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    po_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    po_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    source_file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    source_file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="NEEDS_REVIEW", nullable=False)
    supplier_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    delivery_terms: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    inspection_clauses: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    general_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL", onupdate="CASCADE"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    @property
    def review_status(self) -> str:
        return self.status

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="purchase_orders")
    customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="purchase_orders")
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by])
    items: Mapped[List["PurchaseOrderItem"]] = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    quotations: Mapped[List["Quotation"]] = relationship("Quotation", back_populates="purchase_order")
