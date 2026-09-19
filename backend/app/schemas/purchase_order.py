from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.schemas.extraction import FORBIDDEN_PRICING_FIELDS


class PurchaseOrderItemBase(BaseModel):
    item_number: int = 1
    part_number: Optional[str] = None
    drawing_number: Optional[str] = None
    part_name: str
    description: Optional[str] = None
    specification: Optional[str] = None
    quantity: Decimal = Decimal("1.00")
    unit: str = "PCS"
    material_id: Optional[str] = None
    material_grade: Optional[str] = None
    gross_weight_kg: Decimal = Decimal("0.000")
    net_weight_kg: Decimal = Decimal("0.000")
    scrap_weight_kg: Decimal = Decimal("0.000")
    process_id: Optional[str] = None
    process_name: Optional[str] = None
    machining_hours: Decimal = Decimal("0.00")
    setup_hours: Decimal = Decimal("0.00")
    confidence: Decimal = Decimal("1.00")
    review_flags: List[str] = Field(default_factory=list)

    @field_validator("review_flags", mode="before")
    @classmethod
    def ensure_list_review_flags(cls, v: Any) -> List[str]:
        if v is None:
            return []
        return v

    @property
    def process(self) -> Optional[str]:
        return self.process_name

    @property
    def material(self) -> Optional[str]:
        return self.material_grade

    @field_validator("quantity")
    @classmethod
    def validate_positive_quantity(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= Decimal("0"):
            raise ValueError("Line item quantity must be strictly greater than 0")
        return v

    @model_validator(mode="before")
    @classmethod
    def reject_pricing_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            found_forbidden = FORBIDDEN_PRICING_FIELDS.intersection(set(data.keys()))
            if found_forbidden:
                raise ValueError(
                    f"Purchase order item must not include pricing or rate fields: {sorted(found_forbidden)}"
                )
        return data


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItemUpdate(BaseModel):
    id: Optional[str] = None
    item_number: Optional[int] = None
    part_number: Optional[str] = None
    drawing_number: Optional[str] = None
    part_name: Optional[str] = None
    description: Optional[str] = None
    specification: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    material_id: Optional[str] = None
    material_grade: Optional[str] = None
    gross_weight_kg: Optional[Decimal] = None
    net_weight_kg: Optional[Decimal] = None
    scrap_weight_kg: Optional[Decimal] = None
    process_id: Optional[str] = None
    process_name: Optional[str] = None
    machining_hours: Optional[Decimal] = None
    setup_hours: Optional[Decimal] = None
    confidence: Optional[Decimal] = None
    review_flags: Optional[List[str]] = None

    @field_validator("quantity")
    @classmethod
    def validate_positive_quantity(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= Decimal("0"):
            raise ValueError("Line item quantity must be strictly greater than 0")
        return v

    @model_validator(mode="before")
    @classmethod
    def reject_pricing_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            found_forbidden = FORBIDDEN_PRICING_FIELDS.intersection(set(data.keys()))
            if found_forbidden:
                raise ValueError(
                    f"Purchase order item update must not include pricing or rate fields: {sorted(found_forbidden)}"
                )
        return data


class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: str
    purchase_order_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PurchaseOrderBase(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    supplier_name: Optional[str] = None
    po_number: str
    po_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    delivery_terms: Optional[str] = None
    payment_terms: Optional[str] = None
    inspection_clauses: Optional[str] = None
    general_notes: Optional[str] = None
    source_file_url: Optional[str] = None
    source_file_name: Optional[str] = None
    status: str = "NEEDS_REVIEW"
    extracted_data: Optional[Dict[str, Any]] = None
    raw_text: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def reject_pricing_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            found_forbidden = FORBIDDEN_PRICING_FIELDS.intersection(set(data.keys()))
            if found_forbidden:
                raise ValueError(
                    f"Purchase order must not include pricing or rate fields: {sorted(found_forbidden)}"
                )
        return data


class PurchaseOrderCreate(PurchaseOrderBase):
    items: Optional[List[PurchaseOrderItemCreate]] = []


class PurchaseOrderUpdate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    supplier_name: Optional[str] = None
    po_number: Optional[str] = None
    po_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    delivery_terms: Optional[str] = None
    payment_terms: Optional[str] = None
    inspection_clauses: Optional[str] = None
    general_notes: Optional[str] = None
    status: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    items: Optional[List[PurchaseOrderItemUpdate]] = None

    @model_validator(mode="before")
    @classmethod
    def reject_pricing_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            found_forbidden = FORBIDDEN_PRICING_FIELDS.intersection(set(data.keys()))
            if found_forbidden:
                raise ValueError(
                    f"Purchase order update must not include pricing or rate fields: {sorted(found_forbidden)}"
                )
        return data


class PurchaseOrderResponse(PurchaseOrderBase):
    id: str
    company_id: str
    review_status: str = "NEEDS_REVIEW"
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseOrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PurchaseOrderReviewResponse(PurchaseOrderResponse):
    """Dedicated review representation with review status and flags."""
    needs_human_review: bool = True
    review_flags: List[str] = Field(default_factory=list)


class PurchaseOrderApproveRequest(BaseModel):
    approval_notes: Optional[str] = None


class PurchaseOrderRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=1000)
