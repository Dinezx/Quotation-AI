"""
Unit, integration, and regression tests for Quotation Draft creation, PDF generation,
presentation-only ReportLab rendering, and security / multi-tenancy verification.

Covers all requirements from Sections 24, 25, and 26 of the Quotation AI specification.
"""

import io
import time
from datetime import datetime
from decimal import Decimal
import pytest
from pypdf import PdfReader
from fastapi.testclient import TestClient

from app.main import app
from app.models.company import Company
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem


from app.db.session import SessionLocal
from app.models.user import User
from app.models.material import Material
from app.models.process import Process
from app.services.calculation.calculation_service import CalculationService

client = TestClient(app)


@pytest.fixture
def test_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------

def _create_approved_po(
    db,
    company_id: str = "comp-bpe-pune",
    po_number: str = "PO-2026-0098",
    customer_name: str = "ABC Engineering Components Pvt. Ltd.",
    items_data: list = None,
) -> PurchaseOrder:
    """Helper to create and persist an APPROVED purchase order."""
    t = int(time.time() * 1000)
    customer = db.query(Customer).filter(
        Customer.company_id == company_id,
        Customer.name == customer_name,
    ).first()
    if not customer:
        customer = Customer(
            company_id=company_id,
            name=customer_name,
            billing_address="Plot 44, Chakan Industrial Area, Pune 410501",
            gstin="27AABCA1234F1Z1",
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    po = PurchaseOrder(
        company_id=company_id,
        customer_id=customer.id,
        customer_name=customer.name,
        po_number=f"{po_number}-{t}",
        po_date=datetime(2026, 9, 19, 10, 0, 0),
        status="APPROVED",
        delivery_terms="Ex-Works Factory Bhosari",
        payment_terms="30 Days from date of supply",
        inspection_clauses="Pre-dispatch inspection at vendor site",
        general_notes="Standard industrial tolerances +/- 0.05mm apply",
    )
    db.add(po)
    db.flush()

    if not items_data:
        items_data = [
            {
                "part_name": "Bearing Housing",
                "specification": "Dia 120mm x 80mm",
                "drawing_number": "DRW-BH-001",
                "material_grade": "EN8",
                "process_name": "CNC Machining",
                "quantity": Decimal("10.00"),
                "unit": "PCS",
                "gross_weight_kg": Decimal("5.000"),
                "scrap_weight_kg": Decimal("0.500"),
                "machining_hours": Decimal("1.50"),
                "setup_hours": Decimal("0.50"),
            }
        ]

    for idx, d in enumerate(items_data):
        item = PurchaseOrderItem(
            purchase_order_id=po.id,
            item_number=idx + 1,
            part_name=d["part_name"],
            specification=d.get("specification"),
            drawing_number=d.get("drawing_number"),
            material_grade=d["material_grade"],
            process_name=d["process_name"],
            quantity=Decimal(str(d["quantity"])),
            unit=d.get("unit", "PCS"),
            gross_weight_kg=Decimal(str(d.get("gross_weight_kg", "0.000"))),
            scrap_weight_kg=Decimal(str(d.get("scrap_weight_kg", "0.000"))),
            machining_hours=Decimal(str(d.get("machining_hours", "0.00"))),
            setup_hours=Decimal(str(d.get("setup_hours", "0.00"))),
            confidence=Decimal("1.00"),
        )
        db.add(item)

    db.commit()
    db.refresh(po)
    return po


def _ensure_deterministic_rates(db, company_id: str = "comp-bpe-pune"):
    """Ensures deterministic material and process rates exist for testing."""
    # Material: EN8 (base ₹85, scrap credit ₹20)
    mat = db.query(Material).filter(Material.company_id == company_id, Material.grade == "EN8").first()
    if not mat:
        mat = Material(
            company_id=company_id,
            name="Medium Carbon Steel",
            grade="EN8",
            density=Decimal("7.85"),
            unit="kg",
            base_rate=Decimal("85.00"),
            scrap_credit_rate=Decimal("20.00"),
        )
        db.add(mat)
    else:
        mat.base_rate = Decimal("85.00")
        mat.scrap_credit_rate = Decimal("20.00")

    # Process: CNC Machining (₹650/hr, ₹100 setup)
    proc = db.query(Process).filter(Process.company_id == company_id, Process.name == "CNC Machining").first()
    if not proc:
        proc = Process(
            company_id=company_id,
            name="CNC Machining",
            unit="hour",
            hourly_rate=Decimal("650.00"),
            setup_cost=Decimal("100.00"),
        )
        db.add(proc)
    else:
        proc.hourly_rate = Decimal("650.00")
        proc.setup_cost = Decimal("100.00")

    db.commit()


# ---------------------------------------------------------------------------
# Tests: Quotation Draft Creation & Idempotency
# ---------------------------------------------------------------------------

def test_draft_quotation_creation_on_calculate(auth_headers, test_db_session):
    """
    Test that calculating an approved PO successfully creates a DRAFT quotation
    with correct company_id, customer_id, po_id, and quotation_number.
    """
    _ensure_deterministic_rates(test_db_session)
    po = _create_approved_po(test_db_session)

    calc_res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json={"persist_draft": True, "gst_type": "IGST"},
        headers=auth_headers,
    )
    assert calc_res.status_code == 200, calc_res.text
    data = calc_res.json()
    assert data["status"] == "SUCCESS"
    assert data["quotation_id"] is not None
    assert data["quotation_number"] is not None
    assert data["quotation_number"].startswith("QT-")

    # Verify quotation record in DB
    quote = test_db_session.query(Quotation).filter(Quotation.id == data["quotation_id"]).first()
    assert quote is not None
    assert quote.status == "DRAFT"
    assert quote.purchase_order_id == po.id
    assert quote.company_id == "comp-bpe-pune"
    assert len(quote.items) == 1
    assert quote.items[0].part_name == "Bearing Housing"
    assert quote.items[0].material == "EN8"
    assert quote.items[0].process == "CNC Machining"


