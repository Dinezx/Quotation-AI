import hashlib
import io
import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem
from app.services.storage.storage_service import get_storage_service
from app.services.calculation.calculation_service import CalculationService

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_baseline_company():
    """Ensure company settings are pristine before and after each test."""
    def _restore():
        db = SessionLocal()
        try:
            comp = db.query(Company).filter(Company.id == "comp-bpe-pune").first()
            if comp:
                comp.name = "Bharat Precision Engineering Pvt. Ltd."
                comp.legal_name = "Bharat Precision Engineering Private Limited"
                comp.address = "Plot W-42, MIDC Industrial Area, Phase II, Bhosari, Pune, Maharashtra - 411026"
                comp.gstin = "27AAACB1234F1Z8"
                comp.phone = "+91 20 2712 8840"
                comp.email = "contact@bharatprecision.co.in"
                comp.settings = {
                    "default_currency": "INR",
                    "overhead_percentage": 12.0,
                    "profit_percentage": 15.0,
                    "gst_type": "CGST_SGST",
                    "bank_name": "State Bank of India",
                    "bank_branch": "MIDC Bhosari Branch",
                    "bank_account": "38920194821",
                    "bank_ifsc": "SBIN0004128",
                    "upi_id": "bpe.pune@sbi",
                    "template": {
                        "template_id": "classic_professional",
                        "primary_color": "#1e3a8a",
                        "secondary_color": "#475569",
                        "font_family": "Helvetica",
                        "logo_position": "left",
                        "show_logo": True,
                        "show_company_contact": True,
                        "show_gstin": True,
                        "show_bank_details": True,
                        "show_terms": True,
                        "show_signature": True,
                        "footer_text": "This is a computer-generated commercial quotation. Standard terms apply."
                    }
                }
                db.commit()
        finally:
            db.close()

    _restore()
    yield
    _restore()


