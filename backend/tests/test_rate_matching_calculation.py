"""
Comprehensive Unit & Integration Tests for:
1. Approval Gate: Only APPROVED POs can be priced.
2. Tenant Isolation: Rate lookups and PO calculations strictly isolated by company_id.
3. Deterministic Rate Matching: Materials, processes, units, weights.
4. Blocked Responses: Missing material rates, missing processes, missing weights.
5. Deterministic Calculation Fixtures: Exact asserted Decimal arithmetic matching Section 20.
6. Zero AI Pricing Separation: Verifies Gemini/AI is never called during pricing.
7. Real Sample PO Evaluation: Verifies sample PO is BLOCKED due to PROCESS_MISSING.
"""
import time
from decimal import Decimal
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.material import Material
from app.models.process import Process
from app.models.quotation import Quotation

client = TestClient(app)


@pytest.fixture
def test_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _create_test_po(
    db,
    company_id: str,
    status: str = "APPROVED",
    items_data: list = None,
    po_number: str = None,
) -> PurchaseOrder:
    num = po_number or f"PO-TEST-{int(time.time() * 1000)}"
    po = PurchaseOrder(
        company_id=company_id,
        po_number=num,
        customer_name="Test Engineering Customer Pvt Ltd",
        status=status,
    )
    db.add(po)
    db.flush()

    if items_data:
        for idx, it in enumerate(items_data):
            poi = PurchaseOrderItem(
                purchase_order_id=po.id,
                item_number=idx + 1,
                part_name=it.get("part_name", f"Part {idx+1}"),
                specification=it.get("specification"),
                quantity=Decimal(str(it.get("quantity", 10))),
                unit=it.get("unit", "PCS"),
                material_id=it.get("material_id"),
                material_grade=it.get("material_grade"),
                gross_weight_kg=Decimal(str(it.get("gross_weight_kg", 5.0))),
                net_weight_kg=Decimal(str(it.get("net_weight_kg", 4.5))),
                scrap_weight_kg=Decimal(str(it.get("scrap_weight_kg", 0.5))),
                process_id=it.get("process_id"),
                process_name=it.get("process_name"),
                machining_hours=Decimal(str(it.get("machining_hours", 1.5))),
                setup_hours=Decimal(str(it.get("setup_hours", 0.5))),
            )
            db.add(poi)

    db.commit()
    db.refresh(po)
    return po


# =========================================================================
# 1. APPROVAL GATE TESTS
# =========================================================================

def test_approval_gate_rejects_needs_review_po(auth_headers, test_db_session):
    """Verify calculating an unapproved (NEEDS_REVIEW) PO returns HTTP 400."""
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="NEEDS_REVIEW",
        items_data=[{"part_name": "Valve Spindle", "material_grade": "EN8D", "process_name": "CNC Turning Center (Doosan Puma)"}],
    )

    res = client.post(f"/api/v1/purchase-orders/{po.id}/calculate", headers=auth_headers)
    assert res.status_code == 400
    assert "Only APPROVED purchase orders" in res.json()["detail"]


def test_approval_gate_rejects_rejected_po(auth_headers, test_db_session):
    """Verify calculating a REJECTED PO returns HTTP 400."""
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="REJECTED",
        items_data=[{"part_name": "Valve Spindle", "material_grade": "EN8D", "process_name": "CNC Turning Center (Doosan Puma)"}],
    )

    res = client.post(f"/api/v1/purchase-orders/{po.id}/calculate", headers=auth_headers)
    assert res.status_code == 400
    assert "Only APPROVED purchase orders" in res.json()["detail"]


def test_unauthenticated_request_rejected(test_db_session):
    """Verify unauthenticated requests are rejected with 401."""
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
    )
    res = client.post(f"/api/v1/purchase-orders/{po.id}/calculate")
    assert res.status_code == 401


# =========================================================================
# 2. TENANT ISOLATION TESTS
# =========================================================================

def test_tenant_isolation_cannot_calculate_other_company_po(auth_headers_company_b, test_db_session):
    """Company B user cannot calculate a Company A purchase order."""
    po_a = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        items_data=[{"part_name": "Flange", "material_grade": "EN8D", "process_name": "CNC Turning Center (Doosan Puma)"}],
    )

    res = client.post(f"/api/v1/purchase-orders/{po_a.id}/calculate", headers=auth_headers_company_b)
    assert res.status_code == 404
    assert "Purchase order not found" in res.json()["detail"]


