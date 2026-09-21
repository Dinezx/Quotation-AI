from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.company import Company
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.material import Material
from app.models.process import Process
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem
from app.schemas.pricing import (
    POCalculateRequest,
    POCalculateResponse,
    RateMatchItemResult,
    CalculationIssue,
)
from app.schemas.quotation import (
    CalculateQuotationRequest,
    CalculateItemInput,
)
from app.services.calculation.calculation_service import CalculationService, quantize_currency
from app.services.quotation.quotation_service import QuotationService


class PricingService:
    """
    Deterministic pricing and tenant rate matching service.
    Bridges APPROVED Purchase Orders to company rate cards using pure Python Decimal arithmetic.
    Zero AI / LLM involvement.
    """

    @staticmethod
    def match_tenant_rates(
        db: Session,
        company_id: str,
        items: List[PurchaseOrderItem],
    ) -> Tuple[List[RateMatchItemResult], List[CalculationIssue]]:
        """
        Deterministically matches tenant-specific material and process rates for each line item.
        Enforces strict company isolation (company_id == current_user.company_id).
        Never estimates, infers, or hallucinates missing rates or processes.
        """
        matched_items: List[RateMatchItemResult] = []
        all_issues: List[CalculationIssue] = []

        # Load active tenant materials and processes for cache lookup
        tenant_materials = db.query(Material).filter(
            Material.company_id == company_id,
            Material.is_active == True,
        ).all()

        tenant_processes = db.query(Process).filter(
            Process.company_id == company_id,
            Process.is_active == True,
        ).all()

        for item in items:
            item_issues: List[CalculationIssue] = []
            item_messages: List[str] = []

            # 1. Material rate matching
            matched_material: Optional[Material] = None
            mat_identifier = (item.material_grade or "").strip()

            if not mat_identifier and not item.material_id:
                issue = CalculationIssue(
                    item_id=item.id,
                    item_number=item.item_number,
                    part_name=item.part_name,
                    code="MATERIAL_MISSING",
                    message=f"Line item #{item.item_number} ({item.part_name}) has no material specified.",
                )
                item_issues.append(issue)
                item_messages.append(issue.message)
            else:
                # Lookup in tenant materials
                if item.material_id:
                    matched_material = next(
                        (m for m in tenant_materials if m.id == item.material_id), None
                    )
                if not matched_material and mat_identifier:
                    # Case-insensitive exact match on grade or name
                    cand_lower = mat_identifier.lower()
                    matched_material = next(
                        (m for m in tenant_materials if m.grade.lower() == cand_lower or m.name.lower() == cand_lower),
                        None,
                    )

                if not matched_material:
                    issue = CalculationIssue(
                        item_id=item.id,
                        item_number=item.item_number,
                        part_name=item.part_name,
                        code="MATERIAL_RATE_MISSING",
                        message=f"No active material rate card found for '{mat_identifier}' in tenant catalog.",
                    )
                    item_issues.append(issue)
                    item_messages.append(issue.message)

            # 2. Process rate matching
            matched_process: Optional[Process] = None
            proc_identifier = (item.process_name or "").strip()

            if not proc_identifier and not item.process_id:
                issue = CalculationIssue(
                    item_id=item.id,
                    item_number=item.item_number,
                    part_name=item.part_name,
                    code="PROCESS_MISSING",
                    message=f"Line item #{item.item_number} ({item.part_name}) has no manufacturing process specified. Human review required.",
                )
                item_issues.append(issue)
                item_messages.append(issue.message)
            else:
                # Lookup in tenant processes
                if item.process_id:
                    matched_process = next(
                        (p for p in tenant_processes if p.id == item.process_id), None
                    )
                if not matched_process and proc_identifier:
                    cand_proc_lower = proc_identifier.lower()
                    matched_process = next(
                        (p for p in tenant_processes if p.name.lower() == cand_proc_lower),
                        None,
                    )

                if not matched_process:
                    issue = CalculationIssue(
                        item_id=item.id,
                        item_number=item.item_number,
                        part_name=item.part_name,
                        code="PROCESS_RATE_MISSING",
                        message=f"No active process rate card found for '{proc_identifier}' in tenant catalog.",
                    )
                    item_issues.append(issue)
                    item_messages.append(issue.message)

            # 3. Unit & Weight verification
            # If material rate unit is 'kg' and item unit is count-based (PCS, Nos), weight is mandatory.
            count_units = {"pcs", "nos", "no", "set", "sets", "unit", "units", "number"}
            mat_unit = (matched_material.unit if matched_material else "kg").lower()
            item_unit = (item.unit or "PCS").lower()

            if mat_unit in {"kg", "kgs", "kilogram"} and item_unit in count_units:
                gross_weight = item.gross_weight_kg or Decimal("0.000")
                if gross_weight <= Decimal("0.000"):
                    issue = CalculationIssue(
                        item_id=item.id,
                        item_number=item.item_number,
                        part_name=item.part_name,
                        code="MATERIAL_WEIGHT_MISSING",
                        message=f"Line item #{item.item_number} ({item.part_name}) unit is '{item.unit}', but gross weight is missing or 0 for weight-based rate (₹/kg).",
                    )
                    item_issues.append(issue)
                    item_messages.append(issue.message)

            # Determine rate match status
            if item_issues:
                rate_match_status = item_issues[0].code
                all_issues.extend(item_issues)
            else:
                rate_match_status = "MATCHED"

            result_item = RateMatchItemResult(
                item_id=item.id,
                item_number=item.item_number,
                part_name=item.part_name,
                material=mat_identifier or (matched_material.grade if matched_material else None),
                material_rate=matched_material.base_rate if matched_material else None,
                scrap_credit_rate=matched_material.scrap_credit_rate if matched_material else Decimal("0.00"),
                process=proc_identifier or (matched_process.name if matched_process else None),
                process_rate=matched_process.hourly_rate if matched_process else None,
                setup_cost=matched_process.setup_cost if matched_process else Decimal("0.00"),
                quantity=item.quantity,
                unit=item.unit or "PCS",
                gross_weight_kg=item.gross_weight_kg or Decimal("0.000"),
                scrap_weight_kg=item.scrap_weight_kg or Decimal("0.000"),
                machining_hours=item.machining_hours or Decimal("0.00"),
                setup_hours=item.setup_hours or Decimal("0.00"),
                rate_match_status=rate_match_status,
                rate_match_messages=item_messages,
            )
            matched_items.append(result_item)

        return matched_items, all_issues

    @classmethod
    def calculate_purchase_order(
        cls,
        po: PurchaseOrder,
        db: Session,
        company_id: str,
        calc_params: POCalculateRequest,
    ) -> POCalculateResponse:
        """
        Executes the pricing milestone workflow:
        1. Approval gate check (PurchaseOrder.status == 'APPROVED').
        2. Tenant-scoped rate matching.
        3. Prerequisite validation (if issues exist, return status: 'BLOCKED').
        4. Deterministic calculation using Decimal.
        5. Optional draft quotation persistence (status: 'DRAFT').
        """
        # Step 1: Approval Gate
        if po.status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot calculate quotation for unapproved Purchase Order. Current status: '{po.status}'. Only APPROVED purchase orders may enter pricing.",
            )

        # Step 2: Rate matching
        matched_items, issues = cls.match_tenant_rates(
            db=db,
            company_id=company_id,
            items=po.items,
        )

        # Step 3: Block if missing prerequisites
        if issues:
            return POCalculateResponse(
                status="BLOCKED",
                purchase_order_id=po.id,
                po_number=po.po_number,
                customer_name=po.customer_name,
                currency="INR",
                issues=issues,
                items=matched_items,
            )

        # Step 4: Run deterministic calculation
        poi_map = {poi.id: poi for poi in po.items}
        calc_inputs: List[CalculateItemInput] = []
        for it in matched_items:
            orig_poi = poi_map.get(it.item_id) if it.item_id else None
            calc_inputs.append(
                CalculateItemInput(
                    purchase_order_item_id=it.item_id,
                    item_number=it.item_number,
                    part_name=it.part_name,
                    specification=orig_poi.specification if orig_poi else None,
                    drawing_number=orig_poi.drawing_number if orig_poi else None,
                    material=it.material,
                    process=it.process,
                    quantity=it.quantity,
                    unit=it.unit,
                    gross_weight_kg=it.gross_weight_kg,
                    scrap_weight_kg=it.scrap_weight_kg,
                    material_base_rate=it.material_rate or Decimal("0.00"),
                    scrap_credit_rate=it.scrap_credit_rate or Decimal("0.00"),
                    machining_hours=it.machining_hours,
                    machine_hourly_rate=it.process_rate or Decimal("0.00"),
                    setup_cost=it.setup_cost or Decimal("0.00"),
                )
            )

        # Resolve commercial pricing rules from company profile if not explicitly overridden
        company = db.query(Company).filter(Company.id == company_id).first()
        company_settings = (company.settings or {}) if company else {}

        overhead_pct = (
            calc_params.overhead_percentage
            if (calc_params and calc_params.overhead_percentage is not None)
            else Decimal(str(company_settings.get("overhead_percentage", "10.00")))
        )
        profit_pct = (
            calc_params.profit_percentage
            if (calc_params and calc_params.profit_percentage is not None)
            else Decimal(str(company_settings.get("profit_percentage", "15.00")))
        )
        gst_mode = (
            calc_params.gst_type
            if (calc_params and calc_params.gst_type is not None)
            else str(company_settings.get("gst_type", "CGST_SGST"))
        )

        engine_request = CalculateQuotationRequest(
            items=calc_inputs,
            overhead_percentage=overhead_pct,
            profit_percentage=profit_pct,
            gst_type=gst_mode,
        )

        calc_result = CalculationService.calculate_quotation(engine_request)

        # Map item financial figures back onto matched_items
        for idx, calc_item in enumerate(calc_result["items"]):
            if idx < len(matched_items):
                target = matched_items[idx]
                target.gross_material_cost = Decimal(str(calc_item["gross_material_cost"]))
                target.scrap_credit = Decimal(str(calc_item["scrap_credit"]))
                target.net_material_cost = Decimal(str(calc_item["net_material_cost"]))
                target.machining_cost = Decimal(str(calc_item["machining_cost"]))
                target.process_cost = Decimal(str(calc_item["process_cost"]))
                target.subtotal = Decimal(str(calc_item["subtotal"]))
                target.unit_cost = Decimal(str(calc_item["unit_cost"]))

        # Step 5: Optional Draft Quotation Persistence
        quotation_id: Optional[str] = None
        quotation_number: Optional[str] = None
        if calc_params.persist_draft:
            quotation = db.query(Quotation).filter(
                Quotation.purchase_order_id == po.id,
                Quotation.company_id == company_id,
            ).first()

            if quotation and quotation.status == "FINAL":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot recalculate draft: Purchase order #{po.po_number} already has a finalized quotation ({quotation.quotation_number}). Finalized quotations are immutable.",
                )

            if not quotation:
                quotation_number = QuotationService.generate_quotation_number(db, company_id)
                quotation = Quotation(
                    company_id=company_id,
                    customer_id=po.customer_id,
                    purchase_order_id=po.id,
                    quotation_number=quotation_number,
                    status="DRAFT",
                )
                db.add(quotation)
                db.flush()
            else:
                quotation_number = quotation.quotation_number

            # Sync terms from PO if not set
            if not quotation.delivery_terms and po.delivery_terms:
                quotation.delivery_terms = po.delivery_terms
            if not quotation.payment_terms and po.payment_terms:
                quotation.payment_terms = po.payment_terms
            if not quotation.inspection_terms and po.inspection_clauses:
                quotation.inspection_terms = po.inspection_clauses
            if not quotation.notes and po.general_notes:
                quotation.notes = po.general_notes

            QuotationService.recalculate_and_sync_quotation(
                db=db,
                quotation=quotation,
                request=engine_request,
            )
            quotation_id = quotation.id
            quotation_number = quotation.quotation_number

        return POCalculateResponse(
            status="SUCCESS",
            purchase_order_id=po.id,
            po_number=po.po_number,
            customer_name=po.customer_name,
            currency="INR",
            issues=[],
            items=matched_items,
            manufacturing_subtotal=Decimal(str(calc_result["subtotal"])),
            material_cost=Decimal(str(calc_result["material_cost"])),
            process_cost=Decimal(str(calc_result["process_cost"])),
            overhead_percentage=Decimal(str(calc_result["overhead_percentage"])),
            overhead_amount=Decimal(str(calc_result["overhead_amount"])),
            assessable_amount=Decimal(str(calc_result["subtotal"])) + Decimal(str(calc_result["overhead_amount"])),
            profit_percentage=Decimal(str(calc_result["profit_percentage"])),
            profit_amount=Decimal(str(calc_result["profit_amount"])),
            taxable_amount=Decimal(str(calc_result["taxable_amount"])),
            gst_type=calc_result["gst_type"],
            cgst_rate=Decimal(str(calc_result["cgst_rate"])),
            cgst_amount=Decimal(str(calc_result["cgst_amount"])),
            sgst_rate=Decimal(str(calc_result["sgst_rate"])),
            sgst_amount=Decimal(str(calc_result["sgst_amount"])),
            igst_rate=Decimal(str(calc_result["igst_rate"])),
            igst_amount=Decimal(str(calc_result["igst_amount"])),
            gst_amount=Decimal(str(calc_result["gst_amount"])),
            grand_total=Decimal(str(calc_result["final_total"])),
            final_total_in_words=calc_result["final_total_in_words"],
            quotation_id=quotation_id,
            quotation_number=quotation_number,
        )

