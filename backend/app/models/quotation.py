from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, DateTime, Numeric, ForeignKey
from app.db.base import Base, TimestampMixin, generate_uuid

class Quotation(Base, TimestampMixin):
    __tablename__ = "quotations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    purchase_order_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("purchase_orders.id", ondelete="SET NULL"), nullable=True)
    
    quotation_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    quotation_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    
    # Financial breakdown
    material_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    process_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    
    overhead_percentage: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=10.00, nullable=False)
    overhead_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    
    profit_percentage: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=15.00, nullable=False)
    profit_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    
    taxable_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    
    # Statutory GST
    gst_type: Mapped[str] = mapped_column(String(20), default="CGST_SGST", nullable=False) # CGST_SGST, IGST, EXEMPT
    cgst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=9.00, nullable=False)
    cgst_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    sgst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=9.00, nullable=False)
    sgst_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    igst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=18.00, nullable=False)
    igst_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    gst_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    
    final_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_storage_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pdf_generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    pdf_sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finalized_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    delivery_terms: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    inspection_terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prepared_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    authorized_signatory: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="quotations")
    customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="quotations")
    purchase_order: Mapped[Optional["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="quotations")
    items: Mapped[List["QuotationItem"]] = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")

    # Presentation helper properties
    @property
    def customer_name(self) -> Optional[str]:
        if self.customer:
            return self.customer.name
        if self.purchase_order:
            return self.purchase_order.customer_name
        return None

    @property
    def customer_address(self) -> Optional[str]:
        if self.customer:
            return self.customer.billing_address or self.customer.shipping_address
        return None

    @property
    def customer_gstin(self) -> Optional[str]:
        return self.customer.gstin if self.customer else None

    @property
    def po_number(self) -> Optional[str]:
        return self.purchase_order.po_number if self.purchase_order else None

    @property
    def po_date(self) -> Optional[datetime]:
        return self.purchase_order.po_date if self.purchase_order else None

    @property
    def company_name(self) -> Optional[str]:
        return self.company.name if self.company else None

    @property
    def company_legal_name(self) -> Optional[str]:
        return self.company.legal_name if self.company else None

    @property
    def company_address(self) -> Optional[str]:
        return self.company.address if self.company else None

    @property
    def company_gstin(self) -> Optional[str]:
        return self.company.gstin if self.company else None

    @property
    def company_phone(self) -> Optional[str]:
        return self.company.phone if self.company else None

    @property
    def company_email(self) -> Optional[str]:
        return self.company.email if self.company else None

    @property
    def bank_details(self) -> Optional[dict]:
        return self.company.settings if (self.company and isinstance(self.company.settings, dict)) else None

    @property
    def amount_in_words(self) -> Optional[str]:
        if self.final_total is not None:
            from app.services.calculation.calculation_service import number_to_indian_words
            return number_to_indian_words(int(self.final_total))
        return None
