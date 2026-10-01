from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_company_id
from app.db.session import get_db
from app.schemas.notification import (
    NotificationResponse,
    NotificationPaginationResponse,
    NotificationUnreadCountResponse,
    NotificationMarkReadResponse,
    NotificationReadAllResponse,
)
from app.services.notification.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationPaginationResponse)
def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    severity: Optional[str] = Query(None),
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """
    Retrieves paginated notifications for the authenticated company tenant.
    Supports filtering by unread status and severity.
    Enforces strict tenant isolation.
    """
    items, total, unread_count = NotificationService.get_notifications(
        db=db,
        company_id=company_id,
        page=page,
        page_size=page_size,
        unread_only=unread_only,
        severity=severity,
    )

    # Convert to response schemas with is_read computed
    response_items = []
    for it in items:
        resp = NotificationResponse.model_validate(it)
        resp.is_read = it.read_at is not None
        response_items.append(resp)

    return NotificationPaginationResponse(
        items=response_items,
        total=total,
        unread_count=unread_count,
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=NotificationUnreadCountResponse)
def get_unread_count(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """
    Returns the real-time unread notification count for the authenticated company.
    Fast query used for polling and badge updates.
    """
    count = NotificationService.get_unread_count(db=db, company_id=company_id)
    return NotificationUnreadCountResponse(unread_count=count)


@router.post("/{notification_id}/read", response_model=NotificationMarkReadResponse)
def mark_notification_read(
    notification_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """
    Marks a single notification as read without losing notification history.
    Enforces strict tenant isolation (returns 404 if notification belongs to another company).
    """
    notif = NotificationService.mark_as_read(
        db=db,
        company_id=company_id,
        notification_id=notification_id,
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    resp = NotificationResponse.model_validate(notif)
    resp.is_read = True
    return NotificationMarkReadResponse(success=True, notification=resp)


@router.post("/read-all", response_model=NotificationReadAllResponse)
def mark_all_notifications_read(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """
    Marks all unread notifications for the authenticated company tenant as read.
    """
    count = NotificationService.mark_all_as_read(db=db, company_id=company_id)
    return NotificationReadAllResponse(success=True, marked_count=count)
