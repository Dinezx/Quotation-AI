"""
Canonical Purchase Order Extraction Schemas.

Provider-independent Pydantic v2 schemas representing structured information
extracted from manufacturer PO documents (PDF, TIFF, PNG, JPEG).

CRITICAL ARCHITECTURAL BOUNDARY:
AI/OCR is ONLY responsible for extracting and normalizing purchase-order data.
AI must NEVER:
- calculate quotation prices
- choose material rates or process rates
- determine overhead, profit, or GST
- generate the final selling price
"""
from datetime import date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# List of pricing fields strictly forbidden from AI extraction output
FORBIDDEN_PRICING_FIELDS = {
    "unit_price",
    "total_price",
    "price",
    "material_rate",
    "process_rate",
    "discount",
    "discount_percent",
    "overhead_percent",
    "profit_percent",
    "gst_rate",
    "cgst",
    "sgst",
    "igst",
    "tax_amount",
    "selling_price",
    "final_amount",
    "total_amount",
}


class ExtractedPOLineItem(BaseModel):
    """
    Canonical representation of an extracted PO line item.
    All pricing fields are strictly excluded.
    """
    item_number: Optional[int] = Field(default=1, ge=1)
    part_name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    specification: Optional[str] = Field(default=None, max_length=1000)
    drawing_number: Optional[str] = Field(default=None, max_length=100)
    material: Optional[str] = Field(default=None, max_length=100)
    material_grade: Optional[str] = Field(default=None, max_length=100)
    quantity: Optional[Decimal] = Field(default=None)
    unit: Optional[str] = Field(default="PCS", max_length=20)
    gross_weight_kg: Optional[Decimal] = Field(default=None)
    scrap_weight_kg: Optional[Decimal] = Field(default=None)
    machining_hours: Optional[Decimal] = Field(default=None)
    setup_hours: Optional[Decimal] = Field(default=None)
    process: Optional[str] = Field(default=None, max_length=100)
    requested_delivery_date: Optional[date] = None
    confidence: Optional[Decimal] = Field(default=Decimal("1.00"), ge=Decimal("0.00"), le=Decimal("1.00"))
    raw_text: Optional[str] = None
    review_flags: List[str] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")

    @field_validator("quantity")
    @classmethod
    def validate_positive_quantity(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= Decimal("0"):
            raise ValueError("Line item quantity must be strictly greater than 0")
        return v

    @field_validator("gross_weight_kg", "scrap_weight_kg")
    @classmethod
    def validate_non_negative_weight(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < Decimal("0"):
            raise ValueError("Weight cannot be negative")
        return v

    @field_validator("machining_hours", "setup_hours")
    @classmethod
    def validate_non_negative_hours(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < Decimal("0"):
            raise ValueError("Hours cannot be negative")
        return v


class ExtractionMetadata(BaseModel):
    """Metadata detailing the document source and extraction confidence."""
    source_document: Optional[str] = None
    page_number: Optional[int] = Field(default=None, ge=1)
    confidence: Optional[Decimal] = Field(default=Decimal("1.00"), ge=Decimal("0.00"), le=Decimal("1.00"))
    provider: str = "mock"
    raw_text: Optional[str] = None

    model_config = ConfigDict(extra="forbid")


class ExtractedPurchaseOrder(BaseModel):
    """
    Canonical provider-independent purchase order extraction document.
    Represents raw, unapproved AI/OCR findings before human review.
    """
    po_number: Optional[str] = Field(default=None, max_length=100)
    po_date: Optional[date] = None
    customer_name: Optional[str] = Field(default=None, max_length=255)
    customer_gstin: Optional[str] = Field(default=None, max_length=50)
    customer_email: Optional[str] = Field(default=None, max_length=255)
    customer_phone: Optional[str] = Field(default=None, max_length=50)
    billing_address: Optional[str] = Field(default=None, max_length=1000)
    shipping_address: Optional[str] = Field(default=None, max_length=1000)
    currency: Optional[str] = Field(default="INR", max_length=10)
    payment_terms: Optional[str] = Field(default=None, max_length=255)
    delivery_terms: Optional[str] = Field(default=None, max_length=255)
    validity_reference: Optional[str] = Field(default=None, max_length=255)
    items: List[ExtractedPOLineItem] = Field(default_factory=list)
    metadata: ExtractionMetadata = Field(default_factory=ExtractionMetadata)
    extraction_warnings: List[str] = Field(default_factory=list)
    review_flags: List[str] = Field(default_factory=list)
    needs_human_review: bool = False

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def reject_pricing_fields(cls, data: dict) -> dict:
        """Enforces that AI extraction output never includes commercial/pricing fields."""
        if isinstance(data, dict):
            found_forbidden = FORBIDDEN_PRICING_FIELDS.intersection(set(data.keys()))
            if found_forbidden:
                raise ValueError(
                    f"AI extraction must not generate pricing or rate fields: {sorted(found_forbidden)}"
                )
        return data
