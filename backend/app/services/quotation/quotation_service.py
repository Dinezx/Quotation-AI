import logging
import re
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem
from app.models.customer import Customer
from app.schemas.quotation import CalculateQuotationRequest
from app.services.calculation.calculation_service import CalculationService

logger = logging.getLogger(__name__)


def resolve_quotation_recipient(quotation: Quotation) -> str:
    """
    Authoritative server-side recipient resolution for quotation dispatch:
    1. Verify associated customer exists and belongs to the same tenant company.
    2. Obtain customer's quotation email preference (customer.quotation_email or settings override).
    3. Fallback to customer's login email (customer.login_email / customer.email).
    4. Validate selected address format.
    5. Return the validated recipient email string.
    """
    customer = quotation.customer
    if not customer and quotation.customer_id:
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            customer = db.query(Customer).filter(Customer.id == quotation.customer_id).first()
            quotation.customer = customer
        finally:
            db.close()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Quotation customer is missing.",
        )

    if customer.company_id != quotation.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer belongs to another company",
        )

    # 1. Customer quotation email preference
    recipient = None
    if customer.quotation_email and customer.quotation_email.strip():
        recipient = customer.quotation_email.strip()

    # 2. Fallback to customer login / account email
    if not recipient:
        login_email = customer.login_email or customer.email
        if login_email and login_email.strip():
            recipient = login_email.strip()

    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Customer email address is required before sending the quotation.",
        )

    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(email_regex, recipient):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Customer email address is invalid.",
        )

    return recipient


