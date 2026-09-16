from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class PurchaseOrderItemBase(BaseModel):
    item_number: int = 1
    part_number: Optional[str] = None
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

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemUpdate(BaseModel):
    part_number: Optional[str] = None
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

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: str
    purchase_order_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderBase(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    po_number: str
    po_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    source_file_url: Optional[str] = None
    source_file_name: Optional[str] = None
    status: str = "UPLOADED"
    extracted_data: Optional[Dict[str, Any]] = None
    raw_text: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: Optional[List[PurchaseOrderItemCreate]] = []

class PurchaseOrderUpdate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    po_number: Optional[str] = None
    po_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    status: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None

class PurchaseOrderResponse(PurchaseOrderBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseOrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
