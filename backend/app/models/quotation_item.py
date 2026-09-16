from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Numeric, Integer, ForeignKey
from app.db.base import Base, TimestampMixin, generate_uuid

class QuotationItem(Base, TimestampMixin):
    __tablename__ = "quotation_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    quotation_id: Mapped[str] = mapped_column(String(36), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    purchase_order_item_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("purchase_order_items.id", ondelete="SET NULL"), nullable=True)
    item_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    part_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=1, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="PCS", nullable=False)
    
    # Financial breakdown per item
    gross_material_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    scrap_credit: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    net_material_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    
    machining_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    setup_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    process_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)

    # Relationships
    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="items")
    purchase_order_item: Mapped[Optional["PurchaseOrderItem"]] = relationship("PurchaseOrderItem")
