from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

class MaterialBase(BaseModel):
    name: str = Field(..., min_length=1, description="Material descriptive name")
    grade: str = Field(..., min_length=1, description="Material grade identifier e.g. EN8, SS304")
    density: Optional[Decimal] = Field(default=None, gt=Decimal("0.0000"), description="Density in g/cm3")
    unit: str = Field(default="kg", min_length=1, description="Pricing unit")
    base_rate: Decimal = Field(..., ge=Decimal("0.00"), description="Base raw material purchase rate per unit")
    scrap_credit_rate: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Scrap recovery credit per unit")
    is_active: bool = True

    @field_validator("name", "grade", mode="before")
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        if isinstance(v, str):
            v_clean = v.strip()
            if not v_clean:
                raise ValueError("String field cannot be empty or blank.")
            return v_clean
        return v

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    grade: Optional[str] = None
    density: Optional[Decimal] = Field(default=None, gt=Decimal("0.0000"))
    unit: Optional[str] = None
    base_rate: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))
    scrap_credit_rate: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))
    is_active: Optional[bool] = None

    @field_validator("name", "grade", mode="before")
    @classmethod
    def validate_non_empty_strings_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and isinstance(v, str):
            v_clean = v.strip()
            if not v_clean:
                raise ValueError("String field cannot be empty or blank.")
            return v_clean
        return v

class MaterialResponse(MaterialBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
