from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any
from app.schemas.quotation import CalculateQuotationRequest, CalculateItemInput

TWO_PLACES = Decimal("0.01")
ZERO_PLACES = Decimal("1")

def quantize_currency(val: Decimal, to_rupee: bool = False) -> Decimal:
    """Quantize to 2 decimal places or nearest whole rupee."""
    if to_rupee:
        return val.quantize(ZERO_PLACES, rounding=ROUND_HALF_UP)
    return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

def number_to_indian_words(num: int) -> str:
    """Converts a whole number into Indian Rupee denomination words."""
    if num == 0:
        return "Indian Rupee Zero Only"

    ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"
    ]
    tens = [
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ]

    def convert_tens(n: int) -> str:
        if n == 0:
            return ""
        if n < 20:
            return ones[n]
        remainder = n % 10
        if remainder > 0:
            return f"{tens[n // 10]}-{ones[remainder]}"
        return tens[n // 10]

    def convert_hundreds(n: int) -> str:
        res = ""
        if n >= 100:
            res += ones[n // 100] + " Hundred"
            n %= 100
            if n > 0:
                res += " and " + convert_tens(n)
        else:
            res = convert_tens(n)
        return res.strip()

    n = abs(int(num))
    words = []

    crore = n // 10000000
    n %= 10000000
    lakh = n // 100000
    n %= 100000
    thousand = n // 1000
    n %= 1000
    remainder = n

    if crore > 0:
        words.append(f"{convert_tens(crore)} Crore")
    if lakh > 0:
        words.append(f"{convert_tens(lakh)} Lakh")
    if thousand > 0:
        words.append(f"{convert_tens(thousand)} Thousand")
    if remainder > 0:
        words.append(convert_hundreds(remainder))

    return f"Indian Rupee {' '.join(words).strip()} Only"


class CalculationService:
    @staticmethod
    def calculate_line_item(item: CalculateItemInput) -> Dict[str, Any]:
        """
        Calculates deterministic line item costing.
        Net Material = (gross_weight * base_rate * qty) - (scrap_weight * scrap_credit * qty)
        Process Cost = (machining_hours * hourly_rate * qty) + setup_cost
        """
        qty = Decimal(str(item.quantity)) if item.quantity > Decimal("0") else Decimal("1")
        
        gross_mat = Decimal(str(item.gross_weight_kg)) * Decimal(str(item.material_base_rate)) * qty
        scrap_cred = Decimal(str(item.scrap_weight_kg)) * Decimal(str(item.scrap_credit_rate)) * qty
        net_mat = max(Decimal("0.00"), gross_mat - scrap_cred)

        machining = Decimal(str(item.machining_hours)) * Decimal(str(item.machine_hourly_rate)) * qty
        setup = Decimal(str(item.setup_cost))
        process = machining + setup

        subtotal = net_mat + process
        unit_cost = subtotal / qty

        return {
            "id": getattr(item, "id", None),
            "purchase_order_item_id": item.purchase_order_item_id,
            "item_number": item.item_number,
            "part_name": item.part_name,
            "specification": item.specification,
            "quantity": quantize_currency(qty),
            "unit": item.unit,
            "gross_material_cost": quantize_currency(gross_mat),
            "scrap_credit": quantize_currency(scrap_cred),
            "net_material_cost": quantize_currency(net_mat),
            "machining_cost": quantize_currency(machining),
            "setup_cost": quantize_currency(setup),
            "process_cost": quantize_currency(process),
            "subtotal": quantize_currency(subtotal),
            "unit_cost": quantize_currency(unit_cost),
            "unit_price": quantize_currency(unit_cost),
            "total_price": quantize_currency(subtotal),
        }

    @staticmethod
    def calculate_quotation(
        request: CalculateQuotationRequest, 
        base_override_subtotal: Decimal = None,
        base_material_override: Decimal = None,
        base_process_override: Decimal = None
    ) -> Dict[str, Any]:
        """
        Calculates authoritative quotation commercial breakdown:
        Manufacturing Subtotal -> Overhead -> Profit Margin -> Taxable -> GST (CGST/SGST or IGST) -> Grand Total
        """
        calculated_items = [
            CalculationService.calculate_line_item(it) for it in request.items
        ]

        if base_material_override is not None:
            material_cost = base_material_override
        else:
            material_cost = sum(Decimal(str(it["net_material_cost"])) for it in calculated_items) if calculated_items else Decimal("0.00")

        if base_process_override is not None:
            process_cost = base_process_override
        else:
            process_cost = sum(Decimal(str(it["process_cost"])) for it in calculated_items) if calculated_items else Decimal("0.00")

        if base_override_subtotal is not None:
            base_subtotal = base_override_subtotal
        else:
            base_subtotal = material_cost + process_cost

        overhead_pct = Decimal(str(request.overhead_percentage))
        profit_pct = Decimal(str(request.profit_percentage))

        overhead_amount = quantize_currency(base_subtotal * (overhead_pct / Decimal("100.00")), to_rupee=True)
        assessable_base = base_subtotal + overhead_amount
        profit_amount = quantize_currency(assessable_base * (profit_pct / Decimal("100.00")), to_rupee=True)
        taxable_amount = assessable_base + profit_amount

        # GST calculation
        gst_type = request.gst_type.upper()
        if gst_type == "IGST":
            cgst_rate = Decimal("0.00")
            cgst_amount = Decimal("0.00")
            sgst_rate = Decimal("0.00")
            sgst_amount = Decimal("0.00")
            igst_rate = Decimal("18.00")
            igst_amount = quantize_currency(taxable_amount * Decimal("0.18"), to_rupee=True)
            gst_amount = igst_amount
        elif gst_type == "EXEMPT":
            cgst_rate = Decimal("0.00")
            cgst_amount = Decimal("0.00")
            sgst_rate = Decimal("0.00")
            sgst_amount = Decimal("0.00")
            igst_rate = Decimal("0.00")
            igst_amount = Decimal("0.00")
            gst_amount = Decimal("0.00")
        else: # CGST_SGST intrastate
            cgst_rate = Decimal("9.00")
            cgst_amount = quantize_currency(taxable_amount * Decimal("0.09"), to_rupee=True)
            sgst_rate = Decimal("9.00")
            sgst_amount = quantize_currency(taxable_amount * Decimal("0.09"), to_rupee=True)
            igst_rate = Decimal("0.00")
            igst_amount = Decimal("0.00")
            gst_amount = cgst_amount + sgst_amount

        final_total = taxable_amount + gst_amount
        final_in_words = number_to_indian_words(int(final_total))

        return {
            "items": calculated_items,
            "material_cost": quantize_currency(material_cost),
            "process_cost": quantize_currency(process_cost),
            "subtotal": quantize_currency(base_subtotal),
            "overhead_percentage": overhead_pct,
            "overhead_amount": quantize_currency(overhead_amount),
            "profit_percentage": profit_pct,
            "profit_amount": quantize_currency(profit_amount),
            "taxable_amount": quantize_currency(taxable_amount),
            "gst_type": gst_type,
            "cgst_rate": cgst_rate,
            "cgst_amount": quantize_currency(cgst_amount),
            "sgst_rate": sgst_rate,
            "sgst_amount": quantize_currency(sgst_amount),
            "igst_rate": igst_rate,
            "igst_amount": quantize_currency(igst_amount),
            "gst_amount": quantize_currency(gst_amount),
            "final_total": quantize_currency(final_total),
            "final_total_in_words": final_in_words,
        }