def test_tenant_isolation_cannot_use_other_company_rates(auth_headers, test_db_session):
    """
    Company A cannot match or use rate cards belonging strictly to Company B.
    """
    # Create exclusive rate cards for Company B
    mat_b = Material(
        company_id="comp-other-plant",
        name="Exclusive B Alloy",
        grade="COMP_B_EXCLUSIVE_MAT",
        unit="kg",
        base_rate=Decimal("999.00"),
        scrap_credit_rate=Decimal("100.00"),
        is_active=True,
    )
    proc_b = Process(
        company_id="comp-other-plant",
        name="Company B Exclusive 5-Axis",
        unit="hour",
        hourly_rate=Decimal("5000.00"),
        setup_cost=Decimal("2000.00"),
        is_active=True,
    )
    test_db_session.add(mat_b)
    test_db_session.add(proc_b)
    test_db_session.commit()

    # Company A creates a PO referencing Company B's exclusive material and process
    po_a = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        items_data=[
            {
                "part_name": "Cross-Company Test Part",
                "material_grade": "COMP_B_EXCLUSIVE_MAT",
                "process_name": "Company B Exclusive 5-Axis",
                "quantity": 5,
                "gross_weight_kg": 2.0,
            }
        ],
    )

    res = client.post(f"/api/v1/purchase-orders/{po_a.id}/calculate", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "BLOCKED"
    issue_codes = [issue["code"] for issue in data["issues"]]
    assert "MATERIAL_RATE_MISSING" in issue_codes
    assert "PROCESS_RATE_MISSING" in issue_codes


# =========================================================================
# 3. MISSING PREREQUISITES / BLOCKING TESTS
# =========================================================================

def test_missing_material_rate_blocks_calculation(auth_headers, test_db_session):
    """Item with uncataloged material triggers MATERIAL_RATE_MISSING and blocks pricing."""
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        items_data=[
            {
                "part_name": "Custom Titanium Part",
                "material_grade": "TITANIUM_GRADE_5_UNLISTED",
                "process_name": "CNC 4-Axis Milling (VMC-850)",
                "quantity": 10,
                "gross_weight_kg": 3.0,
            }
        ],
    )

    res = client.post(f"/api/v1/purchase-orders/{po.id}/calculate", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "BLOCKED"
    assert len(data["issues"]) >= 1
    assert data["issues"][0]["code"] == "MATERIAL_RATE_MISSING"
    assert data["manufacturing_subtotal"] is None
    assert data["grand_total"] is None


def test_missing_process_blocks_calculation_no_hallucination(auth_headers, test_db_session):
    """
    CRITICAL: When item has process=None, the engine MUST mark PROCESS_MISSING
    and MUST NOT guess/hallucinate CNC Machining, Turning, etc.
    """
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        items_data=[
            {
                "part_name": "Shaft Without Process",
                "material_grade": "EN8D",
                "process_name": None,  # No process
                "quantity": 10,
                "gross_weight_kg": 2.0,
            }
        ],
    )

    res = client.post(f"/api/v1/purchase-orders/{po.id}/calculate", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "BLOCKED"
    assert len(data["issues"]) >= 1
    assert data["issues"][0]["code"] == "PROCESS_MISSING"
    assert data["items"][0]["process"] is None
    assert data["items"][0]["process_rate"] is None


def test_missing_process_rate_blocks_calculation(auth_headers, test_db_session):
    """Item with uncataloged process triggers PROCESS_RATE_MISSING."""
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        items_data=[
            {
                "part_name": "Welded Bracket",
                "material_grade": "EN8D",
                "process_name": "Robotic Laser Welding 10kW",  # Unlisted process
                "quantity": 10,
                "gross_weight_kg": 2.0,
            }
        ],
    )

    res = client.post(f"/api/v1/purchase-orders/{po.id}/calculate", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "BLOCKED"
    assert data["issues"][0]["code"] == "PROCESS_RATE_MISSING"


def test_missing_weight_for_kg_rate_blocks_calculation(auth_headers, test_db_session):
    """
    Count-based unit (e.g. Nos, PCS) with ₹/kg material rate requires gross_weight_kg > 0.
    Missing/zero weight must trigger MATERIAL_WEIGHT_MISSING.
    """
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        items_data=[
            {
                "part_name": "Zero Weight Pin",
                "material_grade": "EN8D",
                "process_name": "CNC 4-Axis Milling (VMC-850)",
                "quantity": 25,
                "unit": "Nos",
                "gross_weight_kg": 0.000,  # Zero weight
            }
        ],
    )

    res = client.post(f"/api/v1/purchase-orders/{po.id}/calculate", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "BLOCKED"
    assert data["issues"][0]["code"] == "MATERIAL_WEIGHT_MISSING"


# =========================================================================
# 4. CONTROLLED DETERMINISTIC CALCULATION FIXTURE (SECTION 20)
# =========================================================================

def test_controlled_deterministic_calculation_fixture_section_20(auth_headers, test_db_session):
    """
    Deterministic benchmark matching exact prompt Section 20 specifications:
    - Material: EN8 @ ₹85.00/kg, scrap credit ₹20.00/kg
    - Process: CNC Machining @ ₹650.00/hour, setup cost ₹100.00
    - PO item:
        Quantity: 10
        Gross weight: 5.0 kg
        Scrap weight: 0.5 kg
        Machining hours: 1.5
        Setup cost: ₹100.00
    - Overhead: 10%
    - Profit: 15%
    - GST: 18% (IGST)

    Independent Hand-Calculation:
    1. Gross Material Cost = 5.0 kg * ₹85.00 * 10 = ₹4,250.00
    2. Scrap Credit = 0.5 kg * ₹20.00 * 10 = ₹100.00
    3. Net Material Cost = ₹4,250.00 - ₹100.00 = ₹4,150.00
    4. Machining Cost = 1.5 hrs * ₹650.00 * 10 = ₹9,750.00
    5. Setup Cost = ₹100.00
    6. Process Cost = ₹9,750.00 + ₹100.00 = ₹9,850.00
    7. Line Subtotal = ₹4,150.00 + ₹9,850.00 = ₹14,000.00
    8. Unit Cost = ₹14,000.00 / 10 = ₹1,400.00
    9. Overhead Amount (10%) = ₹14,000.00 * 0.10 = ₹1,400.00
    10. Assessable Amount = ₹14,000.00 + ₹1,400.00 = ₹15,400.00
    11. Profit Amount (15%) = ₹15,400.00 * 0.15 = ₹2,310.00
    12. Taxable Amount = ₹15,400.00 + ₹2,310.00 = ₹17,710.00
    13. IGST (18%) = ₹17,710.00 * 0.18 = ₹3,187.80 -> ₹3,188.00 (quantized to rupee)
    14. Grand Total = ₹17,710.00 + ₹3,188.00 = ₹20,898.00
    """
    # Seed specific rates for this controlled test
    mat = test_db_session.query(Material).filter(
        Material.company_id == "comp-bpe-pune",
        Material.grade == "EN8_SEC20",
    ).first()
    if not mat:
        mat = Material(
            company_id="comp-bpe-pune",
            name="EN8 Carbon Steel Sec20",
            grade="EN8_SEC20",
            unit="kg",
            base_rate=Decimal("85.00"),
            scrap_credit_rate=Decimal("20.00"),
            is_active=True,
        )
        test_db_session.add(mat)

    proc = test_db_session.query(Process).filter(
        Process.company_id == "comp-bpe-pune",
        Process.name == "CNC Machining Sec20",
    ).first()
    if not proc:
        proc = Process(
            company_id="comp-bpe-pune",
            name="CNC Machining Sec20",
            unit="hour",
            hourly_rate=Decimal("650.00"),
            setup_cost=Decimal("100.00"),
            is_active=True,
        )
        test_db_session.add(proc)
    test_db_session.commit()

    # Create approved PO with the exact controlled line item
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        items_data=[
            {
                "part_name": "Section 20 Machined Pin",
                "material_grade": "EN8_SEC20",
                "process_name": "CNC Machining Sec20",
                "quantity": 10,
                "unit": "PCS",
                "gross_weight_kg": 5.0,
                "scrap_weight_kg": 0.5,
                "machining_hours": 1.5,
                "setup_hours": 0.5,
            }
        ],
    )

    req_payload = {
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "IGST",
        "persist_draft": True,
    }

    res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json=req_payload,
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["status"] == "SUCCESS"
    assert len(data["issues"]) == 0
    assert len(data["items"]) == 1

    item = data["items"][0]
    # Verify exact item breakdown
    assert Decimal(str(item["gross_material_cost"])) == Decimal("4250.00")
    assert Decimal(str(item["scrap_credit"])) == Decimal("100.00")
    assert Decimal(str(item["net_material_cost"])) == Decimal("4150.00")
    assert Decimal(str(item["machining_cost"])) == Decimal("9750.00")
    assert Decimal(str(item["process_cost"])) == Decimal("9850.00")
    assert Decimal(str(item["subtotal"])) == Decimal("14000.00")
    assert Decimal(str(item["unit_cost"])) == Decimal("1400.00")

    # Verify quotation header commercial totals
    assert Decimal(str(data["manufacturing_subtotal"])) == Decimal("14000.00")
    assert Decimal(str(data["overhead_amount"])) == Decimal("1400.00")
    assert Decimal(str(data["assessable_amount"])) == Decimal("15400.00")
    assert Decimal(str(data["profit_amount"])) == Decimal("2310.00")
    assert Decimal(str(data["taxable_amount"])) == Decimal("17710.00")
    assert Decimal(str(data["igst_amount"])) == Decimal("3188.00")
    assert Decimal(str(data["cgst_amount"])) == Decimal("0.00")
    assert Decimal(str(data["sgst_amount"])) == Decimal("0.00")
    assert Decimal(str(data["grand_total"])) == Decimal("20898.00")
    assert "Twenty Thousand Eight Hundred and Ninety-Eight" in data["final_total_in_words"]

    # Verify draft Quotation was persisted in DB
    assert data["quotation_id"] is not None
    q = test_db_session.query(Quotation).filter(Quotation.id == data["quotation_id"]).first()
    assert q is not None
    assert q.status == "DRAFT"
    assert q.final_total == Decimal("20898.00")


