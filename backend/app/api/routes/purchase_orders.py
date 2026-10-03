from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session, selectinload, defer
from app.core.security import get_current_company_id, get_current_user, require_role, AuthenticatedUser
from app.core.file_security import validate_file_content, sanitize_filename
from app.services.security.malware_scanner import get_malware_scanner
from app.core.rate_limit import heavy_rate_limit
from app.services.audit.audit_service import AuditService
from app.db.session import get_db
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    PurchaseOrderItemUpdate,
    PurchaseOrderItemResponse,
    PurchaseOrderApproveRequest,
    PurchaseOrderRejectRequest,
)
from app.schemas.extraction import ExtractedPurchaseOrder
from app.schemas.pricing import POCalculateRequest, POCalculateResponse
from app.services.storage.storage_service import StorageService
from app.services.ai.extractor import po_extraction_service, convert_extraction_to_po_create
from app.services.pricing.pricing_service import PricingService
from app.services.notification.notification_service import NotificationService
from app.schemas.notification import NotificationType

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])


@router.get("", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(
    status_filter: Optional[str] = None,
    customer_id: Optional[str] = None,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """List purchase orders for the current tenant company."""
    query = (
        db.query(PurchaseOrder)
        .options(
            defer(PurchaseOrder.extracted_data),
            defer(PurchaseOrder.raw_text),
            selectinload(PurchaseOrder.items),
        )
        .filter(PurchaseOrder.company_id == company_id)
    )
    if customer_id:
        query = query.filter(PurchaseOrder.customer_id == customer_id)
    if status_filter:
        query = query.filter(PurchaseOrder.status == status_filter.upper())
    return query.order_by(PurchaseOrder.created_at.desc()).all()


@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    po_in: PurchaseOrderCreate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Create a new purchase order with optional initial extracted items."""
    if po_in.customer_id:
        customer = db.query(Customer).filter(
            Customer.id == po_in.customer_id,
            Customer.company_id == company_id,
        ).first()
        if not customer:
            raise HTTPException(status_code=400, detail="Invalid customer for tenant")
        if not customer.is_active:
            raise HTTPException(status_code=400, detail="Cannot create purchase order for deactivated customer")

    po = PurchaseOrder(
        company_id=company_id,
        customer_id=po_in.customer_id,
        customer_name=po_in.customer_name,
        supplier_name=po_in.supplier_name,
        po_number=po_in.po_number,
        po_date=po_in.po_date,
        delivery_date=po_in.delivery_date,
        delivery_terms=po_in.delivery_terms,
        payment_terms=po_in.payment_terms,
        inspection_clauses=po_in.inspection_clauses,
        general_notes=po_in.general_notes,
        source_file_url=po_in.source_file_url,
        source_file_name=po_in.source_file_name,
        status=po_in.status or "NEEDS_REVIEW",
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
                drawing_number=it.drawing_number,
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
                review_flags=it.review_flags or [],
            )
            db.add(item)

    db.commit()
    db.refresh(po)
    return po


@router.post("/from-extraction", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order_from_extraction(
    extraction: ExtractedPurchaseOrder,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """
    Safely bridges unapproved AI extraction data into a database PurchaseOrder record
    in NEEDS_REVIEW status.
    """
    po_create = convert_extraction_to_po_create(extraction)
    return create_purchase_order(po_in=po_create, company_id=company_id, db=db)


@router.post("/upload")
async def upload_po_document(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "COSTING_ENGINEER"])),
    _rate_limit = Depends(heavy_rate_limit),
    db: Session = Depends(get_db),
):
    """Upload PO document (PDF, TIFF, PNG, JPEG), extract, and persist as NEEDS_REVIEW."""
    company_id = current_user.company_id
    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/tiff"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type {file.content_type}. Allowed: PDF, PNG, JPG, TIFF.",
        )

    content = await file.read()
    await file.seek(0)

    # 1. Binary magic byte & size validation (max 25MB)
    validate_file_content(
        content=content,
        filename=file.filename or "uploaded_document.pdf",
        max_bytes=25 * 1024 * 1024,
        allowed_types=allowed_types,
    )

    # 2. Sanitize filename
    safe_filename = sanitize_filename(file.filename or "uploaded_document")
    file.filename = safe_filename

    # 3. Malware scanning integration point
    scanner = get_malware_scanner()
    scanner.scan_bytes(content, filename=safe_filename)

    url = await StorageService.upload_file(file, subfolder=f"po_{company_id}")
    await file.close()

    extraction = await po_extraction_service.extract_document(
        content=content,
        file_name=safe_filename,
        content_type=file.content_type or "application/pdf",
    )

    # Persist extracted PO into DB in NEEDS_REVIEW status
    po_create = convert_extraction_to_po_create(
        extraction=extraction,
        source_file_url=url,
        source_file_name=safe_filename,
    )
    po = PurchaseOrder(
        company_id=company_id,
        customer_name=po_create.customer_name,
        supplier_name=po_create.supplier_name,
        po_number=po_create.po_number,
        po_date=po_create.po_date,
        delivery_terms=po_create.delivery_terms,
        payment_terms=po_create.payment_terms,
        source_file_url=po_create.source_file_url,
        source_file_name=po_create.source_file_name,
        status="NEEDS_REVIEW",
        extracted_data=po_create.extracted_data,
        raw_text=po_create.raw_text,
    )
    db.add(po)
    db.flush()

    for idx, it in enumerate(po_create.items):
        item = PurchaseOrderItem(
            purchase_order_id=po.id,
            item_number=it.item_number or (idx + 1),
            part_number=it.part_number,
            drawing_number=it.drawing_number,
            part_name=it.part_name,
            description=it.description,
            specification=it.specification,
            quantity=it.quantity,
            unit=it.unit,
            material_grade=it.material_grade,
            gross_weight_kg=it.gross_weight_kg,
            net_weight_kg=it.net_weight_kg,
            scrap_weight_kg=it.scrap_weight_kg,
            process_name=it.process_name,
            machining_hours=it.machining_hours,
            setup_hours=it.setup_hours,
            confidence=it.confidence,
            review_flags=it.review_flags or [],
        )
        db.add(item)

    db.commit()
    db.refresh(po)

    AuditService.log_event(
        event="PO_UPLOADED",
        company_id=company_id,
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="PurchaseOrder",
        entity_id=po.id,
        metadata={"filename": safe_filename, "po_number": po.po_number, "size_bytes": len(content)},
        db=db,
    )

    has_flags = any(it.review_flags for it in po.items) or po.status == "NEEDS_REVIEW"
    NotificationService.create_notification(
        db=db,
        company_id=company_id,
        type=NotificationType.PO_UPLOADED.value,
        title="Purchase Order Uploaded",
        message=f"Purchase order {po.po_number or file.filename} was uploaded successfully.",
        entity_type="PURCHASE_ORDER",
        entity_id=po.id,
        severity="INFO",
    )
    if has_flags:
        NotificationService.create_notification(
            db=db,
            company_id=company_id,
            type=NotificationType.PO_NEEDS_REVIEW.value,
            title="PO Requires Review",
            message=f"PO {po.po_number or file.filename} requires human review before approval.",
            entity_type="PURCHASE_ORDER",
            entity_id=po.id,
            severity="WARNING",
        )
    else:
        NotificationService.create_notification(
            db=db,
            company_id=company_id,
            type=NotificationType.PO_EXTRACTION_COMPLETED.value,
            title="PO Ready for Review",
            message=f"PO {po.po_number or file.filename} extracted with high confidence.",
            entity_type="PURCHASE_ORDER",
            entity_id=po.id,
            severity="SUCCESS",
        )

    return {
        "source_file_url": url,
        "source_file_name": file.filename,
        "file_size": file.size or len(content),
        "content_type": file.content_type,
        "extraction": extraction.model_dump(mode="json"),
        "purchase_order_id": po.id,
        "purchase_order": PurchaseOrderResponse.model_validate(po).model_dump(mode="json"),
    }


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    po_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Retrieve full purchase order details including items and review status."""
    po = (
        db.query(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.company_id == company_id,
        )
        .first()
    )
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


@router.put("/{po_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    po_id: str,
    po_in: PurchaseOrderUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Update purchase order header or review items."""
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.company_id == company_id,
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po_in.customer_id:
        customer = db.query(Customer).filter(
            Customer.id == po_in.customer_id,
            Customer.company_id == company_id,
        ).first()
        if not customer:
            raise HTTPException(status_code=400, detail="Invalid customer for tenant")
        if not customer.is_active:
            raise HTTPException(status_code=400, detail="Cannot assign deactivated customer to purchase order")

    # Update header attributes
    update_dict = po_in.model_dump(exclude_unset=True)
    items_data = update_dict.pop("items", None)

    for field, value in update_dict.items():
        setattr(po, field, value)

    # If nested items update provided, update each item
    if items_data:
        for it_data in items_data:
            item_id = it_data.get("id")
            if item_id:
                item = db.query(PurchaseOrderItem).filter(
                    PurchaseOrderItem.id == item_id,
                    PurchaseOrderItem.purchase_order_id == po_id,
                ).first()
                if item:
                    for k, v in it_data.items():
                        if k != "id" and v is not None:
                            setattr(item, k, v)

    db.commit()
    db.refresh(po)
    return po


@router.put("/{po_id}/items/{item_id}", response_model=PurchaseOrderItemResponse)
def update_purchase_order_item(
    po_id: str,
    item_id: str,
    item_in: PurchaseOrderItemUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Update an individual line item during review."""
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.company_id == company_id,
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    item = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.id == item_id,
        PurchaseOrderItem.purchase_order_id == po_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found on this PO")

    for field, value in item_in.model_dump(exclude_unset=True).items():
        if field != "id":
            setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.get("/{po_id}/items/{item_id}", response_model=PurchaseOrderItemResponse)
def get_purchase_order_item(
    po_id: str,
    item_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Retrieve an individual purchase order line item."""
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.company_id == company_id,
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    item = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.id == item_id,
        PurchaseOrderItem.purchase_order_id == po_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found on this PO")

    return item


@router.post("/{po_id}/approve", response_model=PurchaseOrderResponse)
def approve_purchase_order(
    po_id: str,
    approve_req: Optional[PurchaseOrderApproveRequest] = None,
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "COSTING_ENGINEER"])),
    db: Session = Depends(get_db),
):
    """
    Formally authorizes a reviewed purchase order.
    
    Validations:
    1. Tenant isolation (company_id derived from verified token).
    2. Reviewability check (reject if already approved or rejected).
    3. Required fields (po_number, customer, po_date).
    4. At least one line item exists.
    5. Line items have valid quantities (> 0) and units.
    6. Atomically commits approval status and audit metadata (approved_by, approved_at).
    """
    try:
        po = db.query(PurchaseOrder).filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.company_id == current_user.company_id,
        ).first()
        if not po:
            raise HTTPException(status_code=404, detail="Purchase order not found")

        # Check reviewability
        if po.status == "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Purchase order is already approved",
            )
        if po.status == "REJECTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve a rejected purchase order",
            )

        # Validate header fields
        if not po.po_number or not po.po_number.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PO Number is required for approval",
            )
        if not (po.customer_name or po.customer_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer name or reference is required for approval",
            )
        if not po.po_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PO Date is required for approval",
            )

        # Validate line items
        if not po.items or len(po.items) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one line item is required for approval",
            )

        for it in po.items:
            if not it.part_name or not it.part_name.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Line item #{it.item_number} must have a valid part name",
                )
            if it.quantity is None or it.quantity <= Decimal("0"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Line item #{it.item_number} quantity must be strictly greater than 0",
                )
            if not it.unit or not it.unit.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Line item #{it.item_number} must specify a valid unit (e.g. PCS, Nos)",
                )

        # Apply approval state
        po.status = "APPROVED"
        po.approved_by = current_user.id
        po.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
        if approve_req and approve_req.approval_notes:
            notes = po.general_notes or ""
            po.general_notes = f"{notes}\n[Approval Note]: {approve_req.approval_notes}".strip()

        db.commit()
        db.refresh(po)

        NotificationService.create_notification(
            db=db,
            company_id=current_user.company_id,
            user_id=current_user.id,
            type=NotificationType.PO_APPROVED.value,
            title="PO Approved",
            message=f"Purchase order {po.po_number} was approved.",
            entity_type="PURCHASE_ORDER",
            entity_id=po.id,
            severity="SUCCESS",
        )

        AuditService.log_event(
            event="PO_APPROVED",
            company_id=current_user.company_id,
            user_id=current_user.id,
            user_email=current_user.email,
            entity_type="PurchaseOrder",
            entity_id=po.id,
            metadata={"po_number": po.po_number},
            db=db,
        )

        return po

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval failed: {str(exc)}",
        )


@router.post("/{po_id}/reject", response_model=PurchaseOrderResponse)
def reject_purchase_order(
    po_id: str,
    reject_req: PurchaseOrderRejectRequest,
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "COSTING_ENGINEER"])),
    db: Session = Depends(get_db),
):
    """Rejects a purchase order with a documented reason."""
    try:
        po = db.query(PurchaseOrder).filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.company_id == current_user.company_id,
        ).first()
        if not po:
            raise HTTPException(status_code=404, detail="Purchase order not found")

        if po.status == "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reject an already approved purchase order",
            )

        po.status = "REJECTED"
        po.rejection_reason = reject_req.reason

        db.commit()
        db.refresh(po)

        NotificationService.create_notification(
            db=db,
            company_id=current_user.company_id,
            user_id=current_user.id,
            type=NotificationType.PO_REJECTED.value,
            title="PO Rejected",
            message=f"Purchase order {po.po_number} was rejected: {reject_req.reason}",
            entity_type="PURCHASE_ORDER",
            entity_id=po.id,
            severity="ERROR",
        )

        AuditService.log_event(
            event="PO_REJECTED",
            company_id=current_user.company_id,
            user_id=current_user.id,
            user_email=current_user.email,
            entity_type="PurchaseOrder",
            entity_id=po.id,
            metadata={"reason": reject_req.reason},
            db=db,
        )

        return po

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rejection failed: {str(exc)}",
        )


@router.post("/{po_id}/calculate", response_model=POCalculateResponse)
def calculate_purchase_order(
    po_id: str,
    calc_req: Optional[POCalculateRequest] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deterministically calculates commercial quotation breakdown for an approved PO.
    Enforces:
    1. Tenant isolation (company_id derived from verified token).
    2. Approval gate (PurchaseOrder.status == 'APPROVED').
    3. Deterministic tenant rate matching (materials & processes).
    4. Mandatory unit/weight verification.
    5. Returns structured BLOCKED issues if prerequisites are missing.
    6. Zero AI / LLM involvement.
    """
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.company_id == current_user.company_id,
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    params = calc_req or POCalculateRequest()
    calc_result = PricingService.calculate_purchase_order(
        po=po,
        db=db,
        company_id=current_user.company_id,
        calc_params=params,
    )

    if getattr(calc_result, "status", None) == "BLOCKED" or (getattr(calc_result, "issues", None) and len(calc_result.issues) > 0):
        first_issue = calc_result.issues[0] if getattr(calc_result, "issues", None) else None
        if first_issue:
            issue_msg = getattr(first_issue, "message", str(first_issue))
        else:
            issue_msg = "Missing master pricing rates."

        NotificationService.create_notification(
            db=db,
            company_id=current_user.company_id,
            user_id=current_user.id,
            type=NotificationType.CALCULATION_BLOCKED.value,
            title="Calculation Blocked - Rate Required",
            message=f"Calculation blocked for PO {po.po_number}: {issue_msg}",
            entity_type="RATE",
            entity_id=po.id,
            severity="WARNING",
        )

    return calc_result
