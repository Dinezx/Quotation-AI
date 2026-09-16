from decimal import Decimal
from app.schemas.quotation import CalculateItemInput, CalculateQuotationRequest
from app.services.calculation.calculation_service import CalculationService, number_to_indian_words

def test_line_item_calculation():
    """Test deterministic calculation for a CNC machined part."""
    item = CalculateItemInput(
        part_name="CNC Flange",
        quantity=Decimal("10"),
        unit="PCS",
        gross_weight_kg=Decimal("12.000"),
        scrap_weight_kg=Decimal("4.000"),
        material_base_rate=Decimal("380.00"),     # 12 * 380 * 10 = 45,600
        scrap_credit_rate=Decimal("140.00"),      # 4 * 140 * 10 = 5,600 -> Net Mat = 40,000
        machining_hours=Decimal("2.50"),
        machine_hourly_rate=Decimal("1200.00"),   # 2.5 * 1200 * 10 = 30,000
        setup_cost=Decimal("500.00"),             # Setup = 500 -> Process = 30,500
    )

    result = CalculationService.calculate_line_item(item)

    assert result["gross_material_cost"] == Decimal("45600.00")
    assert result["scrap_credit"] == Decimal("5600.00")
    assert result["net_material_cost"] == Decimal("40000.00")
    assert result["machining_cost"] == Decimal("30000.00")
    assert result["setup_cost"] == Decimal("500.00")
    assert result["process_cost"] == Decimal("30500.00")
    assert result["subtotal"] == Decimal("70500.00")
    assert result["unit_cost"] == Decimal("7050.00")


def test_reference_commercial_calculation_96510():
    """
    Test the exact authoritative commercial costing matching the benchmark:
    Base Material & Machining: ₹63,500
    Shopfloor Overhead (12%): ₹7,620
    Tooling & Margin (15%): ₹10,668
    Taxable Amount: ₹81,788
    CGST @ 9%: ₹7,361
    SGST @ 9%: ₹7,361
    Grand Total: ₹96,510
    """
    req = CalculateQuotationRequest(
        items=[],
        overhead_percentage=Decimal("12.00"),
        profit_percentage=Decimal("15.00"),
        gst_type="CGST_SGST",
    )

    result = CalculationService.calculate_quotation(
        request=req,
        base_override_subtotal=Decimal("63500.00"),
        base_material_override=Decimal("45000.00"),
        base_process_override=Decimal("18500.00"),
    )

    assert result["subtotal"] == Decimal("63500.00")
    assert result["material_cost"] == Decimal("45000.00")
    assert result["process_cost"] == Decimal("18500.00")
    assert result["overhead_amount"] == Decimal("7620.00")
    assert result["profit_amount"] == Decimal("10668.00")
    assert result["taxable_amount"] == Decimal("81788.00")
    assert result["cgst_amount"] == Decimal("7361.00")
    assert result["sgst_amount"] == Decimal("7361.00")
    assert result["gst_amount"] == Decimal("14722.00")
    assert result["final_total"] == Decimal("96510.00")
    assert "Ninety-Six Thousand Five Hundred and Ten" in result["final_total_in_words"]


def test_interstate_igst():
    """Test 18% IGST on Interstate shipment."""
    req = CalculateQuotationRequest(
        items=[],
        overhead_percentage=Decimal("12.00"),
        profit_percentage=Decimal("15.00"),
        gst_type="IGST",
    )

    result = CalculationService.calculate_quotation(
        request=req,
        base_override_subtotal=Decimal("63500.00"),
    )

    assert result["taxable_amount"] == Decimal("81788.00")
    assert result["cgst_amount"] == Decimal("0.00")
    assert result["sgst_amount"] == Decimal("0.00")
    assert result["igst_amount"] == Decimal("14722.00")
    assert result["final_total"] == Decimal("96510.00")


def test_number_to_indian_words():
    assert number_to_indian_words(0) == "Indian Rupee Zero Only"
    assert number_to_indian_words(96510) == "Indian Rupee Ninety-Six Thousand Five Hundred and Ten Only"
    assert number_to_indian_words(1500000) == "Indian Rupee Fifteen Lakh Only"