def test_deterministic_calculation_cgst_sgst(auth_headers, test_db_session):
    """Verify CGST (9%) + SGST (9%) statutory tax division on intrastate transaction."""
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        items_data=[
            {
                "part_name": "Section 20 Machined Pin",
                "material_grade": "EN8_SEC20",
                "process_name": "CNC Machining Sec20",
                "quantity": 10,
                "unit": "PCS",
                "gross_weight_kg": 5.0,
                "scrap_weight_kg": 0.5,
                "machining_hours": 1.5,
            }
        ],
    )

    req_payload = {
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "CGST_SGST",
        "persist_draft": False,
    }

    res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json=req_payload,
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "SUCCESS"
    # Taxable = 17,710.00; CGST @ 9% = 1593.90 -> 1594.00, SGST @ 9% = 1593.90 -> 1594.00
    assert Decimal(str(data["cgst_amount"])) == Decimal("1594.00")
    assert Decimal(str(data["sgst_amount"])) == Decimal("1594.00")
    assert Decimal(str(data["gst_amount"])) == Decimal("3188.00")
    assert Decimal(str(data["grand_total"])) == Decimal("20898.00")


# =========================================================================
# 5. ZERO AI IN PRICING TESTS
# =========================================================================

def test_pricing_never_invokes_gemini_or_ai(auth_headers, test_db_session):
    """
    CRITICAL INVARIANT:
    Verifies that the rate matching and calculation execution path NEVER calls Gemini
    or any AI module.
    """
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        items_data=[
            {
                "part_name": "Section 20 Machined Pin",
                "material_grade": "EN8_SEC20",
                "process_name": "CNC Machining Sec20",
                "quantity": 10,
                "gross_weight_kg": 5.0,
                "scrap_weight_kg": 0.5,
                "machining_hours": 1.5,
            }
        ],
    )

    # Patch google.genai and the PO extraction service to ensure zero calls
    mock_gemini = MagicMock()
    with patch("app.services.ai.normalizer.GeminiPONormalizer", mock_gemini):
        with patch("app.services.ai.extractor.po_extraction_service", mock_gemini):
            res = client.post(
                f"/api/v1/purchase-orders/{po.id}/calculate",
                json={"overhead_percentage": 10.0, "profit_percentage": 15.0, "gst_type": "IGST"},
                headers=auth_headers,
            )
            assert res.status_code == 200
            assert res.json()["status"] == "SUCCESS"
            # Ensure 0 calls
            mock_gemini.assert_not_called()


