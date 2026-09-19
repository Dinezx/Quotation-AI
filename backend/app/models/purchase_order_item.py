from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Numeric, Integer, ForeignKey, JSON
from app.db.base import Base, TimestampMixin, generate_uuid

class PurchaseOrderItem(Base, TimestampMixin):
    __tablename__ = "purchase_order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    purchase_order_id: Mapped[str] = mapped_column(String(36), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    item_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    part_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    drawing_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    part_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    specification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=1, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="PCS", nullable=False)
    
    # Material link / specs
    material_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("materials.id", ondelete="SET NULL"), nullable=True)
    material_grade: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gross_weight_kg: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=0.000, nullable=False)
    net_weight_kg: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=0.000, nullable=False)
    scrap_weight_kg: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=0.000, nullable=False)
    
    # Process link / specs
    process_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("processes.id", ondelete="SET NULL"), nullable=True)
    process_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    machining_hours: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    setup_hours: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    
    confidence: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=1.00, nullable=False)
    review_flags: Mapped[Optional[list]] = mapped_column(JSON, default=list, nullable=True)

    @property
    def process(self) -> Optional[str]:
        return self.process_name

    @property
    def material(self) -> Optional[str]:
        return self.material_grade

    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="items")
    material: Mapped[Optional["Material"]] = relationship("Material")
    process: Mapped[Optional["Process"]] = relationship("Process")
