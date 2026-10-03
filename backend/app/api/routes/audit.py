from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.security import require_role, AuthenticatedUser
from app.db.session import get_db
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

class AuditLogItem(BaseModel):
    id: str
    company_id: Optional[str] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    event: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    result: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None

class AuditLogsResponse(BaseModel):
    total: int
    offset: int
    limit: int
    logs: List[AuditLogItem]

@router.get("/logs", response_model=AuditLogsResponse)
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    event: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    """
    Retrieves the authoritative tamper-evident audit trail for the caller's company.
    Restricted strictly to company ADMIN role. Multi-tenant company isolation enforced.
    """
    query = db.query(AuditLog).filter(AuditLog.company_id == current_user.company_id)
    if event:
        query = query.filter(AuditLog.event == event.strip())
    
    total = query.count()
    records = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    return AuditLogsResponse(
        total=total,
        offset=offset,
        limit=limit,
        logs=[
            AuditLogItem(
                id=log.id,
                company_id=log.company_id,
                user_id=log.user_id,
                user_email=log.user_email,
                event=log.event,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                result=log.result,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                metadata=log.metadata_json,

                created_at=log.created_at.isoformat() if log.created_at else None,
            )
            for log in records
        ]
    )
