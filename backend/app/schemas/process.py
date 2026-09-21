from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

class ProcessBase(BaseModel):
    name: str = Field(..., min_length=1, description="Machine or process operation name")
    unit: str = Field(default="hour", min_length=1, description="Rate unit e.g. hour")
    hourly_rate: Decimal = Field(..., ge=Decimal("0.00"), description="Hourly machine/workstation rate in INR")
    setup_cost: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="One-time fixed setup cost in INR")
    is_active: bool = True

    @field_validator("name", mode="before")
    @classmethod
    def validate_non_empty_name(cls, v: str) -> str:
        if isinstance(v, str):
            v_clean = v.strip()
            if not v_clean:
                raise ValueError("Process name cannot be empty or blank.")
            return v_clean
        return v

class ProcessCreate(ProcessBase):
    pass

class ProcessUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    hourly_rate: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))
    setup_cost: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))
    is_active: Optional[bool] = None

    @field_validator("name", mode="before")
    @classmethod
    def validate_non_empty_name_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and isinstance(v, str):
            v_clean = v.strip()
            if not v_clean:
                raise ValueError("Process name cannot be empty or blank.")
            return v_clean
        return v

class ProcessResponse(ProcessBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
