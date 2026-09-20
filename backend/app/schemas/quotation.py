from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class QuotationItemBase(BaseModel):
    purchase_order_item_id: Optional[str] = None
    item_number: int = 1
    part_name: str
    specification: Optional[str] = None
    drawing_number: Optional[str] = None
    material: Optional[str] = None
    process: Optional[str] = None
    quantity: Decimal = Decimal("1.00")
    unit: str = "PCS"
    gross_material_cost: Decimal = Decimal("0.00")
    scrap_credit: Decimal = Decimal("0.00")
    net_material_cost: Decimal = Decimal("0.00")
    machining_cost: Decimal = Decimal("0.00")
    setup_cost: Decimal = Decimal("0.00")
    process_cost: Decimal = Decimal("0.00")
    subtotal: Decimal = Decimal("0.00")
    unit_cost: Decimal = Decimal("0.00")
    unit_price: Decimal = Decimal("0.00")
    total_price: Decimal = Decimal("0.00")

class QuotationItemCreate(QuotationItemBase):
    pass

class QuotationItemResponse(QuotationItemBase):
    id: str
    quotation_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class QuotationBase(BaseModel):
    customer_id: Optional[str] = None
    purchase_order_id: Optional[str] = None
    quotation_number: str
    quotation_date: datetime = Field(default_factory=datetime.now)
    valid_until: Optional[datetime] = None
    currency: str = "INR"
    material_cost: Decimal = Decimal("0.00")
    process_cost: Decimal = Decimal("0.00")
    subtotal: Decimal = Decimal("0.00")
    overhead_percentage: Decimal = Decimal("10.00")
    overhead_amount: Decimal = Decimal("0.00")
    profit_percentage: Decimal = Decimal("15.00")
    profit_amount: Decimal = Decimal("0.00")
    taxable_amount: Decimal = Decimal("0.00")
    gst_type: str = "CGST_SGST" # CGST_SGST, IGST, EXEMPT
    cgst_rate: Decimal = Decimal("9.00")
    cgst_amount: Decimal = Decimal("0.00")
    sgst_rate: Decimal = Decimal("9.00")
    sgst_amount: Decimal = Decimal("0.00")
    igst_rate: Decimal = Decimal("18.00")
    igst_amount: Decimal = Decimal("0.00")
    gst_amount: Decimal = Decimal("0.00")
    final_total: Decimal = Decimal("0.00")
    status: str = "DRAFT"
    pdf_url: Optional[str] = None
    pdf_storage_path: Optional[str] = None
    pdf_file_name: Optional[str] = None
    pdf_generated_at: Optional[datetime] = None
    pdf_sha256: Optional[str] = None
    finalized_at: Optional[datetime] = None
    finalized_by: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    inspection_terms: Optional[str] = None
    prepared_by: Optional[str] = None
    authorized_signatory: Optional[str] = None

class QuotationCreate(QuotationBase):
    items: Optional[List[QuotationItemCreate]] = []

class QuotationUpdate(BaseModel):
    valid_until: Optional[datetime] = None
    overhead_percentage: Optional[Decimal] = None
    profit_percentage: Optional[Decimal] = None
    gst_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    inspection_terms: Optional[str] = None
    prepared_by: Optional[str] = None
    authorized_signatory: Optional[str] = None

class QuotationResponse(QuotationBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime
    items: List[QuotationItemResponse] = []

    # Presentation fields
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    customer_gstin: Optional[str] = None
    po_number: Optional[str] = None
    po_date: Optional[datetime] = None
    amount_in_words: Optional[str] = None
    company_name: Optional[str] = None
    company_legal_name: Optional[str] = None
    company_address: Optional[str] = None
    company_gstin: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    bank_details: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)

class QuotationPaginationResponse(BaseModel):
    items: List[QuotationResponse]
    total: int
    page: int
    page_size: int


# Calculation Engine Input Models
class CalculateItemInput(BaseModel):
    id: Optional[str] = None
    purchase_order_item_id: Optional[str] = None
    item_number: int = 1
    part_name: str
    specification: Optional[str] = None
    drawing_number: Optional[str] = None
    material: Optional[str] = None
    process: Optional[str] = None
    quantity: Decimal = Decimal("1.00")
    unit: str = "PCS"
    
    # Material inputs
    gross_weight_kg: Decimal = Decimal("0.000")
    scrap_weight_kg: Decimal = Decimal("0.000")
    material_base_rate: Decimal = Decimal("0.00") # INR per kg
    scrap_credit_rate: Decimal = Decimal("0.00")  # INR per kg
    
    # Process inputs
    machining_hours: Decimal = Decimal("0.00")
    machine_hourly_rate: Decimal = Decimal("0.00") # INR per hr
    setup_cost: Decimal = Decimal("0.00")          # INR fixed setup

class CalculateQuotationRequest(BaseModel):
    items: List[CalculateItemInput]
    overhead_percentage: Decimal = Decimal("10.00")
    profit_percentage: Decimal = Decimal("15.00")
    gst_type: str = "CGST_SGST" # CGST_SGST, IGST, EXEMPT
