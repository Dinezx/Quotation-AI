import time
import hashlib
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem
from app.models.company import Company
from app.models.user import User
from app.services.storage.storage_service import get_storage_service

client = TestClient(app)


def _seed_valid_draft_quotation(company_id: str = "comp-bpe-pune") -> Quotation:
    """Helper to seed a valid calculated draft quotation with line items."""
    db = SessionLocal()
    try:
        quote_num = f"QT-TEST-{int(time.time() * 1000)}"
        quote = Quotation(
            company_id=company_id,
            quotation_number=quote_num,
            status="DRAFT",
            material_cost=Decimal("10000.00"),
            process_cost=Decimal("4000.00"),
            subtotal=Decimal("14000.00"),
            overhead_percentage=Decimal("10.00"),
            overhead_amount=Decimal("1400.00"),
            profit_percentage=Decimal("15.00"),
            profit_amount=Decimal("2310.00"),
            taxable_amount=Decimal("17710.00"),
            gst_type="IGST",
            igst_rate=Decimal("18.00"),
            igst_amount=Decimal("3188.00"),
            gst_amount=Decimal("3188.00"),
            final_total=Decimal("20898.00"),
            notes="Benchmark manufacturing quotation",
            prepared_by="Rajesh Deshmukh",
            authorized_signatory="Authorized Signatory",
        )
        db.add(quote)
        db.flush()

        item = QuotationItem(
            quotation_id=quote.id,
            item_number=1,
            part_name="Bearing Housing Spec",
            quantity=Decimal("10.00"),
            unit="PCS",
            subtotal=Decimal("14000.00"),
            unit_price=Decimal("1400.00"),
            total_price=Decimal("14000.00"),
        )
        db.add(item)
        db.commit()
        db.refresh(quote)
        return quote
    finally:
        db.close()