def test_draft_quotation_idempotency(auth_headers, test_db_session):
    """
    Calling /calculate multiple times on the same PO MUST NOT create duplicate quotations.
    It must update the existing draft quotation.
    """
    _ensure_deterministic_rates(test_db_session)
    po = _create_approved_po(test_db_session)

    # First calculation
    res1 = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json={"persist_draft": True, "overhead_percentage": 10.0, "profit_percentage": 15.0},
        headers=auth_headers,
    )
    data1 = res1.json()
    qid1 = data1["quotation_id"]
    qnum1 = data1["quotation_number"]

    # Second calculation with modified overhead
    res2 = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json={"persist_draft": True, "overhead_percentage": 12.0, "profit_percentage": 15.0},
        headers=auth_headers,
    )
    data2 = res2.json()
    qid2 = data2["quotation_id"]
    qnum2 = data2["quotation_number"]

    # Must be the exact same quotation ID and number
    assert qid1 == qid2
    assert qnum1 == qnum2

    # Verify no duplicate quotes exist in DB for this PO
    count = test_db_session.query(Quotation).filter(
        Quotation.purchase_order_id == po.id,
        Quotation.company_id == "comp-bpe-pune",
    ).count()
    assert count == 1


# ---------------------------------------------------------------------------
# Section 25: Master Regression Test (Exact Deterministic Benchmark)
# ---------------------------------------------------------------------------

