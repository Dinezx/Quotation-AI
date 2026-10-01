import time
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.material import Material
from app.models.process import Process
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem

client = TestClient(app)


def test_multi_industry_scenarios(session_jwt_signer):
    """
    Test 4 distinct manufacturing industries:
    A. Auto components (Hourly rate, Per KG base, scrap credit, Intrastate GST, ROUND_HALF_UP)
    B. Garments (Per Meter, Per Piece, Intrastate GST 5%, EXACT_2_DECIMALS)
    C. Pumps (Per KG, Per Operation, Per Piece, Interstate IGST 18%, ROUND_HALF_UP)
    D. Dairy / Food Processing (Per Litre, Per Batch, Per Piece, Fixed, EXEMPT 0%, EXACT_2_DECIMALS)
    
    Verifies that:
    1. Each company defines its own flexible cost components and rate bases.
    2. Scrap credit is recorded as a positive credit and subtracted for net cost.
    3. Calculation uses only the company's real rates and pricing rules.
    4. Deterministic pure Decimal arithmetic with 0 float errors.
    """
    t = int(time.time() * 1000)

    # ---------------- INDUSTRY A: AUTO COMPONENTS ----------------
    token_auto = session_jwt_signer(f"usr-auto-{t}", f"auto.{t}@autoparts.in")
    headers_auto = {"Authorization": f"Bearer {token_auto}"}
    res_onboard_auto = client.post(
        "/api/v1/auth/onboarding",
        json={"company_name": f"Apex Auto Precision {t}"},
        headers=headers_auto,
    )
    assert res_onboard_auto.status_code == 201
    comp_auto_id = res_onboard_auto.json()["company"]["id"]

    # Auto: Material (Base Rate ₹320, Scrap Credit ₹110, Net ₹210)
    mat_res_auto = client.post(
        "/api/v1/rates/materials",
        json={
            "name": "Medium Carbon Forging Steel",
            "grade": f"EN8D-{t}",
            "unit": "kg",
            "base_rate": 320.0,
            "scrap_credit_rate": 110.0,
            "density": 7.85,
        },
        headers=headers_auto,
    )
    assert mat_res_auto.status_code == 201
    mat_auto = mat_res_auto.json()
    assert Decimal(str(mat_auto["base_rate"])) == Decimal("320.00")
    assert Decimal(str(mat_auto["scrap_credit_rate"])) == Decimal("110.00")

    # Auto: Cost Component (Machining - Per Hour)
    proc_res_auto = client.post(
        "/api/v1/rates/processes",
        json={
            "name": f"CNC Turning & Milling {t}",
            "rate_basis": "Per Hour",
            "rate": 600.0,
            "hourly_rate": 600.0,
            "setup_cost": 500.0,
            "unit": "hour",
        },
        headers=headers_auto,
    )
    assert proc_res_auto.status_code == 201
    proc_auto = proc_res_auto.json()
    assert proc_auto["rate_basis"] == "Per Hour"
    assert Decimal(str(proc_auto["rate"])) == Decimal("600.00")

    # Auto: Pricing Rules (10% overhead, 15% profit, 18% CGST_SGST, ROUND_HALF_UP)
    rules_res_auto = client.put(
        "/api/v1/rates/pricing-rules",
        json={
            "overhead_percentage": 10.0,
            "profit_percentage": 15.0,
            "gst_type": "CGST_SGST",
            "default_gst_rate": 18.0,
            "rounding_method": "ROUND_HALF_UP",
        },
        headers=headers_auto,
    )
    assert rules_res_auto.status_code == 200
    assert rules_res_auto.json()["rounding_method"] == "ROUND_HALF_UP"

    # Create PO for Auto: 100 pcs, 2 kg gross, 0.5 kg scrap per pc -> total mat = 100 * (2*320 - 0.5*110) = 100 * (640 - 55) = 100 * 585 = 58,500
    # Process: 100 pcs * 0.25 hrs/pc = 25 hrs * 600 = 15,000 + 500 setup = 15,500
    # Subtotal = 58,500 + 15,500 = 74,000
    # Overhead 10% = 7,400 -> Assessable = 81,400
    # Profit 15% = 12,210 -> Taxable = 93,610
    # GST 18% = 16,849.80 -> Grand Total = 110,459.80 -> Round Half Up = 110,460.00
    db = SessionLocal()
    try:
        po_auto = PurchaseOrder(
            id=f"po-auto-{t}",
            company_id=comp_auto_id,
            po_number=f"PO-AUTO-{t}",
            customer_name="Tata Motors Vendor Desk",
            status="APPROVED",
        )
        db.add(po_auto)
        db.flush()

        item_auto = PurchaseOrderItem(
            id=f"poi-auto-{t}",
            purchase_order_id=po_auto.id,
            item_number=1,
            part_name="Drive Shaft Coupling",
            material_grade=f"EN8D-{t}",
            process_name=f"CNC Turning & Milling {t}",
            quantity=Decimal("100"),
            unit="PCS",
            gross_weight_kg=Decimal("2.0"),
            scrap_weight_kg=Decimal("0.5"),
            machining_hours=Decimal("0.25"),
        )
        db.add(item_auto)
        db.commit()
    finally:
        db.close()

    calc_res_auto = client.post(f"/api/v1/purchase-orders/po-auto-{t}/calculate", headers=headers_auto)
    assert calc_res_auto.status_code == 200
    res_auto_data = calc_res_auto.json()
    assert res_auto_data["status"] == "SUCCESS"
    assert Decimal(str(res_auto_data["manufacturing_subtotal"])) == Decimal("74000.00")
    assert Decimal(str(res_auto_data["overhead_amount"])) == Decimal("7400.00")
    assert Decimal(str(res_auto_data["profit_amount"])) == Decimal("12210.00")
    assert Decimal(str(res_auto_data["taxable_amount"])) == Decimal("93610.00")
    assert Decimal(str(res_auto_data["gst_amount"])) == Decimal("16850.00")
    assert Decimal(str(res_auto_data["grand_total"])) == Decimal("110460.00")  # ROUND_HALF_UP

    # ---------------- INDUSTRY B: GARMENTS / TEXTILES ----------------
    token_garment = session_jwt_signer(f"usr-garment-{t}", f"textiles.{t}@garments.in")
    headers_garment = {"Authorization": f"Bearer {token_garment}"}
    res_onboard_garment = client.post(
        "/api/v1/auth/onboarding",
        json={"company_name": f"Classic Apparel Exports {t}"},
        headers=headers_garment,
    )
    assert res_onboard_garment.status_code == 201
    comp_garment_id = res_onboard_garment.json()["company"]["id"]

    # Garment: Material (Base Rate ₹450/meter, Scrap Credit ₹50/meter -> Net ₹400/meter)
    mat_res_garment = client.post(
        "/api/v1/rates/materials",
        json={
            "name": "Combed Cotton Single Jersey 180 GSM",
            "grade": f"Cotton-180GSM-{t}",
            "unit": "meter",
            "base_rate": 450.0,
            "scrap_credit_rate": 50.0,
            "density": 1.0,
        },
        headers=headers_garment,
    )
    assert mat_res_garment.status_code == 201
    mat_garment = mat_res_garment.json()
    assert mat_garment["unit"] == "meter"

    # Garment: Cost Component (Stitching - Per Piece)
    proc_res_garment = client.post(
        "/api/v1/rates/processes",
        json={
            "name": f"Garment Stitching & Seaming {t}",
            "rate_basis": "Per Piece",
            "rate": 35.0,
            "hourly_rate": 35.0,
            "setup_cost": 200.0,
            "unit": "piece",
        },
        headers=headers_garment,
    )
    assert proc_res_garment.status_code == 201

    # Garment: Pricing Rules (8% overhead, 20% profit, 5% GST, EXACT_2_DECIMALS)
    rules_res_garment = client.put(
        "/api/v1/rates/pricing-rules",
        json={
            "overhead_percentage": 8.0,
            "profit_percentage": 20.0,
            "gst_type": "CGST_SGST",
            "default_gst_rate": 5.0,
            "rounding_method": "EXACT_2_DECIMALS",
        },
        headers=headers_garment,
    )
    assert rules_res_garment.status_code == 200
    assert rules_res_garment.json()["rounding_method"] == "EXACT_2_DECIMALS"

    # PO for Garment: 200 pcs. Material: 1.5 meters gross, 0.1 meters scrap per pc.
    # Total Mat = 200 * (1.5*450 - 0.1*50) = 200 * (675 - 5) = 200 * 670 = 134,000
    # Process (Per Piece): 200 pcs * ₹35 = 7,000 + ₹200 setup = 7,200
    # Subtotal = 134,000 + 7,200 = 141,200
    # Overhead 8% = 11,296 -> Assessable = 152,496
    # Profit 20% = 30,499.20 -> Taxable = 182,995.20
    # GST 5% = 9,149.76 -> Grand Total = 192,144.96 (EXACT_2_DECIMALS)
    db = SessionLocal()
    try:
        po_garment = PurchaseOrder(
            id=f"po-garment-{t}",
            company_id=comp_garment_id,
            po_number=f"PO-GARMENT-{t}",
            customer_name="Retail Brand Buying Office",
            status="APPROVED",
        )
        db.add(po_garment)
        db.flush()

        item_garment = PurchaseOrderItem(
            id=f"poi-garment-{t}",
            purchase_order_id=po_garment.id,
            item_number=1,
            part_name="Men Crew Neck T-Shirt",
            material_grade=f"Cotton-180GSM-{t}",
            process_name=f"Garment Stitching & Seaming {t}",
            quantity=Decimal("200"),
            unit="PCS",
            gross_weight_kg=Decimal("1.5"),
            scrap_weight_kg=Decimal("0.1"),
            machining_hours=Decimal("1"),
        )
        db.add(item_garment)
        db.commit()
    finally:
        db.close()

    calc_res_garment = client.post(f"/api/v1/purchase-orders/po-garment-{t}/calculate", headers=headers_garment)
    assert calc_res_garment.status_code == 200
    res_garment_data = calc_res_garment.json()
    assert res_garment_data["status"] == "SUCCESS"
    assert Decimal(str(res_garment_data["manufacturing_subtotal"])) == Decimal("141200.00")
    assert Decimal(str(res_garment_data["overhead_amount"])) == Decimal("11296.00")
    assert Decimal(str(res_garment_data["profit_amount"])) == Decimal("30499.20")
    assert Decimal(str(res_garment_data["taxable_amount"])) == Decimal("182995.20")
    assert Decimal(str(res_garment_data["gst_amount"])) == Decimal("9149.76")
    assert Decimal(str(res_garment_data["grand_total"])) == Decimal("192144.96")

    # ---------------- INDUSTRY C: PUMPS & VALVES ----------------
    token_pump = session_jwt_signer(f"usr-pump-{t}", f"pump.{t}@flowtech.in")
    headers_pump = {"Authorization": f"Bearer {token_pump}"}
    res_onboard_pump = client.post(
        "/api/v1/auth/onboarding",
        json={"company_name": f"FlowTech Pumps & Valves {t}"},
        headers=headers_pump,
    )
    assert res_onboard_pump.status_code == 201
    comp_pump_id = res_onboard_pump.json()["company"]["id"]

    # Pump: Material (Cast Iron FG260 @ ₹180/kg, Scrap Credit ₹40/kg)
    client.post(
        "/api/v1/rates/materials",
        json={
            "name": "Grey Cast Iron FG260",
            "grade": f"CI-FG260-{t}",
            "unit": "kg",
            "base_rate": 180.0,
            "scrap_credit_rate": 40.0,
            "density": 7.20,
        },
        headers=headers_pump,
    )

    # Pump: Cost Component (Dynamic Balancing - Per Operation)
    client.post(
        "/api/v1/rates/processes",
        json={
            "name": f"Impeller Dynamic Balancing {t}",
            "rate_basis": "Per Operation",
            "rate": 75.0,
            "hourly_rate": 75.0,
            "setup_cost": 300.0,
            "unit": "op",
        },
        headers=headers_pump,
    )

    # Pump: Pricing Rules (12% overhead, 15% profit, 18% IGST, ROUND_HALF_UP)
    client.put(
        "/api/v1/rates/pricing-rules",
        json={
            "overhead_percentage": 12.0,
            "profit_percentage": 15.0,
            "gst_type": "IGST",
            "default_gst_rate": 18.0,
            "rounding_method": "ROUND_HALF_UP",
        },
        headers=headers_pump,
    )

    # PO for Pump: 50 pcs. Gross 8.0 kg, Scrap 1.5 kg per pc.
    # Total Mat = 50 * (8*180 - 1.5*40) = 50 * (1440 - 60) = 50 * 1380 = 69,000
    # Process (Per Operation): 50 ops * ₹75 = 3,750 + ₹300 setup = 4,050
    # Subtotal = 69,000 + 4,050 = 73,050
    # Overhead 12% = 8,766 -> Assessable = 81,816
    # Profit 15% = 12,272.40 -> Taxable = 94,088.40
    # IGST 18% = 16,935.912 -> Total = 111,024.312 -> Round Half Up = 111,024.00
    db = SessionLocal()
    try:
        po_pump = PurchaseOrder(
            id=f"po-pump-{t}",
            company_id=comp_pump_id,
            po_number=f"PO-PUMP-{t}",
            customer_name="Kirloskar Water Supply Project",
            status="APPROVED",
        )
        db.add(po_pump)
        db.flush()

        item_pump = PurchaseOrderItem(
            id=f"poi-pump-{t}",
            purchase_order_id=po_pump.id,
            item_number=1,
            part_name="Centrifugal Impeller",
            material_grade=f"CI-FG260-{t}",
            process_name=f"Impeller Dynamic Balancing {t}",
            quantity=Decimal("50"),
            unit="PCS",
            gross_weight_kg=Decimal("8.0"),
            scrap_weight_kg=Decimal("1.5"),
            machining_hours=Decimal("1"),
        )
        db.add(item_pump)
        db.commit()
    finally:
        db.close()

    calc_res_pump = client.post(f"/api/v1/purchase-orders/po-pump-{t}/calculate", headers=headers_pump)
    assert calc_res_pump.status_code == 200
    res_pump_data = calc_res_pump.json()
    assert res_pump_data["status"] == "SUCCESS"
    assert Decimal(str(res_pump_data["manufacturing_subtotal"])) == Decimal("73050.00")
    assert Decimal(str(res_pump_data["overhead_amount"])) == Decimal("8766.00")
    assert Decimal(str(res_pump_data["taxable_amount"])) == Decimal("94088.00")
    assert Decimal(str(res_pump_data["grand_total"])) == Decimal("111024.00")

    # ---------------- INDUSTRY D: DAIRY / FOOD PROCESSING ----------------
    token_dairy = session_jwt_signer(f"usr-dairy-{t}", f"dairy.{t}@amritmilk.in")
    headers_dairy = {"Authorization": f"Bearer {token_dairy}"}
    res_onboard_dairy = client.post(
        "/api/v1/auth/onboarding",
        json={"company_name": f"Amrit Dairy Processing {t}"},
        headers=headers_dairy,
    )
    assert res_onboard_dairy.status_code == 201
    comp_dairy_id = res_onboard_dairy.json()["company"]["id"]

    # Dairy: Material (Raw Milk Cow Grade-A @ ₹42/litre, Scrap Credit ₹0)
    client.post(
        "/api/v1/rates/materials",
        json={
            "name": "Raw Chilled Cow Milk",
            "grade": f"Milk-GradeA-{t}",
            "unit": "litre",
            "base_rate": 42.0,
            "scrap_credit_rate": 0.0,
            "density": 1.03,
        },
        headers=headers_dairy,
    )

    # Dairy: Cost Component (Batch Pasteurization - Per Batch)
    client.post(
        "/api/v1/rates/processes",
        json={
            "name": f"HTST Pasteurization {t}",
            "rate_basis": "Per Batch",
            "rate": 800.0,
            "hourly_rate": 800.0,
            "setup_cost": 0.0,
            "unit": "batch",
        },
        headers=headers_dairy,
    )

    # Dairy: Pricing Rules (5% overhead, 10% profit, EXEMPT 0% GST, EXACT_2_DECIMALS)
    client.put(
        "/api/v1/rates/pricing-rules",
        json={
            "overhead_percentage": 5.0,
            "profit_percentage": 10.0,
            "gst_type": "EXEMPT",
            "default_gst_rate": 0.0,
            "rounding_method": "EXACT_2_DECIMALS",
        },
        headers=headers_dairy,
    )

    # PO for Dairy: 1000 litres. Gross 1.0, Scrap 0.0 per unit.
    # Total Mat = 1000 * 42 = 42,000
    # Process (Per Batch): 1 batch = ₹800
    # Subtotal = 42,000 + 800 = 42,800
    # Overhead 5% = 2,140 -> Assessable = 44,940
    # Profit 10% = 4,494 -> Taxable = 49,434
    # GST (EXEMPT) = 0.0 -> Grand Total = 49,434.00
    db = SessionLocal()
    try:
        po_dairy = PurchaseOrder(
            id=f"po-dairy-{t}",
            company_id=comp_dairy_id,
            po_number=f"PO-DAIRY-{t}",
            customer_name="Cooperative Milk Union",
            status="APPROVED",
        )
        db.add(po_dairy)
        db.flush()

        item_dairy = PurchaseOrderItem(
            id=f"poi-dairy-{t}",
            purchase_order_id=po_dairy.id,
            item_number=1,
            part_name="Pasteurized Toned Milk Pack",
            material_grade=f"Milk-GradeA-{t}",
            process_name=f"HTST Pasteurization {t}",
            quantity=Decimal("1000"),
            unit="LTR",
            gross_weight_kg=Decimal("1.0"),
            scrap_weight_kg=Decimal("0.0"),
            machining_hours=Decimal("1"),
        )
        db.add(item_dairy)
        db.commit()
    finally:
        db.close()

    calc_res_dairy = client.post(f"/api/v1/purchase-orders/po-dairy-{t}/calculate", headers=headers_dairy)
    assert calc_res_dairy.status_code == 200
    res_dairy_data = calc_res_dairy.json()
    assert res_dairy_data["status"] == "SUCCESS"
    assert Decimal(str(res_dairy_data["manufacturing_subtotal"])) == Decimal("42800.00")
    assert Decimal(str(res_dairy_data["overhead_amount"])) == Decimal("2140.00")
    assert Decimal(str(res_dairy_data["profit_amount"])) == Decimal("4494.00")
    assert Decimal(str(res_dairy_data["taxable_amount"])) == Decimal("49434.00")
    assert Decimal(str(res_dairy_data["gst_amount"])) == Decimal("0.00")
    assert Decimal(str(res_dairy_data["grand_total"])) == Decimal("49434.00")


