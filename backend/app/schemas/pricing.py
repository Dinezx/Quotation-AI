from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CalculationIssue(BaseModel):
    item_id: Optional[str] = None
    item_number: Optional[int] = None
    part_name: Optional[str] = None
    code: str
    message: str


class RateMatchItemResult(BaseModel):
    item_id: Optional[str] = None
    item_number: int = 1
    part_name: str
    material: Optional[str] = None
    material_rate: Optional[Decimal] = None
    scrap_credit_rate: Optional[Decimal] = None
    process: Optional[str] = None
    process_rate: Optional[Decimal] = None
    setup_cost: Optional[Decimal] = None
    quantity: Decimal = Decimal("1.00")
    unit: str = "PCS"
    gross_weight_kg: Decimal = Decimal("0.000")
    scrap_weight_kg: Decimal = Decimal("0.000")
    machining_hours: Decimal = Decimal("0.00")
    setup_hours: Decimal = Decimal("0.00")
    rate_match_status: str = "MATCHED"  # MATCHED | RATE_MISSING | PROCESS_MISSING | PROCESS_RATE_MISSING | WEIGHT_MISSING
    rate_match_messages: List[str] = []

    # Financial calculation fields (populated when status == SUCCESS)
    gross_material_cost: Optional[Decimal] = None
    scrap_credit: Optional[Decimal] = None
    net_material_cost: Optional[Decimal] = None
    machining_cost: Optional[Decimal] = None
    process_cost: Optional[Decimal] = None
    subtotal: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class POCalculateRequest(BaseModel):
    overhead_percentage: Decimal = Decimal("10.00")
    profit_percentage: Decimal = Decimal("15.00")
    gst_type: str = "CGST_SGST"  # CGST_SGST, IGST, EXEMPT
    persist_draft: bool = True  # If True, stores calculation as a draft Quotation


class POCalculateResponse(BaseModel):
    status: str  # SUCCESS | BLOCKED
    purchase_order_id: str
    po_number: str
    customer_name: Optional[str] = None
    currency: str = "INR"
    issues: List[CalculationIssue] = []
    items: List[RateMatchItemResult] = []

    # Financial summary (populated when status == SUCCESS)
    manufacturing_subtotal: Optional[Decimal] = None
    material_cost: Optional[Decimal] = None
    process_cost: Optional[Decimal] = None
    overhead_percentage: Optional[Decimal] = None
    overhead_amount: Optional[Decimal] = None
    assessable_amount: Optional[Decimal] = None
    profit_percentage: Optional[Decimal] = None
    profit_amount: Optional[Decimal] = None
    taxable_amount: Optional[Decimal] = None
    gst_type: Optional[str] = None
    cgst_rate: Optional[Decimal] = None
    cgst_amount: Optional[Decimal] = None
    sgst_rate: Optional[Decimal] = None
    sgst_amount: Optional[Decimal] = None
    igst_rate: Optional[Decimal] = None
    igst_amount: Optional[Decimal] = None
    gst_amount: Optional[Decimal] = None
    grand_total: Optional[Decimal] = None
    final_total_in_words: Optional[str] = None
    quotation_id: Optional[str] = None
    quotation_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

