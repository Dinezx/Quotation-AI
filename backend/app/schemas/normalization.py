"""
Pydantic schemas for Gemini Semantic Normalization.

Enforces strict structural constraints and anti-pricing validation.
Zero commercial or pricing fields are permitted in these models.
"""
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.extraction import FORBIDDEN_PRICING_FIELDS


class GeminiNormalizedLineItem(BaseModel):
    """
    Structured normalized line item extracted by Gemini.
    Strictly forbids extra fields and pricing attributes.
    """
    item_number: Optional[int] = Field(default=None, description="Line item sequential number")
    part_name: Optional[str] = Field(default=None, description="Part name / component title")
    description: Optional[str] = Field(default=None, description="Detailed component description")
    specification: Optional[str] = Field(default=None, description="Technical / material specification")
    drawing_number: Optional[str] = Field(default=None, description="Engineering drawing / part number")
    material: Optional[str] = Field(default=None, description="Base material (e.g. EN8, SS304, Mild Steel)")
    material_grade: Optional[str] = Field(default=None, description="Material grade or classification")
    quantity: Optional[float] = Field(default=None, description="Quantity required (must be positive)")
    unit: Optional[str] = Field(default="PCS", description="Unit of measurement (PCS, NOS, KG, etc.)")
    gross_weight_kg: Optional[float] = Field(default=None, description="Gross weight per piece in kg")
    scrap_weight_kg: Optional[float] = Field(default=None, description="Scrap weight per piece in kg")
    machining_hours: Optional[float] = Field(default=None, description="Machining hours ONLY if explicitly stated")
    setup_hours: Optional[float] = Field(default=None, description="Setup hours ONLY if explicitly stated")
    process: Optional[str] = Field(
        default=None,
        description="Manufacturing process ONLY if explicitly stated in the PO. If not explicitly specified, MUST be null."
    )
    requested_delivery_date: Optional[str] = Field(default=None, description="Requested delivery date in YYYY-MM-DD format if stated")

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def reject_pricing_keys(cls, data: dict) -> dict:
        if isinstance(data, dict):
            forbidden = FORBIDDEN_PRICING_FIELDS.intersection(set(data.keys()))
            if forbidden:
                raise ValueError(f"Line item contains forbidden pricing fields: {sorted(forbidden)}")
        return data


class GeminiNormalizedPurchaseOrder(BaseModel):
    """
    Structured normalized purchase order response schema for Gemini.
    Strictly separates Customer/Buyer from Supplier/Vendor and quality instructions.
    Rejects any unexpected or pricing-related keys.
    """
    po_number: Optional[str] = Field(default=None, description="Purchase order identifier")
    po_date: Optional[str] = Field(default=None, description="Purchase order date in YYYY-MM-DD format")
    customer_name: Optional[str] = Field(
        default=None,
        description="Legal/commercial name of the Customer/Buyer organization issuing the PO"
    )
    customer_gstin: Optional[str] = Field(default=None, description="GSTIN of the customer/buyer")
    customer_email: Optional[str] = Field(default=None, description="Customer contact email")
    customer_phone: Optional[str] = Field(default=None, description="Customer contact phone number")
    supplier_name: Optional[str] = Field(
        default=None,
        description="Name of the supplier / vendor receiving the PO (e.g. Bharat Precision Engineers)"
    )
    billing_address: Optional[str] = Field(default=None, description="Customer billing address")
    shipping_address: Optional[str] = Field(default=None, description="Consignee / delivery location address")
    payment_terms: Optional[str] = Field(default=None, description="Commercial payment terms (e.g. 30 Days Net)")
    delivery_terms: Optional[str] = Field(default=None, description="Delivery terms (e.g. Door Delivery)")
    inspection_instructions: Optional[str] = Field(
        default=None,
        description="Quality or inspection instructions (e.g. 'inspection before dispatch'). NEVER place this into customer_name."
    )
    general_notes: Optional[str] = Field(default=None, description="General notes, scope, or terms from the document")
    items: List[GeminiNormalizedLineItem] = Field(
        default_factory=list,
        description="Normalized list of PO line items"
    )

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def reject_pricing_keys(cls, data: dict) -> dict:
        if isinstance(data, dict):
            forbidden = FORBIDDEN_PRICING_FIELDS.intersection(set(data.keys()))
            if forbidden:
                raise ValueError(f"Normalized PO contains forbidden pricing fields: {sorted(forbidden)}")
        return data


def sanitize_schema_for_gemini(schema: Any) -> Any:
    """
    Recursively strips schema keywords unsupported by the Gemini API
    (such as 'additionalProperties' and 'additional_properties') from a JSON schema dictionary.
    Preserves all supported properties, types, items, descriptions, and structural constraints.
    """
    if isinstance(schema, dict):
        sanitized = {}
        for key, value in schema.items():
            if key in ("additionalProperties", "additional_properties"):
                continue
            sanitized[key] = sanitize_schema_for_gemini(value)
        return sanitized
    elif isinstance(schema, list):
        return [sanitize_schema_for_gemini(item) for item in schema]
    return schema


def get_gemini_normalized_po_schema() -> dict:
    """
    Generates the Gemini-compatible JSON schema for GeminiNormalizedPurchaseOrder.
    Keeps application-side Pydantic models strictly configured with extra='forbid',
    while producing a sanitized schema dictionary without 'additionalProperties'
    to satisfy the Gemini API endpoint.
    """
    raw_schema = GeminiNormalizedPurchaseOrder.model_json_schema()
    return sanitize_schema_for_gemini(raw_schema)
