"""Purchase Order business logic service."""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem

class PurchaseOrderService:
    @staticmethod
    def get_by_id(db: Session, po_id: str, company_id: str) -> Optional[PurchaseOrder]:
        """Fetch PO with strict multi-tenant isolation."""
        return db.query(PurchaseOrder).filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.company_id == company_id
        ).first()

    @staticmethod
    def list_orders(
        db: Session, 
        company_id: str, 
        status_filter: Optional[str] = None
    ) -> List[PurchaseOrder]:
        """List POs filtered by company_id and optional status."""
        query = db.query(PurchaseOrder).filter(PurchaseOrder.company_id == company_id)
        if status_filter:
            query = query.filter(PurchaseOrder.status == status_filter)
        return query.order_by(PurchaseOrder.created_at.desc()).all()

    @staticmethod
    def update_status(
        db: Session, 
        po: PurchaseOrder, 
        new_status: str
    ) -> PurchaseOrder:
        """Transitions PO lifecycle status with validation."""
        valid_statuses = {"draft", "uploaded", "review_required", "reviewed", "quoted", "rejected"}
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid PO status: {new_status}")
        po.status = new_status
        db.commit()
        db.refresh(po)
        return po

po_service = PurchaseOrderService()
