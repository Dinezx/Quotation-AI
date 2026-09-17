from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.security import get_current_company_id
from app.db.session import get_db
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    PurchaseOrderItemUpdate,
    PurchaseOrderItemResponse,
)
from app.services.storage.storage_service import StorageService

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])

@router.get("", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(
    status_filter: Optional[str] = None,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """List purchase orders for the current tenant company."""
    query = db.query(PurchaseOrder).filter(PurchaseOrder.company_id == company_id)
    if status_filter:
        query = query.filter(PurchaseOrder.status == status_filter.upper())
    return query.order_by(PurchaseOrder.created_at.desc()).all()

@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    po_in: PurchaseOrderCreate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new purchase order with optional initial extracted items."""
    po = PurchaseOrder(
        company_id=company_id,
        customer_id=po_in.customer_id,
        customer_name=po_in.customer_name,
        po_number=po_in.po_number,
        po_date=po_in.po_date,
        delivery_date=po_in.delivery_date,
        source_file_url=po_in.source_file_url,
        source_file_name=po_in.source_file_name,
        status=po_in.status,
        extracted_data=po_in.extracted_data,
        raw_text=po_in.raw_text,
    )
    db.add(po)
    db.flush()

    if po_in.items:
        for idx, it in enumerate(po_in.items):
            item = PurchaseOrderItem(
                purchase_order_id=po.id,
                item_number=it.item_number or (idx + 1),
                part_number=it.part_number,
                part_name=it.part_name,
                description=it.description,
                specification=it.specification,
                quantity=it.quantity,
                unit=it.unit,
                material_id=it.material_id,
                material_grade=it.material_grade,
                gross_weight_kg=it.gross_weight_kg,
                net_weight_kg=it.net_weight_kg,
                scrap_weight_kg=it.scrap_weight_kg,
                process_id=it.process_id,
                process_name=it.process_name,
                machining_hours=it.machining_hours,
                setup_hours=it.setup_hours,
                confidence=it.confidence,
            )
            db.add(item)

    db.commit()
    db.refresh(po)
    return po

@router.post("/upload")
async def upload_po_document(
    file: UploadFile = File(...),
    company_id: str = Depends(get_current_company_id),
):
    """Upload PO document (PDF, TIFF, PNG, JPEG) and store securely."""
    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/tiff"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type {file.content_type}. Allowed: PDF, PNG, JPG, TIFF."
        )

    url = await StorageService.upload_file(file, subfolder=f"po_{company_id}")
    return {
        "source_file_url": url,
        "source_file_name": file.filename,
        "file_size": file.size,
        "content_type": file.content_type
    }

@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    po_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Retrieve full purchase order details including items."""
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.company_id == company_id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po

@router.put("/{po_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    po_id: str,
    po_in: PurchaseOrderUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update purchase order header or status."""
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.company_id == company_id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    for field, value in po_in.model_dump(exclude_unset=True).items():
        setattr(po, field, value)

    db.commit()
    db.refresh(po)
    return po

@router.put("/{po_id}/items/{item_id}", response_model=PurchaseOrderItemResponse)
def update_purchase_order_item(
    po_id: str,
    item_id: str,
    item_in: PurchaseOrderItemUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update an individual line item during review (e.g. override grade, weights, or hours)."""
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.company_id == company_id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    item = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.id == item_id,
        PurchaseOrderItem.purchase_order_id == po_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found on this PO")

    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item
