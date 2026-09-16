from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict

class ProcessBase(BaseModel):
    name: str
    unit: str = "hour"
    hourly_rate: Decimal
    setup_cost: Decimal = Decimal("0.00")
    is_active: bool = True

class ProcessCreate(ProcessBase):
    pass

class ProcessUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    setup_cost: Optional[Decimal] = None
    is_active: Optional[bool] = None

class ProcessResponse(ProcessBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