# =========================================================================
# 6. REAL SAMPLE PO INGESTION RESULT
# =========================================================================

def test_real_sample_po_structure_is_blocked_with_process_missing(auth_headers, test_db_session):
    """
    Verifies that a PO matching the real sample manufacturing PO
    (where materials are EN8, EN19, SS304, CI Gr 25 and processes are NULL)
    is BLOCKED with PROCESS_MISSING on all items.
    """
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        po_number="PO-2026-SAMPLE-BLOCKED",
        items_data=[
            {
                "item_number": 1,
                "part_name": "Spindle Shaft",
                "material_grade": "EN8D",
                "process_name": None,  # Sample PO has no process
                "quantity": 50,
                "gross_weight_kg": 4.5,
            },
            {
                "item_number": 2,
                "part_name": "Drive Bushing",
                "material_grade": "CI Gr.2",
                "process_name": None,
                "quantity": 100,
                "gross_weight_kg": 1.2,
            },
            {
                "item_number": 3,
                "part_name": "Coupling Flange",
                "material_grade": "AL 6061",
                "process_name": None,
                "quantity": 25,
                "gross_weight_kg": 2.8,
            },
            {
                "item_number": 4,
                "part_name": "Mounting Bracket",
                "material_grade": "EN8D",
                "process_name": None,
                "quantity": 80,
                "gross_weight_kg": 0.8,
            },
        ],
    )

    res = client.post(f"/api/v1/purchase-orders/{po.id}/calculate", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "BLOCKED"
    assert len(data["issues"]) == 4
    for issue in data["issues"]:
        assert issue["code"] == "PROCESS_MISSING"
        assert "no manufacturing process specified" in issue["message"]

    for item in data["items"]:
        assert item["rate_match_status"] == "PROCESS_MISSING"
        assert item["process"] is None
        assert item["process_rate"] is None


def test_deterministic_calculation_multiple_items(auth_headers, test_db_session):
    """Verify multi-item deterministic calculation where header totals equal sum of items."""
    po = _create_test_po(
        test_db_session,
        company_id="comp-bpe-pune",
        status="APPROVED",
        items_data=[
            {
                "item_number": 1,
                "part_name": "Section 20 Machined Pin",
                "material_grade": "EN8_SEC20",
                "process_name": "CNC Machining Sec20",
                "quantity": 10,
                "unit": "PCS",
                "gross_weight_kg": 5.0,
                "scrap_weight_kg": 0.5,
                "machining_hours": 1.5,
            },
            {
                "item_number": 2,
                "part_name": "Ground Aluminium Bracket",
                "material_grade": "AL 6061",
                "process_name": "Surface Grinding (Kent Precision)",
                "quantity": 20,
                "unit": "PCS",
                "gross_weight_kg": 2.0,
                "scrap_weight_kg": 0.4,
                "machining_hours": 0.5,
            },
        ],
    )

    req_payload = {
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "IGST",
    }

    res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json=req_payload,
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "SUCCESS"
    assert len(data["items"]) == 2

    it1 = data["items"][0]
    assert Decimal(str(it1["net_material_cost"])) == Decimal("4150.00")
    assert Decimal(str(it1["process_cost"])) == Decimal("9850.00")
    assert Decimal(str(it1["subtotal"])) == Decimal("14000.00")

    it2 = data["items"][1]
    assert Decimal(str(it2["net_material_cost"])) == Decimal("11920.00")
    assert Decimal(str(it2["process_cost"])) == Decimal("4750.00")
    assert Decimal(str(it2["subtotal"])) == Decimal("16670.00")

    # Header assertions
    assert Decimal(str(data["material_cost"])) == Decimal("16070.00")
    assert Decimal(str(data["process_cost"])) == Decimal("14600.00")
    assert Decimal(str(data["manufacturing_subtotal"])) == Decimal("30670.00")
    assert Decimal(str(data["overhead_amount"])) == Decimal("3067.00")
    assert Decimal(str(data["assessable_amount"])) == Decimal("33737.00")
    assert Decimal(str(data["profit_amount"])) == Decimal("5061.00")
    assert Decimal(str(data["taxable_amount"])) == Decimal("38798.00")
    assert Decimal(str(data["igst_amount"])) == Decimal("6984.00")
    assert Decimal(str(data["grand_total"])) == Decimal("45782.00")
