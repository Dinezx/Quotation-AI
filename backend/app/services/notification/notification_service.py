from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.notification import Notification


class NotificationService:
    """
    Authoritative workflow notification service.
    Guarantees strict tenant isolation and prevents duplicate notification flooding.
    """

    @staticmethod
    def create_notification(
        db: Session,
        company_id: str,
        type: str,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        user_id: Optional[str] = None,
        severity: str = "INFO",
        deduplicate_window_seconds: int = 120,
    ) -> Notification:
        """
        Creates an authoritative notification for the specified company tenant.
        If deduplicate_window_seconds > 0 and entity_id is provided,
        suppresses duplicate notifications for the same event type and entity within the window.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        if entity_id and deduplicate_window_seconds > 0:
            window_start = now - timedelta(seconds=deduplicate_window_seconds)
            existing = (
                db.query(Notification)
                .filter(
                    Notification.company_id == company_id,
                    Notification.type == type,
                    Notification.entity_id == str(entity_id),
                    Notification.created_at >= window_start,
                )
                .order_by(Notification.created_at.desc())
                .first()
            )
            if existing:
                # Update existing notification rather than generating spam
                existing.title = title
                existing.message = message
                existing.severity = severity
                db.commit()
                db.refresh(existing)
                return existing

        notification = Notification(
            company_id=company_id,
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            severity=severity.upper(),
            read_at=None,
            created_at=now,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def get_notifications(
        db: Session,
        company_id: str,
        page: int = 1,
        page_size: int = 20,
        unread_only: bool = False,
        severity: Optional[str] = None,
    ) -> Tuple[List[Notification], int, int]:
        """
        Retrieves paginated notifications for the company tenant.
        Returns (items, total_count, unread_count).
        """
        base_query = db.query(Notification).filter(Notification.company_id == company_id)

        # Calculate unread count for company
        unread_count = (
            db.query(func.count(Notification.id))
            .filter(
                Notification.company_id == company_id,
                Notification.read_at.is_(None),
            )
            .scalar()
            or 0
        )

        filtered_query = base_query
        if unread_only:
            filtered_query = filtered_query.filter(Notification.read_at.is_(None))
        if severity:
            filtered_query = filtered_query.filter(Notification.severity == severity.upper())

        total = filtered_query.count()
        offset = (page - 1) * page_size
        items = (
            filtered_query.order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(page_size)
            .all()
        )

        return items, total, unread_count

    @staticmethod
    def get_unread_count(db: Session, company_id: str) -> int:
        """Returns the number of unread notifications for the company tenant."""
        count = (
            db.query(func.count(Notification.id))
            .filter(
                Notification.company_id == company_id,
                Notification.read_at.is_(None),
            )
            .scalar()
        )
        return count or 0

    @staticmethod
    def mark_as_read(
        db: Session,
        company_id: str,
        notification_id: str,
    ) -> Optional[Notification]:
        """
        Marks a specific notification as read.
        Enforces strict company isolation (404/None if cross-tenant).
        """
        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.company_id == company_id,
            )
            .first()
        )
        if not notification:
            return None

        if notification.read_at is None:
            notification.read_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.commit()
            db.refresh(notification)

        return notification

    @staticmethod
    def mark_all_as_read(db: Session, company_id: str) -> int:
        """
        Marks all unread notifications for the company tenant as read.
        Returns the number of updated records.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        marked_count = (
            db.query(Notification)
            .filter(
                Notification.company_id == company_id,
                Notification.read_at.is_(None),
            )
            .update({Notification.read_at: now}, synchronize_session="fetch")
        )
        db.commit()
        return marked_count

    @staticmethod
    def delete_notification(
        db: Session,
        company_id: str,
        notification_id: str,
    ) -> bool:
        """
        Deletes a single notification for the specified company tenant.
        Enforces strict company isolation (returns False if not found or belongs to another company).
        """
        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.company_id == company_id,
            )
            .first()
        )
        if not notification:
            return False

        db.delete(notification)
        db.commit()
        return True

    @staticmethod
    def clear_all_notifications(
        db: Session,
        company_id: str,
    ) -> int:
        """
        Deletes all notifications for the specified company tenant.
        Returns the number of cleared notifications.
        """
        deleted_count = (
            db.query(Notification)
            .filter(Notification.company_id == company_id)
            .delete(synchronize_session="fetch")
        )
        db.commit()
        return deleted_count