def test_unconfigured_pricing_rules_blocks_calculation(session_jwt_signer):
    """Rule 20: Ensure a new company cannot calculate a quotation until pricing rules and rates are configured."""
    t = int(time.time() * 1000)
    token = session_jwt_signer(f"usr-unconf-{t}", f"unconf.{t}@factory.in")
    headers = {"Authorization": f"Bearer {token}"}
    res_onboard = client.post(
        "/api/v1/auth/onboarding",
        json={"company_name": f"Unconfigured Rules Corp {t}"},
        headers=headers,
    )
    assert res_onboard.status_code == 201
    comp_id = res_onboard.json()["company"]["id"]

    # Add material and process so rates exist
    client.post(
        "/api/v1/rates/materials",
        json={
            "name": "Aluminum Rod",
            "grade": f"AL6061-{t}",
            "unit": "kg",
            "base_rate": 280.0,
            "scrap_credit_rate": 60.0,
        },
        headers=headers,
    )
    client.post(
        "/api/v1/rates/processes",
        json={
            "name": f"Milling-{t}",
            "rate_basis": "Per Hour",
            "rate": 500.0,
            "hourly_rate": 500.0,
        },
        headers=headers,
    )

    # But pricing rules are NOT configured
    db = SessionLocal()
    try:
        po = PurchaseOrder(
            id=f"po-unconf-{t}",
            company_id=comp_id,
            po_number=f"PO-UNCONF-{t}",
            customer_name="Test Customer",
            status="APPROVED",
        )
        db.add(po)
        db.flush()

        item = PurchaseOrderItem(
            id=f"poi-unconf-{t}",
            purchase_order_id=po.id,
            item_number=1,
            part_name="Bracket",
            material_grade=f"AL6061-{t}",
            process_name=f"Milling-{t}",
            quantity=Decimal("10"),
            unit="PCS",
            gross_weight_kg=Decimal("1.0"),
            scrap_weight_kg=Decimal("0.1"),
            machining_hours=Decimal("0.5"),
        )
        db.add(item)
        db.commit()
    finally:
        db.close()

    calc_res = client.post(f"/api/v1/purchase-orders/po-unconf-{t}/calculate", headers=headers)
    assert calc_res.status_code == 200
    data = calc_res.json()
    assert data["status"] == "BLOCKED"
    issue_codes = [i["code"] for i in data["issues"]]
    assert "PRICING_RULES_MISSING" in issue_codes