class QuotationService:
    @staticmethod
    def generate_quotation_number(db: Session, company_id: str) -> str:
        """
        Generates the next sequential quotation number:
        Format: QT-YYYY-XXXX (e.g. QT-2026-0001)
        """
        year = datetime.utcnow().strftime("%Y")
        prefix = f"QT-{year}-"
        
        # Count existing quotations for this year and company
        count = db.query(func.count(Quotation.id)).filter(
            Quotation.company_id == company_id,
            Quotation.quotation_number.like(f"{prefix}%")
        ).scalar() or 0

        seq = count + 1
        while True:
            candidate = f"{prefix}{seq:04d}"
            exists = db.query(Quotation.id).filter(
                Quotation.company_id == company_id,
                Quotation.quotation_number == candidate
            ).first()
            if not exists:
                return candidate
            seq += 1

    @staticmethod
    def resolve_quotation_recipient(quotation: Quotation) -> str:
        return resolve_quotation_recipient(quotation)

    @staticmethod
    def recalculate_and_sync_quotation(
        db: Session,
        quotation: Quotation,
        request: CalculateQuotationRequest,
    ) -> Quotation:
        """
        Deterministically recalculates quotation commercial totals and synchronizes
        all individual QuotationItem rows atomically within the current database transaction.
        """
        if quotation.status == "FINAL":
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Finalized quotations cannot be recalculated or modified.",
            )

        calc_res = CalculationService.calculate_quotation(request)

        # 1. Update quotation header financial breakdown
        quotation.material_cost = Decimal(str(calc_res["material_cost"]))
        quotation.process_cost = Decimal(str(calc_res["process_cost"]))
        quotation.subtotal = Decimal(str(calc_res["subtotal"]))
        quotation.overhead_percentage = Decimal(str(calc_res["overhead_percentage"]))
        quotation.overhead_amount = Decimal(str(calc_res["overhead_amount"]))
        quotation.profit_percentage = Decimal(str(calc_res["profit_percentage"]))
        quotation.profit_amount = Decimal(str(calc_res["profit_amount"]))
        quotation.taxable_amount = Decimal(str(calc_res["taxable_amount"]))
        quotation.gst_type = calc_res["gst_type"]
        quotation.cgst_rate = Decimal(str(calc_res["cgst_rate"]))
        quotation.cgst_amount = Decimal(str(calc_res["cgst_amount"]))
        quotation.sgst_rate = Decimal(str(calc_res["sgst_rate"]))
        quotation.sgst_amount = Decimal(str(calc_res["sgst_amount"]))
        quotation.igst_rate = Decimal(str(calc_res["igst_rate"]))
        quotation.igst_amount = Decimal(str(calc_res["igst_amount"]))
        quotation.gst_amount = Decimal(str(calc_res["gst_amount"]))
        quotation.final_total = Decimal(str(calc_res["final_total"]))

        # 2. Synchronize line items atomically
        unmatched_existing = list(quotation.items)
        calculated_items = calc_res["items"]

        for idx, calc_it in enumerate(calculated_items):
            matched_item = None

            # Match 1: By explicit QuotationItem id if supplied
            req_item_id = calc_it.get("id")
            if req_item_id:
                for it in unmatched_existing:
                    if it.id == req_item_id:
                        matched_item = it
                        break

            # Match 2: By purchase_order_item_id
            if not matched_item and calc_it.get("purchase_order_item_id"):
                for it in unmatched_existing:
                    if it.purchase_order_item_id == calc_it["purchase_order_item_id"]:
                        matched_item = it
                        break

            # Match 3: By item_number
            if not matched_item and calc_it.get("item_number") is not None:
                for it in unmatched_existing:
                    if it.item_number == calc_it["item_number"]:
                        matched_item = it
                        break

            # Match 4: Positional fallback
            if not matched_item and unmatched_existing:
                matched_item = unmatched_existing[0]

            if matched_item:
                unmatched_existing.remove(matched_item)
                target_item = matched_item
            else:
                target_item = QuotationItem(
                    quotation_id=quotation.id,
                )
                db.add(target_item)

            # Update line item fields
            target_item.item_number = calc_it.get("item_number", idx + 1)
            target_item.part_name = calc_it["part_name"]
            target_item.specification = calc_it.get("specification")
            if calc_it.get("drawing_number"):
                target_item.drawing_number = calc_it["drawing_number"]
            if calc_it.get("material"):
                target_item.material = calc_it["material"]
            if calc_it.get("process"):
                target_item.process = calc_it["process"]
            target_item.quantity = Decimal(str(calc_it["quantity"]))
            target_item.unit = calc_it.get("unit", "PCS")
            if calc_it.get("purchase_order_item_id"):
                target_item.purchase_order_item_id = calc_it["purchase_order_item_id"]

            target_item.gross_material_cost = Decimal(str(calc_it["gross_material_cost"]))
            target_item.scrap_credit = Decimal(str(calc_it["scrap_credit"]))
            target_item.net_material_cost = Decimal(str(calc_it["net_material_cost"]))
            target_item.machining_cost = Decimal(str(calc_it["machining_cost"]))
            target_item.setup_cost = Decimal(str(calc_it["setup_cost"]))
            target_item.process_cost = Decimal(str(calc_it["process_cost"]))
            target_item.subtotal = Decimal(str(calc_it["subtotal"]))
            target_item.unit_cost = Decimal(str(calc_it["unit_cost"]))
            target_item.unit_price = Decimal(str(calc_it["unit_price"]))
            target_item.total_price = Decimal(str(calc_it["total_price"]))

        # Remove items that are no longer part of the calculated quotation
        for stale_item in unmatched_existing:
            db.delete(stale_item)

        db.commit()
        db.refresh(quotation)
        return quotation

    @staticmethod
    def finalize_quotation(
        db: Session,
        quotation: Quotation,
        authorized_by: Optional[str] = None,
    ) -> Quotation:
        """
        Marks quotation as immutable FINAL commercial document:
        1. Validates status is DRAFT (409 Conflict if already FINAL)
        2. Validates line items completeness (422 Unprocessable Content if empty)
        3. Validates positive calculated financial totals (409 Conflict if <= 0)
        4. Generates official presentation-only A4 PDF
        5. Computes SHA-256 hash for document integrity
        6. Uploads PDF to tenant-safe storage location
        7. Records finalized_at, finalized_by, pdf_storage_path, pdf_generated_at, pdf_sha256
        8. Atomically commits transaction with rollback guard
        """
        from fastapi import HTTPException, status
        import hashlib
        from app.core.config import settings
        from app.models.company import Company
        from app.models.customer import Customer
        from app.models.purchase_order import PurchaseOrder
        from app.services.pdf.quotation_pdf_service import QuotationPDFService
        from app.services.storage.storage_service import get_storage_service

        if quotation.status == "FINAL":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Quotation is already finalized.",
            )

        if not quotation.items or len(quotation.items) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Quotation data incomplete: Line items missing",
            )

        if quotation.final_total is None or quotation.final_total <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Quotation cannot be finalized because calculation is blocked or incomplete",
            )

        company = quotation.company
        if not company:
            company = db.query(Company).filter(Company.id == quotation.company_id).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company associated with quotation not found",
            )

        customer = quotation.customer
        if not customer and quotation.customer_id:
            customer = db.query(Customer).filter(
                Customer.id == quotation.customer_id,
                Customer.company_id == quotation.company_id,
            ).first()

        purchase_order = quotation.purchase_order
        if not purchase_order and quotation.purchase_order_id:
            purchase_order = db.query(PurchaseOrder).filter(
                PurchaseOrder.id == quotation.purchase_order_id,
                PurchaseOrder.company_id == quotation.company_id,
            ).first()

        # Generate official presentation-only PDF
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
                detail=f"Official quotation PDF generation failed: {str(exc)}",
            )

        # Document integrity hash
        pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

        # Tenant-safe storage path: companies/{company_id}/quotations/{quotation_id}/{quotation_number}.pdf
        storage_path = f"companies/{quotation.company_id}/quotations/{quotation.id}/{quotation.quotation_number}.pdf"
        file_name = f"{quotation.quotation_number}.pdf"
        bucket = settings.QUOTATION_PDF_BUCKET
        storage = get_storage_service()

        # Step 3: Upload PDF to storage
        try:
            storage.upload(
                bucket=bucket,
                path=storage_path,
                data=pdf_bytes,
                content_type="application/pdf",
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"PDF storage upload failed: {str(exc)}",
            )

        # Step 4: Atomic update and commit with rollback guard
        now = datetime.utcnow()
        quotation.status = "FINAL"
        quotation.finalized_at = now
        quotation.finalized_by = authorized_by
        if authorized_by and not quotation.authorized_signatory:
            quotation.authorized_signatory = authorized_by
        quotation.pdf_storage_path = storage_path
        quotation.pdf_file_name = file_name
        quotation.pdf_generated_at = now
        quotation.pdf_sha256 = pdf_sha256
        quotation.pdf_url = storage_path

        try:
            db.commit()
            db.refresh(quotation)
            return quotation
        except Exception as exc:
            # Prevent orphan storage object if DB commit fails
            try:
                storage.delete(bucket, storage_path)
            except Exception:
                pass
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist quotation finalization: {str(exc)}",
            )

    @staticmethod
    def send_quotation_email(
        db: Session,
        quotation: Quotation,
        sender_user_id: Optional[str] = None,
        sender_email: Optional[str] = None,
    ) -> Quotation:
        """
        Sends the official FINAL quotation PDF via Resend email:
        1. Validates quotation status is FINAL (409 Conflict if not)
        2. Validates associated customer exists and belongs to company (422/403)
        3. Validates customer email exists and is valid format (422 Unprocessable Content)
        4. Validates stored official PDF exists in Supabase Storage (409 Conflict)
        5. Validates stored PDF SHA-256 matches quotation.pdf_sha256 (409 Conflict)
        6. Guards against concurrent in-flight dispatch (409 Conflict)
        7. Attaches the exact stored official PDF bytes
        8. Generates deterministic B2B email template (zero AI / LLM)
        9. Records email dispatch audit status (SENT / FAILED, recipient, timestamp, message ID)
        """
        from fastapi import HTTPException, status
        import hashlib
        import re
        from app.core.config import settings
        from app.models.customer import Customer
        from app.services.storage.storage_service import get_storage_service
        from app.services.email import get_email_service
        from app.services.email.email_template import generate_quotation_email_content

        # 1. State check: Only FINAL quotations can be emailed
        if quotation.status != "FINAL":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only finalized quotations can be sent by email.",
            )

        # 2. Recipient resolution & validation
        # Server-side resolution: quotation_email ?? customer_login_email
        customer = quotation.customer
        if not customer and quotation.customer_id:
            customer = db.query(Customer).filter(Customer.id == quotation.customer_id).first()
            quotation.customer = customer

        recipient_email = resolve_quotation_recipient(quotation)

        # 3. PDF metadata validation
        if not quotation.pdf_storage_path or not quotation.pdf_file_name or not quotation.pdf_sha256:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Official quotation PDF is unavailable.",
            )

        # 4. Download stored official PDF
        storage = get_storage_service()
        try:
            pdf_bytes = storage.download(
                bucket=settings.QUOTATION_PDF_BUCKET,
                path=quotation.pdf_storage_path,
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Official quotation PDF is unavailable.",
            )

        # 5. Cryptographic SHA-256 document integrity check
        calculated_hash = hashlib.sha256(pdf_bytes).hexdigest()
        if calculated_hash != quotation.pdf_sha256:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Official quotation PDF integrity check failed.",
            )

        # 6. Concurrency / In-flight check
        if quotation.email_status == "SENDING":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Quotation email dispatch is already in progress.",
            )

        # 7. Generate deterministic B2B email template (zero AI)
        subject, html_body, text_body = generate_quotation_email_content(quotation)

        # 8. Set status to SENDING
        quotation.email_status = "SENDING"
        db.commit()

        # 9. Deliver via EmailService
        email_service = get_email_service()
        attachment_filename = quotation.pdf_file_name or f"{quotation.quotation_number}.pdf"

        try:
            result = email_service.send_email(
                to=recipient_email,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
                attachments=[{
                    "filename": attachment_filename,
                    "content": pdf_bytes,
                }],
            )
        except Exception as exc:
            clean_error = "Email provider failed to send the quotation."
            logger.error(
                "Quotation email dispatch failed for quotation_id=%s: %s",
                quotation.id,
                type(exc).__name__,
            )
            quotation.email_status = "FAILED"
            quotation.email_error = clean_error
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=clean_error,
            )

        # 10. Record success audit trail
        now = datetime.utcnow()
        quotation.email_status = "SENT"
        quotation.email_sent_at = now
        quotation.email_sent_by = sender_email or sender_user_id
        quotation.email_recipient = recipient_email
        quotation.email_message_id = result.get("id")
        quotation.email_error = None
        db.commit()
        db.refresh(quotation)
        return quotation

