from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session, selectinload
from app.core.security import get_current_company_id, get_current_user, AuthenticatedUser
from app.db.session import get_db
from app.models.company import Company
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem
from app.schemas.quotation import (
    QuotationCreate,
    QuotationUpdate,
    QuotationResponse,
    CalculateQuotationRequest,
)
from app.services.calculation.calculation_service import CalculationService
from app.services.quotation.quotation_service import QuotationService
from app.services.pdf.quotation_pdf_service import QuotationPDFService

router = APIRouter(prefix="/quotations", tags=["Quotations"])

@router.get("", response_model=List[QuotationResponse])
def list_quotations(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """List all quotations for the current tenant company."""
    return db.query(Quotation).options(
        selectinload(Quotation.items),
        selectinload(Quotation.customer),
        selectinload(Quotation.purchase_order),
        selectinload(Quotation.company),
    ).filter(
        Quotation.company_id == company_id
    ).order_by(Quotation.created_at.desc()).all()


@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(
    quotation_in: QuotationCreate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new quotation document with sequential quotation number."""
    if quotation_in.customer_id:
        customer = db.query(Customer).filter(
            Customer.id == quotation_in.customer_id,
            Customer.company_id == company_id
        ).first()
        if not customer:
            raise HTTPException(status_code=400, detail="Invalid customer for tenant")

    if quotation_in.purchase_order_id:
        po = db.query(PurchaseOrder).filter(
            PurchaseOrder.id == quotation_in.purchase_order_id,
            PurchaseOrder.company_id == company_id
        ).first()
        if not po:
            raise HTTPException(status_code=400, detail="Invalid purchase order for tenant")

    quotation_number = quotation_in.quotation_number or QuotationService.generate_quotation_number(db, company_id)

    quotation = Quotation(
        company_id=company_id,
        customer_id=quotation_in.customer_id,
        purchase_order_id=quotation_in.purchase_order_id,
        quotation_number=quotation_number,
        quotation_date=quotation_in.quotation_date,
        valid_until=quotation_in.valid_until,
        currency=quotation_in.currency,
        material_cost=quotation_in.material_cost,
        process_cost=quotation_in.process_cost,
        subtotal=quotation_in.subtotal,
        overhead_percentage=quotation_in.overhead_percentage,
        overhead_amount=quotation_in.overhead_amount,
        profit_percentage=quotation_in.profit_percentage,
        profit_amount=quotation_in.profit_amount,
        taxable_amount=quotation_in.taxable_amount,
        gst_type=quotation_in.gst_type,
        cgst_rate=quotation_in.cgst_rate,
        cgst_amount=quotation_in.cgst_amount,
        sgst_rate=quotation_in.sgst_rate,
        sgst_amount=quotation_in.sgst_amount,
        igst_rate=quotation_in.igst_rate,
        igst_amount=quotation_in.igst_amount,
        gst_amount=quotation_in.gst_amount,
        final_total=quotation_in.final_total,
        status=quotation_in.status,
        pdf_url=quotation_in.pdf_url,
        notes=quotation_in.notes,
        payment_terms=quotation_in.payment_terms,
        delivery_terms=quotation_in.delivery_terms,
        inspection_terms=quotation_in.inspection_terms,
        prepared_by=quotation_in.prepared_by,
        authorized_signatory=quotation_in.authorized_signatory,
    )
    db.add(quotation)
    db.flush()

    if quotation_in.items:
        for it in quotation_in.items:
            db_item = QuotationItem(
                quotation_id=quotation.id,
                purchase_order_item_id=it.purchase_order_item_id,
                item_number=it.item_number,
                part_name=it.part_name,
                specification=it.specification,
                drawing_number=it.drawing_number,
                material=it.material,
                process=it.process,
                quantity=it.quantity,
                unit=it.unit,
                gross_material_cost=it.gross_material_cost,
                scrap_credit=it.scrap_credit,
                net_material_cost=it.net_material_cost,
                machining_cost=it.machining_cost,
                setup_cost=it.setup_cost,
                process_cost=it.process_cost,
                subtotal=it.subtotal,
                unit_cost=it.unit_cost,
                unit_price=it.unit_price,
                total_price=it.total_price,
            )
            db.add(db_item)

    db.commit()
    db.refresh(quotation)
    return quotation

@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation(
    quotation_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Retrieve full quotation details including line items."""
    quotation = db.query(Quotation).options(
        selectinload(Quotation.items),
        selectinload(Quotation.customer),
        selectinload(Quotation.purchase_order),
        selectinload(Quotation.company),
    ).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == company_id
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation

@router.put("/{quotation_id}", response_model=QuotationResponse)
def update_quotation(
    quotation_id: str,
    quotation_in: QuotationUpdate,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update quotation status or commercial terms."""
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == company_id
    ).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    cust_id = getattr(quotation_in, "customer_id", None)
    if cust_id:
        customer = db.query(Customer).filter(
            Customer.id == cust_id,
            Customer.company_id == company_id
        ).first()
        if not customer:
            raise HTTPException(status_code=400, detail="Invalid customer for tenant")

    for field, value in quotation_in.model_dump(exclude_unset=True).items():
        setattr(quotation, field, value)

    db.commit()
    db.refresh(quotation)
    return quotation

@router.post("/calculate")
def calculate_quotation_stateless(
    request: CalculateQuotationRequest,
    company_id: str = Depends(get_current_company_id),
):
    """
    Authoritative deterministic commercial calculation engine.
    Calculates material scrap net, process costs, overhead, profit margin,
    statutory GST, and formatted Indian Rupee words. Zero LLM involvement.
    """
    return CalculationService.calculate_quotation(request)

@router.post("/{quotation_id}/calculate", response_model=QuotationResponse)
def calculate_and_update_quotation(
    quotation_id: str,
    request: CalculateQuotationRequest,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Recalculate an existing quotation and persist both header totals and item breakdowns atomically."""
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == company_id
    ).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    try:
        updated_quotation = QuotationService.recalculate_and_sync_quotation(
            db=db,
            quotation=quotation,
            request=request
        )
        return updated_quotation
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quotation calculation failed: {str(exc)}"
        )


@router.post("/{quotation_id}/finalize", response_model=QuotationResponse)
def finalize_quotation(
    quotation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Finalizes a draft quotation into an approved FINAL quotation.
    Enforces tenant ownership and data completeness.
    """
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")

    if quotation.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quotation belongs to another company"
        )

    if not quotation.items or len(quotation.items) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Quotation data incomplete: Line items missing"
        )

    if quotation.final_total is None or quotation.final_total <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quotation cannot be finalized because calculation is blocked or incomplete"
        )

    updated = QuotationService.finalize_quotation(
        db=db,
        quotation=quotation,
        authorized_by=current_user.email,
    )
    return updated


@router.get("/{quotation_id}/pdf")
def get_quotation_pdf(
    quotation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Renders and downloads presentation-only A4 quotation PDF from persisted database values.
    Enforces:
    1. Tenant isolation (Company A cannot download Company B quotation PDF).
    2. Calculation completeness (BLOCKED/zero calculations cannot generate PDF).
    3. Mandatory items validation (data completeness).
    4. Presentation-only: strictly reads stored values with zero recalculation.
    5. Zero AI involvement.
    """
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")

    if quotation.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quotation belongs to another company"
        )

    # Incomplete quotation verification
    if not quotation.items or len(quotation.items) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Quotation data incomplete: Line items missing"
        )

    # Blocked calculation verification: Must have valid positive calculated total
    if quotation.final_total is None or quotation.final_total <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quotation cannot be generated because calculation is blocked or incomplete"
        )

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company associated with quotation not found"
        )

    customer = None
    if quotation.customer_id:
        customer = db.query(Customer).filter(
            Customer.id == quotation.customer_id,
            Customer.company_id == current_user.company_id
        ).first()

    purchase_order = None
    if quotation.purchase_order_id:
        purchase_order = db.query(PurchaseOrder).filter(
            PurchaseOrder.id == quotation.purchase_order_id,
            PurchaseOrder.company_id == current_user.company_id
        ).first()

    try:
        pdf_bytes = QuotationPDFService.generate_quotation_pdf(
            quotation=quotation,
            company=company,
            customer=customer,
            purchase_order=purchase_order,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failure: {str(exc)}"
        )

    safe_filename = f"{quotation.quotation_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Content-Type": "application/pdf",
        }
    )


@router.post("/{quotation_id}/pdf")
def generate_quotation_pdf_post(
    quotation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """POST endpoint for generating/downloading quotation PDF."""
    return get_quotation_pdf(quotation_id=quotation_id, current_user=current_user, db=db)
