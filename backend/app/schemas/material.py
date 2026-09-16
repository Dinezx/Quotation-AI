from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict

class MaterialBase(BaseModel):
    name: str
    grade: str
    density: Optional[Decimal] = None
    unit: str = "kg"
    base_rate: Decimal
    scrap_credit_rate: Decimal = Decimal("0.00")
    is_active: bool = True

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    grade: Optional[str] = None
    density: Optional[Decimal] = None
    unit: Optional[str] = None
    base_rate: Optional[Decimal] = None
    scrap_credit_rate: Optional[Decimal] = None
    is_active: Optional[bool] = None

class MaterialResponse(MaterialBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
