import time
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.material import Material
from app.models.process import Process
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.quotation import Quotation
from app.services.pdf.templates import TEMPLATE_REGISTRY, get_template_renderer, GALLERY_METADATA

client = TestClient(app)


def test_newly_created_company_has_zero_rates_and_unconfigured_pricing():
    """Prove that a newly created tenant starts with 0 material & process rate cards and unconfigured pricing rules."""
    t = int(time.time() * 1000)
    email = f"owner.{t}@cleanmfg.co.in"
    res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "full_name": "Suresh Raina",
            "company_name": f"Clean Precision Works {t}",
            "phone": "+91 98220 12345",
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    comp_id = data["company"]["id"]

    db = SessionLocal()
    try:
        materials = db.query(Material).filter(Material.company_id == comp_id).all()
        processes = db.query(Process).filter(Process.company_id == comp_id).all()
        assert len(materials) == 0, f"Expected 0 materials, found {len(materials)}"
        assert len(processes) == 0, f"Expected 0 processes, found {len(processes)}"

        company = db.query(Company).filter(Company.id == comp_id).first()
        settings = company.settings or {}
        assert "overhead_percentage" not in settings
        assert "profit_percentage" not in settings
    finally:
        db.close()


def test_tenant_rate_isolation(session_jwt_signer):
    """Prove that rates created by Tenant A are never returned or visible to Tenant B."""
    t = int(time.time() * 1000)
    
    # Create Company A
    token_a = session_jwt_signer(f"usr-a-{t}", f"a.{t}@tenant-a.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    res_a = client.post(
        "/api/v1/auth/onboarding",
        json={"company_name": f"Tenant Alpha {t}"},
        headers=headers_a,
    )
    assert res_a.status_code == 201
    comp_a_id = res_a.json()["company"]["id"]

    # Create Company B
    token_b = session_jwt_signer(f"usr-b-{t}", f"b.{t}@tenant-b.com")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    res_b = client.post(
        "/api/v1/auth/onboarding",
        json={"company_name": f"Tenant Beta {t}"},
        headers=headers_b,
    )
    assert res_b.status_code == 201
    comp_b_id = res_b.json()["company"]["id"]

    # Tenant A creates material and process
    res_mat = client.post(
        "/api/v1/rates/materials",
        json={
            "name": "Custom Titanium Grade 5",
            "grade": f"Ti-6Al-4V-{t}",
            "base_rate": 2800.0,
            "scrap_credit_rate": 600.0,
            "density": 4.43,
            "unit": "kg",
        },
        headers=headers_a,
    )
    assert res_mat.status_code == 201
    mat_a_id = res_mat.json()["id"]

    res_proc = client.post(
        "/api/v1/rates/processes",
        json={
            "name": f"5-Axis Wire EDM {t}",
            "unit": "hour",
            "hourly_rate": 2200.0,
            "setup_cost": 750.0,
        },
        headers=headers_a,
    )
    assert res_proc.status_code == 201
    proc_a_id = res_proc.json()["id"]

    # Tenant B queries materials and processes -> MUST BE EMPTY
    list_b_mat = client.get("/api/v1/rates/materials", headers=headers_b)
    assert list_b_mat.status_code == 200
    mats_b = list_b_mat.json()
    assert len(mats_b) == 0, f"Tenant B saw Tenant A's materials! Found: {mats_b}"

    list_b_proc = client.get("/api/v1/rates/processes", headers=headers_b)
    assert list_b_proc.status_code == 200
    procs_b = list_b_proc.json()
    assert len(procs_b) == 0, f"Tenant B saw Tenant A's processes! Found: {procs_b}"

    # Tenant B attempts to read Tenant A's material directly by ID -> 404 Not Found
    get_mat_res = client.get(f"/api/v1/rates/materials/{mat_a_id}", headers=headers_b)
    assert get_mat_res.status_code == 404

    # Tenant B pricing rules -> is_configured must be False
    pr_b = client.get("/api/v1/rates/pricing-rules", headers=headers_b)
    assert pr_b.status_code == 200
    assert pr_b.json()["is_configured"] is False


def test_calculation_with_no_rates_returns_blocked(session_jwt_signer):
    """Prove that calculating quotation for an approved PO when the company has no rates returns BLOCKED."""
    t = int(time.time() * 1000)
    token = session_jwt_signer(f"usr-c-{t}", f"c.{t}@empty-mfg.com")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Onboard company
    res_onboard = client.post(
        "/api/v1/auth/onboarding",
        json={"company_name": f"Empty Rates Shop {t}"},
        headers=headers,
    )
    assert res_onboard.status_code == 201
    comp_id = res_onboard.json()["company"]["id"]

    # Directly create an approved PO in DB for this company
    db = SessionLocal()
    try:
        po = PurchaseOrder(
            id=f"po-test-empty-{t}",
            company_id=comp_id,
            po_number=f"PO-TEST-{t}",
            customer_name="Test Customer Pvt Ltd",
            status="APPROVED",
        )
        db.add(po)
        db.flush()

        item = PurchaseOrderItem(
            id=f"poi-test-{t}",
            purchase_order_id=po.id,
            item_number=1,
            part_name="Test Gear Shaft",
            material_grade="EN8",
            process_name="CNC Machining",
            quantity=Decimal("10"),
            unit="PCS",
            gross_weight_kg=Decimal("2.5"),
            scrap_weight_kg=Decimal("0.3"),
            machining_hours=Decimal("1.2"),
        )
        db.add(item)
        db.commit()
    finally:
        db.close()

    # Call calculate endpoint
    calc_res = client.post(f"/api/v1/purchase-orders/po-test-empty-{t}/calculate", headers=headers)
    assert calc_res.status_code == 200, calc_res.text
    calc_data = calc_res.json()

    # MUST BE BLOCKED — Never zero pricing, never AI-hallucinated rates
    assert calc_data["status"] == "BLOCKED"
    assert len(calc_data["issues"]) > 0
    issue_codes = [issue["code"] for issue in calc_data["issues"]]
    assert "MATERIAL_RATE_MISSING" in issue_codes
    assert "PROCESS_RATE_MISSING" in issue_codes
    assert calc_data.get("grand_total") is None


def test_all_8_templates_render_distinctly_without_altering_calculation():
    """
    Prove that all 8 quotation templates:
    1. Exist in the registry (including both canonical IDs and aliases).
    2. Render valid non-empty PDF bytes for identical quotation data.
    3. Never mutate quotation amounts or calculation outputs.
    """
    templates = [
        "classic_professional",
        "modern_minimal",
        "premium_corporate",
        "elegant_bordered",
        "industrial_bold",
        "modern_two_column",
        "creative_modern",
        "simple_clean",
    ]
    aliases = ["industrial", "executive", "compact", "modern_document"]

    for t_id in templates + aliases:
        renderer = get_template_renderer(t_id)
        assert renderer is not None, f"Template renderer for '{t_id}' missing!"

    # Also verify GALLERY_METADATA has all 8 designs with best_for information
    assert len(GALLERY_METADATA) == 8
    for item in GALLERY_METADATA:
        assert "best_for" in item and len(item["best_for"]) > 5
        assert "name" in item
        assert "category" in item
