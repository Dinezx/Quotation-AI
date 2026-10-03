import logging
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.db.session import SessionLocal

logger = logging.getLogger("quotation_ai.audit")

FORBIDDEN_METADATA_KEYS = {
    "password", "secret", "token", "access_token", "refresh_token", 
    "authorization", "api_key", "service_key", "credentials", "jwks",
}

def sanitize_metadata(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Recursively removes any confidential credentials, passwords, or tokens from audit metadata."""
    if not data or not isinstance(data, dict):
        return None

    cleaned: Dict[str, Any] = {}
    for k, v in data.items():
        k_lower = str(k).lower()
        if any(f in k_lower for f in FORBIDDEN_METADATA_KEYS):
            cleaned[k] = "[REDACTED]"
        elif isinstance(v, dict):
            cleaned[k] = sanitize_metadata(v)
        elif isinstance(v, (str, int, float, bool, list)) or v is None:
            cleaned[k] = v
        else:
            cleaned[k] = str(v)
    return cleaned

class AuditService:
    @staticmethod
    def log_event(
        event: str,
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        result: str = "SUCCESS",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None,
    ) -> Optional[AuditLog]:
        """
        Records an authoritative security or workflow audit event.
        Guarantees that audit logging failures do not break production transactions.
        """
        safe_meta = sanitize_metadata(metadata)
        should_close = False
        active_db = db

        if active_db is None:
            try:
                active_db = SessionLocal()
                should_close = True
            except Exception as e:
                logger.error("Failed to acquire DB session for audit logging: %s", e)
                return None

        try:
            log_entry = AuditLog(
                company_id=company_id,
                user_id=user_id,
                user_email=user_email,
                event=event.upper(),
                entity_type=entity_type.upper() if entity_type else None,
                entity_id=str(entity_id) if entity_id else None,
                result=result.upper(),
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else None,
                metadata_json=safe_meta,
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
            )
            active_db.add(log_entry)
            active_db.commit()
            active_db.refresh(log_entry)
            return log_entry

        except Exception as exc:
            logger.error("Failed to persist audit log [%s]: %s", event, exc)
            if should_close and active_db:
                try:
                    active_db.rollback()
                except Exception:
                    pass
            return None
        finally:
            if should_close and active_db:
                active_db.close()

    @staticmethod
    def get_company_logs(
        db: Session,
        company_id: str,
        page: int = 1,
        page_size: int = 20,
        event: Optional[str] = None,
        entity_type: Optional[str] = None,
    ) -> Tuple[List[AuditLog], int]:
        """Retrieves paginated audit logs strictly isolated to the calling company."""
        query = db.query(AuditLog).filter(AuditLog.company_id == company_id)

        if event:
            query = query.filter(AuditLog.event == event.upper().strip())
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type.upper().strip())

        total = query.count()
        offset = max(0, (page - 1) * page_size)
        items = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size).all()
        return items, total

audit_service = AuditService()
