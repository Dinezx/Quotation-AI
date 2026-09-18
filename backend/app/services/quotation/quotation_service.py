from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem
from app.schemas.quotation import CalculateQuotationRequest
from app.services.calculation.calculation_service import CalculationService

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

        next_sequence = count + 1
        return f"{prefix}{next_sequence:04d}"

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

