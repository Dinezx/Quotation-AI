from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class CustomerBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    quotation_email: Optional[str] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    gstin: Optional[str] = None
    is_active: bool = True

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    quotation_email: Optional[str] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    gstin: Optional[str] = None
    is_active: Optional[bool] = None

class CustomerCommunicationSettingsUpdate(BaseModel):
    quotation_email: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    company_id: str
    code: Optional[str] = None
    login_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerPaginationResponse(BaseModel):
    items: List[CustomerResponse]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(from_attributes=True)