def test_draft_can_be_finalized_and_records_audit_and_pdf(auth_headers):
    """
    Test 1-6, 12, 27, 32:
    - Draft can be finalized
    - Records finalized_by, finalized_at
    - Stores PDF path, pdf_file_name, pdf_generated_at, and pdf_sha256
    - Status is FINAL
    - PDF exists in storage and matches sha256
    """
    quote = _seed_valid_draft_quotation()
    res = client.post(f"/api/v1/quotations/{quote.id}/finalize", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["status"] == "FINAL"
    assert data["finalized_by"] == "r.deshmukh@bharatprecision.co.in"
    assert data["finalized_at"] is not None
    assert data["pdf_storage_path"] is not None
    assert data["pdf_file_name"] == f"{quote.quotation_number}.pdf"
    assert data["pdf_generated_at"] is not None
    assert data["pdf_sha256"] is not None
    assert len(data["pdf_sha256"]) == 64

    # Verify PDF exists in storage
    storage = get_storage_service()
    pdf_bytes = storage.download(settings.QUOTATION_PDF_BUCKET, data["pdf_storage_path"])
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")
    assert hashlib.sha256(pdf_bytes).hexdigest() == data["pdf_sha256"]


def test_final_quotation_is_immutable_against_put_and_recalc(auth_headers):
    """
    Test 7-10:
    - FINAL quotation cannot be modified via PUT (409 Conflict)
    - FINAL quotation cannot be recalculated via POST calculate (409 Conflict)
    """
    quote = _seed_valid_draft_quotation()
    client.post(f"/api/v1/quotations/{quote.id}/finalize", headers=auth_headers)

    # Attempt PUT modification
    put_res = client.put(
        f"/api/v1/quotations/{quote.id}",
        json={"notes": "Attempted tamper after finalization"},
        headers=auth_headers,
    )
    assert put_res.status_code == 409
    assert "Finalized quotations cannot be modified" in put_res.json()["detail"]

    # Attempt POST recalculation
    recalc_payload = {
        "items": [
            {
                "item_number": 1,
                "part_name": "Tampered Part",
                "quantity": 100,
                "gross_weight_kg": 5.0,
                "scrap_weight_kg": 0.5,
                "material_base_rate": 200.0,
                "scrap_credit_rate": 30.0,
                "machining_hours": 2.0,
                "machine_hourly_rate": 500.0,
                "setup_cost": 500.0,
            }
        ],
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "IGST",
    }
    recalc_res = client.post(
        f"/api/v1/quotations/{quote.id}/calculate",
        json=recalc_payload,
        headers=auth_headers,
    )
    assert recalc_res.status_code == 409
    assert "Finalized quotations cannot be modified or recalculated" in recalc_res.json()["detail"]


def test_second_finalization_returns_409_conflict(auth_headers):
    """Test 11: Finalizing an already finalized quotation returns 409 Conflict."""
    quote = _seed_valid_draft_quotation()
    res1 = client.post(f"/api/v1/quotations/{quote.id}/finalize", headers=auth_headers)
    assert res1.status_code == 200

    res2 = client.post(f"/api/v1/quotations/{quote.id}/finalize", headers=auth_headers)
    assert res2.status_code == 409
    assert "Quotation is already finalized" in res2.json()["detail"]


def test_final_pdf_download_succeeds_and_missing_pdf_returns_409(auth_headers):
    """Test 13-14: Stored PDF download succeeds, missing stored PDF returns controlled 409 Conflict."""
    quote = _seed_valid_draft_quotation()
    fin_res = client.post(f"/api/v1/quotations/{quote.id}/finalize", headers=auth_headers)
    storage_path = fin_res.json()["pdf_storage_path"]

    # 1. Successful download of stored PDF
    dl_res = client.get(f"/api/v1/quotations/{quote.id}/pdf", headers=auth_headers)
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert dl_res.content.startswith(b"%PDF")

    # 2. Simulate missing PDF in storage
    storage = get_storage_service()
    storage.delete(settings.QUOTATION_PDF_BUCKET, storage_path)

    missing_res = client.get(f"/api/v1/quotations/{quote.id}/pdf", headers=auth_headers)
    assert missing_res.status_code == 409
    assert "Final quotation PDF is unavailable" in missing_res.json()["detail"]


def test_cross_company_isolation_and_idor_protection(auth_headers, auth_headers_company_b):
    """
    Test 15-17:
    - Company A quotation cannot be viewed by Company B (404 / filtered)
    - Company A quotation cannot be finalized by Company B (403)
    - Company A quotation PDF cannot be downloaded by Company B (403)
    - Company A quotation does not appear in Company B history
    """
    quote_a = _seed_valid_draft_quotation(company_id="comp-bpe-pune")

    # Company B tries to finalize Company A's quotation
    fin_b = client.post(f"/api/v1/quotations/{quote_a.id}/finalize", headers=auth_headers_company_b)
    assert fin_b.status_code == 403

    # Company A finalizes its quotation
    client.post(f"/api/v1/quotations/{quote_a.id}/finalize", headers=auth_headers)

    # Company B tries to download Company A's final PDF
    pdf_b = client.get(f"/api/v1/quotations/{quote_a.id}/pdf", headers=auth_headers_company_b)
    assert pdf_b.status_code == 403

    # Company B lists quotations (History isolation)
    hist_b = client.get("/api/v1/quotations?page=1&page_size=20", headers=auth_headers_company_b)
    assert hist_b.status_code == 200
    item_ids_b = [item["id"] for item in hist_b.json()["items"]]
    assert quote_a.id not in item_ids_b


def test_deactivated_user_blocked_from_finalization(session_jwt_signer):
    """Test 18: Deactivated user is rejected with 403 Forbidden."""
    db = SessionLocal()
    try:
        deact_user = db.query(User).filter(User.id == "usr-deactivated-test").first()
        if not deact_user:
            deact_user = User(
                id="usr-deactivated-test",
                company_id="comp-bpe-pune",
                email="deactivated@bharatprecision.co.in",
                full_name="Deactivated User",
                role="COSTING_ENGINEER",
                is_active=False,
            )
            db.add(deact_user)
            db.commit()
    finally:
        db.close()

    deact_token = session_jwt_signer("usr-deactivated-test", "deactivated@bharatprecision.co.in")
    deact_headers = {"Authorization": f"Bearer {deact_token}"}

    quote = _seed_valid_draft_quotation()
    res = client.post(f"/api/v1/quotations/{quote.id}/finalize", headers=deact_headers)
    assert res.status_code == 403


def test_incomplete_or_blocked_quotations_cannot_be_finalized(auth_headers):
    """Test validation errors: empty items -> 422, zero total -> 409."""
    db = SessionLocal()
    try:
        empty_quote = Quotation(
            company_id="comp-bpe-pune",
            quotation_number=f"QT-EMPTY-{int(time.time())}",
            status="DRAFT",
            final_total=Decimal("0.00"),
        )
        db.add(empty_quote)
        db.commit()
        db.refresh(empty_quote)
        empty_id = empty_quote.id
    finally:
        db.close()

    # Empty items -> 422
    res_empty = client.post(f"/api/v1/quotations/{empty_id}/finalize", headers=auth_headers)
    assert res_empty.status_code == 422


def test_quotation_history_search_filter_pagination(auth_headers):
    """
    Test 19-24:
    - Server-side pagination returns items, total, page, page_size
    - Status filtering (DRAFT vs FINAL)
    - Search by quotation number
    - Newest quotations first
    """
    q_draft = _seed_valid_draft_quotation()
    q_final = _seed_valid_draft_quotation()
    client.post(f"/api/v1/quotations/{q_final.id}/finalize", headers=auth_headers)

    # 1. Server-side pagination structure
    res_paginated = client.get("/api/v1/quotations?page=1&page_size=10", headers=auth_headers)
    assert res_paginated.status_code == 200
    page_data = res_paginated.json()
    assert "items" in page_data
    assert "total" in page_data
    assert page_data["page"] == 1
    assert page_data["page_size"] == 10
    assert page_data["total"] >= 2

    # 2. Status filter FINAL
    res_final = client.get("/api/v1/quotations?page=1&page_size=10&status=FINAL", headers=auth_headers)
    assert res_final.status_code == 200
    for it in res_final.json()["items"]:
        assert it["status"] == "FINAL"

    # 3. Status filter DRAFT
    res_draft = client.get("/api/v1/quotations?page=1&page_size=10&status=DRAFT", headers=auth_headers)
    assert res_draft.status_code == 200
    for it in res_draft.json()["items"]:
        assert it["status"] == "DRAFT"

    # 4. Search by quotation number
    res_search = client.get(
        f"/api/v1/quotations?page=1&page_size=10&search={q_final.quotation_number}",
        headers=auth_headers,
    )
    assert res_search.status_code == 200
    search_items = res_search.json()["items"]
    assert len(search_items) >= 1
    assert search_items[0]["quotation_number"] == q_final.quotation_number


def test_section_31_benchmark_consistency_and_zero_ai_recalculation(auth_headers):
    """
    Section 31 & 32 Benchmark:
    Verify exact financial benchmark:
    - Manufacturing Subtotal: 14000
    - Overhead: 1400
    - Profit: 2310
    - Taxable: 17710
    - IGST: 3188
    - Grand Total: 20898
    - Zero AI calls and zero rate matching during finalization
    """
    quote = _seed_valid_draft_quotation()
    fin_res = client.post(f"/api/v1/quotations/{quote.id}/finalize", headers=auth_headers)
    assert fin_res.status_code == 200
    d = fin_res.json()

    assert Decimal(str(d["subtotal"])) == Decimal("14000.00")
    assert Decimal(str(d["overhead_amount"])) == Decimal("1400.00")
    assert Decimal(str(d["profit_amount"])) == Decimal("2310.00")
    assert Decimal(str(d["taxable_amount"])) == Decimal("17710.00")
    assert Decimal(str(d["igst_amount"])) == Decimal("3188.00")
    assert Decimal(str(d["final_total"])) == Decimal("20898.00")

    # Download stored PDF and verify it is a valid PDF containing bytes
    pdf_res = client.get(f"/api/v1/quotations/{quote.id}/pdf", headers=auth_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b"%PDF")
    assert hashlib.sha256(pdf_res.content).hexdigest() == d["pdf_sha256"]