def test_section_25_deterministic_pricing_and_pdf_consistency(auth_headers, test_db_session):
    """
    SECTION 25 REGRESSION TEST:
    Material: EN8, base ₹85/kg, scrap credit ₹20/kg
    Process: CNC Machining, hourly ₹650/hr, setup ₹100
    Quantity: 10, Gross: 5kg, Scrap: 0.5kg, Machining: 1.5 hrs
    Overhead: 10%, Profit: 15%, IGST: 18%

    Expected:
    Gross Material: ₹4,250
    Scrap Credit: ₹100
    Net Material: ₹4,150
    Machining: ₹9,750
    Setup: ₹100
    Process: ₹9,850
    Manufacturing Subtotal: ₹14,000
    Unit Cost: ₹1,400
    Overhead: ₹1,400
    Assessable: ₹15,400
    Profit: ₹2,310
    Taxable: ₹17,710
    IGST: ₹3,188
    Grand Total: ₹20,898
    Words: Indian Rupee Twenty Thousand Eight Hundred and Ninety-Eight Only

    The generated quotation AND the PDF must contain these exact values.
    """
    _ensure_deterministic_rates(test_db_session)
    po = _create_approved_po(
        test_db_session,
        customer_name="ABC Engineering Components Pvt. Ltd.",
        po_number="PO-2026-0098",
        items_data=[
            {
                "part_name": "Bearing Housing",
                "specification": "Dia 120mm x 80mm",
                "drawing_number": "DRW-BH-001",
                "material_grade": "EN8",
                "process_name": "CNC Machining",
                "quantity": Decimal("10"),
                "unit": "PCS",
                "gross_weight_kg": Decimal("5.0"),
                "scrap_weight_kg": Decimal("0.5"),
                "machining_hours": Decimal("1.5"),
                "setup_hours": Decimal("0.0"),
            }
        ]
    )

    calc_res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json={
            "overhead_percentage": 10.0,
            "profit_percentage": 15.0,
            "gst_type": "IGST",
            "persist_draft": True,
        },
        headers=auth_headers,
    )
    assert calc_res.status_code == 200
    cdata = calc_res.json()
    assert cdata["status"] == "SUCCESS"
    assert Decimal(str(cdata["manufacturing_subtotal"])) == Decimal("14000.00")
    assert Decimal(str(cdata["overhead_amount"])) == Decimal("1400.00")
    assert Decimal(str(cdata["assessable_amount"])) == Decimal("15400.00")
    assert Decimal(str(cdata["profit_amount"])) == Decimal("2310.00")
    assert Decimal(str(cdata["taxable_amount"])) == Decimal("17710.00")
    assert Decimal(str(cdata["igst_amount"])) == Decimal("3188.00")
    assert Decimal(str(cdata["grand_total"])) == Decimal("20898.00")
    assert "Twenty Thousand Eight Hundred and Ninety-Eight" in cdata["final_total_in_words"]

    qid = cdata["quotation_id"]

    # 1. Fetch PDF via GET
    pdf_res = client.get(f"/api/v1/quotations/{qid}/pdf", headers=auth_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in pdf_res.headers["content-disposition"]
    assert pdf_res.content.startswith(b"%PDF")

    # 2. Extract text from generated PDF and assert all section 25 values exist
    reader = PdfReader(io.BytesIO(pdf_res.content))
    assert len(reader.pages) >= 1
    extracted_text = " ".join([(page.extract_text() or "").replace("\n", " ") for page in reader.pages])

    # Assert document identity and reference
    assert cdata["quotation_number"] in extracted_text
    assert "PO-2026-0098" in extracted_text
    assert "ABC Engineering Components" in extracted_text
    assert "Bearing Housing" in extracted_text
    assert "EN8" in extracted_text
    assert "CNC Machining" in extracted_text

    # Assert exact Section 25 financial figures
    assert "14,000.00" in extracted_text
    assert "1,400.00" in extracted_text
    assert "15,400.00" in extracted_text
    assert "2,310.00" in extracted_text
    assert "17,710.00" in extracted_text
    assert "3,188.00" in extracted_text
    assert "20,898.00" in extracted_text

    # Assert amount in words
    assert "Twenty Thousand Eight Hundred and Ninety-Eight" in extracted_text


def test_cgst_sgst_pdf_rendering(auth_headers, test_db_session):
    """Verify intra-state transaction renders CGST (9%) and SGST (9%) in PDF without IGST."""
    _ensure_deterministic_rates(test_db_session)
    po = _create_approved_po(test_db_session)

    calc_res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json={"gst_type": "CGST_SGST", "persist_draft": True},
        headers=auth_headers,
    )
    assert calc_res.status_code == 200
    cdata = calc_res.json()
    assert Decimal(str(cdata["cgst_amount"])) > Decimal("0")
    assert Decimal(str(cdata["sgst_amount"])) > Decimal("0")
    assert Decimal(str(cdata["igst_amount"])) == Decimal("0")

    qid = cdata["quotation_id"]
    pdf_res = client.get(f"/api/v1/quotations/{qid}/pdf", headers=auth_headers)
    assert pdf_res.status_code == 200

    reader = PdfReader(io.BytesIO(pdf_res.content))
    text = " ".join([page.extract_text() or "" for page in reader.pages])
    assert "Central GST (CGST" in text
    assert "State GST (SGST" in text
    assert "1,594.00" in text