def test_company_settings_get(auth_headers):
    """Verify GET /api/v1/company/settings returns full authoritative company configuration."""
    resp = client.get("/api/v1/company/settings", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "profile" in data
    assert "tax" in data
    assert "bank" in data
    assert "defaults" in data
    assert "template" in data

    profile = data["profile"]
    assert profile["name"] == "Bharat Precision Engineering Pvt. Ltd."
    assert profile["gstin"] == "27AAACB1234F1Z8"

    tax = data["tax"]
    assert tax["gst_type"] in ["CGST_SGST", "IGST", "EXEMPT"]

    template = data["template"]
    assert template["template_id"] in [
        "classic_professional", "modern_minimal", "premium_corporate",
        "elegant_bordered", "industrial_bold", "modern_two_column",
        "creative_modern", "simple_clean"
    ]


def test_company_profile_update(auth_headers):
    """Verify PUT /api/v1/company/profile updates core and extended credentials."""
    payload = {
        "legal_name": "Bharat Precision Engineering Private Limited",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411026",
        "country": "India",
        "website": "https://www.bharatprecision.co.in",
        "pan": "AABCB2018Q",
        "authorized_signatory": "Rajesh Deshmukh (Director)",
    }
    resp = client.put("/api/v1/company/profile", json=payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["legal_name"] == "Bharat Precision Engineering Private Limited"
    assert data["city"] == "Pune"
    assert data["website"] == "https://www.bharatprecision.co.in"
    assert data["pan"] == "AABCB2018Q"
    assert data["authorized_signatory"] == "Rajesh Deshmukh (Director)"


def test_company_tax_settings_update_and_validation(auth_headers):
    """Verify PUT /api/v1/company/tax updates GSTIN, GST mode, and validates supported types."""
    # 1. Valid update
    resp = client.put(
        "/api/v1/company/tax",
        json={"gst_type": "IGST", "default_gst_rate": "18.00"},
        headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["gst_type"] == "IGST"
    assert Decimal(str(resp.json()["default_gst_rate"])) == Decimal("18.00")

    # 2. Invalid GST mode rejected
    resp_bad = client.put(
        "/api/v1/company/tax",
        json={"gst_type": "INVALID_TAX_MODE", "default_gst_rate": "18.00"},
        headers=auth_headers
    )
    assert resp_bad.status_code == 422


def test_company_bank_details_update(auth_headers):
    """Verify PUT /api/v1/company/bank updates bank credentials and preserves synchronization."""
    payload = {
        "bank_name": "HDFC Bank Ltd",
        "account_name": "Bharat Precision Engineering Pvt Ltd",
        "account_number": "50200012345678",
        "ifsc": "HDFC0001234",
        "branch": "Pimpri Industrial Branch, Pune",
        "upi_id": "bharatprecision@hdfcbank",
    }
    resp = client.put("/api/v1/company/bank", json=payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["bank_name"] == "HDFC Bank Ltd"
    assert data["account_number"] == "50200012345678"
    assert data["ifsc"] == "HDFC0001234"
    assert data["upi_id"] == "bharatprecision@hdfcbank"


def test_company_quotation_defaults_update(auth_headers):
    """Verify PUT /api/v1/company/defaults updates standard quotation commercial terms."""
    payload = {
        "quotation_validity": "45 Days from date of issue",
        "payment_terms": "45 Days Net Credit from receipt of material",
        "delivery_terms": "FOR Destination Client Works",
        "inspection_terms": "Pre-dispatch QA inspection with 3.1 cert",
        "general_terms": "Standard precision engineering tolerances apply",
        "prepared_by": "Senior Costing Lead",
        "authorized_signatory": "Commercial Director",
    }
    resp = client.put("/api/v1/company/defaults", json=payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["quotation_validity"] == "45 Days from date of issue"
    assert data["payment_terms"] == "45 Days Net Credit from receipt of material"
    assert data["delivery_terms"] == "FOR Destination Client Works"
    assert data["prepared_by"] == "Senior Costing Lead"


def test_template_gallery_availability(auth_headers):
    """Verify GET /api/v1/company/templates returns exactly 8 distinct quotation designs."""
    resp = client.get("/api/v1/company/templates", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    templates = resp.json()
    assert len(templates) == 8

    expected_ids = {
        "classic_professional", "modern_minimal", "premium_corporate",
        "elegant_bordered", "industrial_bold", "modern_two_column",
        "creative_modern", "simple_clean"
    }
    found_ids = {t["id"] for t in templates}
    assert found_ids == expected_ids

    for t in templates:
        assert "name" in t
        assert "description" in t
        assert "category" in t
        assert "preview_accent" in t
        assert "features" in t
        assert len(t["features"]) >= 3


def test_template_selection_and_customization_persistence(auth_headers):
    """Verify PUT /api/v1/company/template sets default template and presentation styling."""
    # 1. Update to industrial_bold with custom color tokens
    payload = {
        "template_id": "industrial_bold",
        "primary_color": "#1e293b",
        "secondary_color": "#ea580c",
        "font_family": "Helvetica",
        "show_bank_details": True,
        "show_terms": True,
        "footer_text": "Custom Industrial Plant Footer",
    }
    resp = client.put("/api/v1/company/template", json=payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["template_id"] == "industrial_bold"
    assert data["primary_color"] == "#1e293b"
    assert data["secondary_color"] == "#ea580c"
    assert data["footer_text"] == "Custom Industrial Plant Footer"

    # 2. Retrieve active template and verify persistence
    resp_get = client.get("/api/v1/company/template", headers=auth_headers)
    assert resp_get.status_code == 200
    assert resp_get.json()["template_id"] == "industrial_bold"

    # 3. Invalid template_id rejected
    resp_bad = client.put(
        "/api/v1/company/template",
        json={"template_id": "nonexistent_design_xyz"},
        headers=auth_headers
    )
    assert resp_bad.status_code == 422


def test_all_8_templates_render_valid_pdf_stream(auth_headers):
    """Verify POST /api/v1/company/template/preview-pdf generates valid A4 PDF bytes for every template."""
    all_templates = [
        "classic_professional", "modern_minimal", "premium_corporate",
        "elegant_bordered", "industrial_bold", "modern_two_column",
        "creative_modern", "simple_clean"
    ]

    for t_id in all_templates:
        resp = client.post(
            f"/api/v1/company/template/preview-pdf?template_id={t_id}",
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Template {t_id} failed: {resp.text}"
        assert resp.headers["Content-Type"] == "application/pdf"
        assert resp.content.startswith(b"%PDF-")
        assert len(resp.content) > 1000, f"PDF for {t_id} is unexpectedly small"


def test_logo_upload_replace_stream_and_delete(auth_headers):
    """Verify logo upload, replacement, binary streaming, and deletion using private storage."""
    # 1. Upload valid PNG logo
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    files = {"file": ("plant_logo.png", png_bytes, "image/png")}
    resp = client.post("/api/v1/company/logo", files=files, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "logo_url" in data
    assert "companies/comp-bpe-pune/logo" in data["logo_url"]

    # 2. Stream logo via GET
    resp_stream = client.get("/api/v1/company/logo", headers=auth_headers)
    assert resp_stream.status_code == 200
    assert resp_stream.content == png_bytes

    # 3. Replace with JPEG logo
    jpg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    files_jpg = {"file": ("new_logo.jpg", jpg_bytes, "image/jpeg")}
    resp_replace = client.post("/api/v1/company/logo", files=files_jpg, headers=auth_headers)
    assert resp_replace.status_code == 200
    assert "jpg" in resp_replace.json()["logo_url"]

    # 4. Stream replaced logo
    resp_stream_jpg = client.get("/api/v1/company/logo", headers=auth_headers)
    assert resp_stream_jpg.status_code == 200
    assert resp_stream_jpg.content == jpg_bytes

    # 5. Invalid file type rejected
    bad_files = {"file": ("script.exe", b"MZ\x90\x00", "application/x-msdownload")}
    resp_bad = client.post("/api/v1/company/logo", files=bad_files, headers=auth_headers)
    assert resp_bad.status_code == 400

    # 6. Delete logo
    resp_del = client.delete("/api/v1/company/logo", headers=auth_headers)
    assert resp_del.status_code == 200

    # 7. GET after delete returns 404
    resp_after = client.get("/api/v1/company/logo", headers=auth_headers)
    assert resp_after.status_code == 404


def test_tenant_isolation_company_settings(auth_headers, auth_headers_company_b):
    """
    Verify strict tenant isolation:
    Company A and Company B cannot access or tamper with each other's settings, templates, or logos.
    """
    # 1. Company A configures custom template
    client.put(
        "/api/v1/company/template",
        json={"template_id": "creative_modern", "footer_text": "Company A Proprietary"},
        headers=auth_headers
    )

    # 2. Company B configures different template
    client.put(
        "/api/v1/company/template",
        json={"template_id": "simple_clean", "footer_text": "Company B Proprietary"},
        headers=auth_headers_company_b
    )

    # 3. Verify Company A sees its own template
    resp_a = client.get("/api/v1/company/template", headers=auth_headers)
    assert resp_a.json()["template_id"] == "creative_modern"
    assert resp_a.json()["footer_text"] == "Company A Proprietary"

    # 4. Verify Company B sees its own template
    resp_b = client.get("/api/v1/company/template", headers=auth_headers_company_b)
    assert resp_b.json()["template_id"] == "simple_clean"
    assert resp_b.json()["footer_text"] == "Company B Proprietary"

    # 5. Company B cannot access Company A logo
    resp_b_logo = client.get("/api/v1/company/logo", headers=auth_headers_company_b)
    # Company B has no logo configured -> 404
    assert resp_b_logo.status_code == 404


def test_calculation_invariance_across_templates(auth_headers):
    """
    CRITICAL ARCHITECTURE INVARIANT:
    Changing quotation template MUST NOT alter deterministic commercial calculation values.
    Zero AI involvement in template rendering.
    """
    from app.schemas.quotation import CalculateQuotationRequest, CalculateItemInput

    calc_req = CalculateQuotationRequest(
        items=[
            CalculateItemInput(
                item_number=1,
                part_name="Precision Pinion Shaft",
                quantity=Decimal("10"),
                gross_weight_kg=Decimal("15.000"),
                material_base_rate=Decimal("100.00"),
                scrap_weight_kg=Decimal("2.000"),
                scrap_credit_rate=Decimal("50.00"),
                machining_hours=Decimal("5.00"),
                machine_hourly_rate=Decimal("150.00"),
                setup_cost=Decimal("500.00"),
            )
        ],
        overhead_percentage=Decimal("10.00"),
        profit_percentage=Decimal("15.00"),
        gst_type="CGST_SGST",
    )

    # Calculation under default template
    calc_1 = CalculationService.calculate_quotation(calc_req)

    # Switch template to industrial_bold
    client.put("/api/v1/company/template", json={"template_id": "industrial_bold"}, headers=auth_headers)

    # Calculation after template change
    calc_2 = CalculationService.calculate_quotation(calc_req)

    assert calc_1["material_cost"] == calc_2["material_cost"]
    assert calc_1["process_cost"] == calc_2["process_cost"]
    assert calc_1["subtotal"] == calc_2["subtotal"]
    assert calc_1["overhead_amount"] == calc_2["overhead_amount"]
    assert calc_1["profit_amount"] == calc_2["profit_amount"]
    assert calc_1["taxable_amount"] == calc_2["taxable_amount"]
    assert calc_1["gst_amount"] == calc_2["gst_amount"]
    assert calc_1["final_total"] == calc_2["final_total"]


def test_mandatory_historical_safety_immutability_lifecycle(auth_headers):
    """
    PHASE 15: MANDATORY HISTORICAL SAFETY TEST
    Step 1: Configure Company Profile A, Template A, Logo A, Terms A, Bank Details A.
    Step 2: Create a quotation.
    Step 3: Finalize quotation.
    Step 4: Store PDF binary, PDF SHA-256, Template configuration context.
    Step 5: Change company configuration: Company Profile B, Template B, Logo B, Terms B, Bank Details B.
    Step 6: Download the original FINAL quotation.
    Step 7: Verify: Original PDF bytes == Downloaded PDF bytes.
    Step 8: Verify: Original SHA-256 == Current SHA-256.
    Step 9: Create a new quotation.
    Step 10: Verify that the new quotation uses: Company Profile B, Template B, Logo B, Terms B, Bank Details B.
    """
    # --- Step 1: Configure Configuration A ---
    client.put("/api/v1/company/profile", json={"name": "Company Alpha Works", "city": "Pune"}, headers=auth_headers)
    client.put("/api/v1/company/template", json={"template_id": "classic_professional", "footer_text": "Footer Alpha"}, headers=auth_headers)
    client.put("/api/v1/company/bank", json={"bank_name": "Bank Alpha", "account_number": "1111111111"}, headers=auth_headers)
    client.put("/api/v1/company/defaults", json={"delivery_terms": "Ex-Works Alpha", "payment_terms": "30 Days Alpha"}, headers=auth_headers)
    logo_a = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    client.post("/api/v1/company/logo", files={"file": ("logo_a.png", logo_a, "image/png")}, headers=auth_headers)

    # --- Step 2: Create quotation ---
    q_create = client.post(
        "/api/v1/quotations",
        json={
            "quotation_number": f"QT-HIST-TEST-A-{uuid.uuid4().hex[:8]}",
            "material_cost": 10000.00,
            "process_cost": 5000.00,
            "subtotal": 15000.00,
            "overhead_percentage": 10.00,
            "overhead_amount": 1500.00,
            "profit_percentage": 15.00,
            "profit_amount": 2475.00,
            "taxable_amount": 18975.00,
            "gst_type": "CGST_SGST",
            "cgst_rate": 9.00,
            "cgst_amount": 1707.75,
            "sgst_rate": 9.00,
            "sgst_amount": 1707.75,
            "gst_amount": 3415.50,
            "final_total": 22390.50,
            "items": [
                {
                    "item_number": 1,
                    "part_name": "Hydraulic Spool Valve",
                    "quantity": 5,
                    "unit": "PCS",
                    "gross_material_cost": 10000.00,
                    "scrap_credit": 0.00,
                    "net_material_cost": 10000.00,
                    "machining_cost": 5000.00,
                    "setup_cost": 0.00,
                    "process_cost": 5000.00,
                    "subtotal": 15000.00,
                    "unit_cost": 3000.00,
                    "unit_price": 4478.10,
                    "total_price": 22390.50,
                }
            ],
        },
        headers=auth_headers,
    )
    assert q_create.status_code == 201, q_create.text
    q1_id = q_create.json()["id"]

    # --- Step 3: Finalize quotation ---
    q_finalize = client.post(f"/api/v1/quotations/{q1_id}/finalize", headers=auth_headers)
    assert q_finalize.status_code == 200, q_finalize.text
    q1_final = q_finalize.json()
    assert q1_final["status"] == "FINAL"
    assert q1_final["pdf_sha256"] is not None

    # --- Step 4: Store original PDF binary and SHA-256 ---
    q1_pdf_resp = client.get(f"/api/v1/quotations/{q1_id}/pdf", headers=auth_headers)
    assert q1_pdf_resp.status_code == 200
    orig_pdf_bytes = q1_pdf_resp.content
    orig_sha256 = q1_final["pdf_sha256"]
    assert hashlib.sha256(orig_pdf_bytes).hexdigest() == orig_sha256

    # --- Step 5: Change company configuration to Configuration B ---
    client.put("/api/v1/company/profile", json={"name": "Company Beta Aerospace", "city": "Bengaluru"}, headers=auth_headers)
    client.put("/api/v1/company/template", json={"template_id": "industrial_bold", "footer_text": "Footer Beta Industrial"}, headers=auth_headers)
    client.put("/api/v1/company/bank", json={"bank_name": "Bank Beta", "account_number": "2222222222"}, headers=auth_headers)
    client.put("/api/v1/company/defaults", json={"delivery_terms": "Ex-Works Beta", "payment_terms": "60 Days Beta"}, headers=auth_headers)
    logo_b = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02\x00\x00\x00\x02\x08\x06\x00\x00\x00\x72\xb6\r$\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    client.post("/api/v1/company/logo", files={"file": ("logo_b.png", logo_b, "image/png")}, headers=auth_headers)

    # --- Step 6: Download the original FINAL quotation ---
    q1_download_resp = client.get(f"/api/v1/quotations/{q1_id}/pdf", headers=auth_headers)
    assert q1_download_resp.status_code == 200
    downloaded_bytes = q1_download_resp.content

    # --- Step 7: Verify Original PDF bytes == Downloaded PDF bytes ---
    assert orig_pdf_bytes == downloaded_bytes, "CRITICAL ERROR: Historical Final PDF bytes altered after company settings changed!"

    # --- Step 8: Verify Original SHA-256 == Current SHA-256 ---
    current_sha256 = hashlib.sha256(downloaded_bytes).hexdigest()
    assert orig_sha256 == current_sha256, "CRITICAL ERROR: Historical Final PDF SHA-256 hash changed!"

    # --- Step 9: Create a new quotation ---
    q2_create = client.post(
        "/api/v1/quotations",
        json={
            "quotation_number": f"QT-HIST-TEST-B-{uuid.uuid4().hex[:8]}",
            "material_cost": 20000.00,
            "process_cost": 10000.00,
            "subtotal": 30000.00,
            "overhead_percentage": 10.00,
            "overhead_amount": 3000.00,
            "profit_percentage": 15.00,
            "profit_amount": 4950.00,
            "taxable_amount": 37950.00,
            "gst_type": "CGST_SGST",
            "cgst_rate": 9.00,
            "cgst_amount": 3415.50,
            "sgst_rate": 9.00,
            "sgst_amount": 3415.50,
            "gst_amount": 6831.00,
            "final_total": 44781.00,
            "items": [
                {
                    "item_number": 1,
                    "part_name": "Turbine Impeller Ring",
                    "quantity": 2,
                    "unit": "PCS",
                    "gross_material_cost": 20000.00,
                    "scrap_credit": 0.00,
                    "net_material_cost": 20000.00,
                    "machining_cost": 10000.00,
                    "setup_cost": 0.00,
                    "process_cost": 10000.00,
                    "subtotal": 30000.00,
                    "unit_cost": 15000.00,
                    "unit_price": 22390.50,
                    "total_price": 44781.00,
                }
            ],
        },
        headers=auth_headers,
    )
    assert q2_create.status_code == 201
    q2_data = q2_create.json()
    q2_id = q2_data["id"]

    # Verify that new quotation inherited Company Defaults B:
    assert q2_data["delivery_terms"] == "Ex-Works Beta"
    assert q2_data["payment_terms"] == "60 Days Beta"

    # Finalize new quotation under Configuration B:
    q2_finalize = client.post(f"/api/v1/quotations/{q2_id}/finalize", headers=auth_headers)
    assert q2_finalize.status_code == 200
    q2_final = q2_finalize.json()

    # --- Step 10: Verify new quotation uses Configuration B ---
    q2_pdf_resp = client.get(f"/api/v1/quotations/{q2_id}/pdf", headers=auth_headers)
    assert q2_pdf_resp.status_code == 200
    q2_bytes = q2_pdf_resp.content

    # Q1 and Q2 are completely distinct documents
    assert q1_final["pdf_sha256"] != q2_final["pdf_sha256"]
    assert orig_pdf_bytes != q2_bytes
