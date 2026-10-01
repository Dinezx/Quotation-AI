from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

VALID_RATE_BASES = [
    "Per KG",
    "Per Piece",
    "Per Meter",
    "Per Litre",
    "Per Batch",
    "Per Hour",
    "Per Minute",
    "Per Operation",
    "Fixed",
    "Percentage",
]

RATE_BASIS_NORMALIZE = {b.lower(): b for b in VALID_RATE_BASES}

class ProcessBase(BaseModel):
    name: str = Field(..., min_length=1, description="Cost component / process operation name")
    unit: str = Field(default="hour", min_length=1, description="Rate unit e.g. hour, pcs, kg, meter")
    hourly_rate: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"), description="Component rate in INR")
    rate: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"), description="Component rate in INR (alias for hourly_rate)")
    rate_basis: Optional[str] = Field(default="Per Hour", description="Cost component rate basis")
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

    @field_validator("rate_basis", mode="before")
    @classmethod
    def validate_rate_basis(cls, v: Optional[str]) -> str:
        if not v:
            return "Per Hour"
        v_clean = v.strip().lower()
        if v_clean in RATE_BASIS_NORMALIZE:
            return RATE_BASIS_NORMALIZE[v_clean]
        return v.strip()

    @model_validator(mode="after")
    def sync_rate_and_hourly_rate(self) -> "ProcessBase":
        if self.hourly_rate is None and self.rate is not None:
            self.hourly_rate = self.rate
        elif self.rate is None and self.hourly_rate is not None:
            self.rate = self.hourly_rate
        elif self.hourly_rate is None and self.rate is None:
            raise ValueError("Rate must be specified for cost component.")
        return self

class ProcessCreate(ProcessBase):
    pass

class ProcessUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    hourly_rate: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))
    rate: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))
    rate_basis: Optional[str] = None
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

    @field_validator("rate_basis", mode="before")
    @classmethod
    def validate_rate_basis_update(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_clean = v.strip().lower()
        if v_clean in RATE_BASIS_NORMALIZE:
            return RATE_BASIS_NORMALIZE[v_clean]
        return v.strip()

    @model_validator(mode="after")
    def sync_rate_and_hourly_rate_update(self) -> "ProcessUpdate":
        if self.hourly_rate is None and self.rate is not None:
            self.hourly_rate = self.rate
        elif self.rate is None and self.hourly_rate is not None:
            self.rate = self.hourly_rate
        return self

class ProcessResponse(BaseModel):
    id: str
    company_id: str
    name: str
    unit: str
    hourly_rate: Decimal
    rate: Decimal
    rate_basis: str = "Per Hour"
    setup_cost: Decimal = Decimal("0.00")
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def populate_rate_fields(cls, data: any) -> any:
        if hasattr(data, "hourly_rate"):
            hr = getattr(data, "hourly_rate", Decimal("0.00"))
            rb = getattr(data, "rate_basis", None) or "Per Hour"
            sc = getattr(data, "setup_cost", Decimal("0.00"))
            return {
                "id": data.id,
                "company_id": data.company_id,
                "name": data.name,
                "unit": data.unit or "hour",
                "hourly_rate": hr,
                "rate": hr,
                "rate_basis": rb,
                "setup_cost": sc,
                "is_active": data.is_active,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        elif isinstance(data, dict):
            hr = data.get("hourly_rate") or data.get("rate") or Decimal("0.00")
            data["hourly_rate"] = hr
            data["rate"] = hr
            if not data.get("rate_basis"):
                data["rate_basis"] = "Per Hour"
        return data

    model_config = ConfigDict(from_attributes=True)