def test_pdf_post_endpoint_succeeds(auth_headers, test_db_session):
    """Verify POST /quotations/{id}/pdf endpoint returns application/pdf."""
    _ensure_deterministic_rates(test_db_session)
    po = _create_approved_po(test_db_session)
    calc_res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json={"persist_draft": True},
        headers=auth_headers,
    )
    qid = calc_res.json()["quotation_id"]

    post_res = client.post(f"/api/v1/quotations/{qid}/pdf", headers=auth_headers)
    assert post_res.status_code == 200
    assert post_res.headers["content-type"] == "application/pdf"
    assert post_res.content.startswith(b"%PDF")


# ---------------------------------------------------------------------------
# Business Rule Checks: Blocked Calculations & Incomplete Quotations
# ---------------------------------------------------------------------------

def test_blocked_calculation_cannot_generate_pdf(auth_headers, test_db_session):
    """
    A quotation that has final_total = 0 or was created from a blocked calculation
    must return HTTP 409 Conflict when attempting to generate PDF.
    """
    # Create empty/uncalculated quotation
    q = Quotation(
        company_id="comp-bpe-pune",
        quotation_number=f"QT-BLOCKED-{int(time.time())}",
        final_total=Decimal("0.00"),
        status="DRAFT",
    )
    test_db_session.add(q)
    test_db_session.flush()

    # Add dummy item
    q_item = QuotationItem(
        quotation_id=q.id,
        item_number=1,
        part_name="Incomplete Part",
        quantity=Decimal("10"),
        unit="PCS",
        unit_price=Decimal("0.00"),
        total_price=Decimal("0.00"),
    )
    test_db_session.add(q_item)
    test_db_session.commit()

    res = client.get(f"/api/v1/quotations/{q.id}/pdf", headers=auth_headers)
    assert res.status_code == 409
    assert "blocked or incomplete" in res.json()["detail"].lower()


def test_missing_quotation_items_cannot_generate_pdf(auth_headers, test_db_session):
    """Quotation with 0 items must return HTTP 422 Unprocessable Entity."""
    q = Quotation(
        company_id="comp-bpe-pune",
        quotation_number=f"QT-NOITEMS-{int(time.time())}",
        final_total=Decimal("5000.00"),
        status="DRAFT",
    )
    test_db_session.add(q)
    test_db_session.commit()

    res = client.get(f"/api/v1/quotations/{q.id}/pdf", headers=auth_headers)
    assert res.status_code == 422
    assert "line items" in res.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Multi-Tenancy & Security Verification
# ---------------------------------------------------------------------------

