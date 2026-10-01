from datetime import datetime
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_serializer


class NotificationType(str, Enum):
    PO_UPLOADED = "PO_UPLOADED"
    PO_EXTRACTION_COMPLETED = "PO_EXTRACTION_COMPLETED"
    PO_NEEDS_REVIEW = "PO_NEEDS_REVIEW"
    PO_APPROVED = "PO_APPROVED"
    PO_REJECTED = "PO_REJECTED"
    CALCULATION_BLOCKED = "CALCULATION_BLOCKED"
    QUOTATION_DRAFT_CREATED = "QUOTATION_DRAFT_CREATED"
    QUOTATION_FINALIZED = "QUOTATION_FINALIZED"
    QUOTATION_PDF_GENERATED = "QUOTATION_PDF_GENERATED"
    QUOTATION_EMAIL_SENT = "QUOTATION_EMAIL_SENT"
    QUOTATION_EMAIL_FAILED = "QUOTATION_EMAIL_FAILED"
    SYSTEM_FAILURE = "SYSTEM_FAILURE"


class NotificationSeverity(str, Enum):
    INFO = "INFO"
    SUCCESS = "SUCCESS"
    WARNING = "WARNING"
    ERROR = "ERROR"


class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    severity: str = "INFO"


class NotificationCreate(NotificationBase):
    company_id: str
    user_id: Optional[str] = None


class NotificationResponse(NotificationBase):
    id: str
    company_id: str
    user_id: Optional[str] = None
    read_at: Optional[datetime] = None
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info) -> str:
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        return dt.isoformat()

    @field_serializer("read_at")
    def serialize_read_at(self, dt: Optional[datetime], _info) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        return dt.isoformat()


class NotificationPaginationResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int


class NotificationUnreadCountResponse(BaseModel):
    unread_count: int


class NotificationMarkReadResponse(BaseModel):
    success: bool
    notification: Optional[NotificationResponse] = None


class NotificationReadAllResponse(BaseModel):
    success: bool
    marked_count: int


class NotificationDeleteResponse(BaseModel):
    success: bool
    deleted_id: str


class NotificationClearAllResponse(BaseModel):
    success: bool
    cleared_count: int
