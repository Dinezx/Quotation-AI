from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    role: str = "COSTING_ENGINEER"
    is_active: bool = True

class UserCreate(UserBase):
    company_id: Optional[str] = None

class UserResponse(UserBase):
    id: str
    company_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