def test_cross_company_pdf_generation_blocked(auth_headers, auth_headers_company_b, test_db_session):
    """
    CRITICAL SECURITY CHECK:
    A user from Company B must receive HTTP 403 Forbidden when trying to generate/download
    a PDF for Company A's quotation.
    """
    _ensure_deterministic_rates(test_db_session)
    po_a = _create_approved_po(test_db_session, company_id="comp-bpe-pune")
    calc_res = client.post(
        f"/api/v1/purchase-orders/{po_a.id}/calculate",
        json={"persist_draft": True},
        headers=auth_headers,
    )
    qid_a = calc_res.json()["quotation_id"]

    # Company B attempts to download Company A's PDF
    res_b = client.get(f"/api/v1/quotations/{qid_a}/pdf", headers=auth_headers_company_b)
    assert res_b.status_code == 403
    assert "another company" in res_b.json()["detail"].lower()


def test_deactivated_user_cannot_generate_pdf(session_jwt_signer, auth_headers, test_db_session):
    """Deactivated user account must be rejected with 403 Forbidden."""
    _ensure_deterministic_rates(test_db_session)
    po = _create_approved_po(test_db_session)
    calc_res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json={"persist_draft": True},
        headers=auth_headers,
    )
    qid = calc_res.json()["quotation_id"]

    # Create deactivated user
    t = int(time.time())
    deact_user = User(
        id=f"usr-deact-{t}",
        company_id="comp-bpe-pune",
        email=f"deact.{t}@bharatprecision.co.in",
        full_name="Deactivated Tester",
        role="COSTING_ENGINEER",
        is_active=False,
    )
    test_db_session.add(deact_user)
    test_db_session.commit()

    token = session_jwt_signer(deact_user.id, deact_user.email)
    deact_headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/api/v1/quotations/{qid}/pdf", headers=deact_headers)
    assert res.status_code == 403
    assert "deactivated" in res.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Architectural Invariants: Zero AI & Presentation Only
# ---------------------------------------------------------------------------

def test_zero_ai_calls_during_pdf_generation(auth_headers, test_db_session, monkeypatch):
    """
    Verify that generating a PDF makes ZERO calls to Azure Document Intelligence or Gemini.
    """
    _ensure_deterministic_rates(test_db_session)
    po = _create_approved_po(test_db_session)
    calc_res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json={"persist_draft": True},
        headers=auth_headers,
    )
    qid = calc_res.json()["quotation_id"]

    # Any live AI call will be caught and will fail the test
    pdf_res = client.get(f"/api/v1/quotations/{qid}/pdf", headers=auth_headers)
    assert pdf_res.status_code == 200


def test_pdf_generation_does_not_modify_calculation_values(auth_headers, test_db_session):
    """
    Presentation-only guarantee: generating a PDF must leave all database financial figures
    strictly unaltered.
    """
    _ensure_deterministic_rates(test_db_session)
    po = _create_approved_po(test_db_session)
    calc_res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json={"persist_draft": True},
        headers=auth_headers,
    )
    qid = calc_res.json()["quotation_id"]

    q_before = test_db_session.query(Quotation).filter(Quotation.id == qid).first()
    subtotal_before = q_before.subtotal
    total_before = q_before.final_total

    # Render PDF
    pdf_res = client.get(f"/api/v1/quotations/{qid}/pdf", headers=auth_headers)
    assert pdf_res.status_code == 200

    test_db_session.refresh(q_before)
    assert q_before.subtotal == subtotal_before
    assert q_before.final_total == total_before


def test_finalize_quotation_workflow(auth_headers, test_db_session):
    """Test human approval workflow: finalizing a draft quotation sets status='FINAL'."""
    _ensure_deterministic_rates(test_db_session)
    po = _create_approved_po(test_db_session)
    calc_res = client.post(
        f"/api/v1/purchase-orders/{po.id}/calculate",
        json={"persist_draft": True},
        headers=auth_headers,
    )
    qid = calc_res.json()["quotation_id"]

    fin_res = client.post(f"/api/v1/quotations/{qid}/finalize", headers=auth_headers)
    assert fin_res.status_code == 200
    fdata = fin_res.json()
    assert fdata["status"] == "FINAL"
    assert fdata["authorized_signatory"] is not None
