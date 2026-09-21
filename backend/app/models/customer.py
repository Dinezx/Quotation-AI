from typing import List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Boolean, ForeignKey, Index
from app.db.base import Base, TimestampMixin, generate_uuid

class Customer(Base, TimestampMixin):
    __tablename__ = "customers"
    __table_args__ = (
        Index("ix_customers_company_active", "company_id", "is_active"),
        Index("ix_customers_company_gstin", "company_id", "gstin"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    quotation_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    billing_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    shipping_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    @property
    def login_email(self) -> Optional[str]:
        """Returns the customer authentication/account login email."""
        return self.email

    @property
    def code(self) -> str:
        """Returns a deterministic customer reference code."""
        return f"CUST-{self.id[:6].upper()}"

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="customers")
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="customer")
    quotations: Mapped[List["Quotation"]] = relationship("Quotation", back_populates="customer")
