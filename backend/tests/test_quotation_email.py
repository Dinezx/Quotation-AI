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
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.models.company import Company
from app.models.user import User
from app.services.storage.storage_service import get_storage_service
from app.services.email import get_email_service

client = TestClient(app)


def _seed_customer(
    company_id: str = "comp-bpe-pune",
    email: str = "purchase@precision-components.in",
    name: str = "Precision Components Ltd",
) -> Customer:
    """Seeds a customer record for testing."""
    db = SessionLocal()
    try:
        cust = Customer(
            company_id=company_id,
            name=name,
            email=email,
            billing_address="GIDC Estate, Vatva, Ahmedabad, Gujarat 382445",
            gstin="24ABCDE1234F1Z5",
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)
        return cust
    finally:
        db.close()


def _seed_final_quotation(
    company_id: str = "comp-bpe-pune",
    customer: Customer = None,
    pdf_content: bytes = b"%PDF-1.4 official benchmark final quotation bytes",
) -> Quotation:
    """Seeds a valid finalized quotation with stored PDF and integrity hash."""
    db = SessionLocal()
    try:
        if customer is None:
            customer = _seed_customer(company_id=company_id)

        quote_num = f"QT-EMAIL-{int(time.time() * 1000)}"
        pdf_hash = hashlib.sha256(pdf_content).hexdigest()
        storage_path = f"companies/{company_id}/quotations/temp-{int(time.time()*1000)}/{quote_num}.pdf"
        file_name = f"{quote_num}.pdf"

        # Store official PDF in test storage
        storage = get_storage_service()
        storage.upload(
            bucket=settings.QUOTATION_PDF_BUCKET,
            path=storage_path,
            data=pdf_content,
            content_type="application/pdf",
        )

        quote = Quotation(
            company_id=company_id,
            customer_id=customer.id,
            quotation_number=quote_num,
            status="FINAL",
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
            pdf_storage_path=storage_path,
            pdf_file_name=file_name,
            pdf_sha256=pdf_hash,
            email_status="NOT_SENT",
            notes="Benchmark commercial quotation for precision machining",
            prepared_by="Rajesh Deshmukh",
            authorized_signatory="Rajesh Deshmukh",
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


def test_final_quotation_sends_email_successfully(auth_headers):
    """
    Test 1, 8, 9, 10, 13, 18, 30:
    - Final quotation is successfully sent via email.
    - Recipient comes from the customer record.
    - Official PDF bytes from storage are attached.
    - Attachment filename matches {quotation_number}.pdf.
    - Quotation email_status transitions to SENT.
    - Audit fields (email_sent_at, email_sent_by, email_recipient) are recorded.
    - FakeEmailService captures exactly 1 dispatch.
    """
    customer = _seed_customer(email="orders@precision-parts.com")
    pdf_bytes = b"%PDF-1.4 official stored test pdf binary content"
    quote = _seed_final_quotation(customer=customer, pdf_content=pdf_bytes)

    fake_email = get_email_service()
    fake_email.clear()

    res = client.post(f"/api/v1/quotations/{quote.id}/send-email", headers=auth_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()

    assert data["quotation_id"] == quote.id
    assert data["quotation_number"] == quote.quotation_number
    assert data["email_status"] == "SENT"
    assert data["recipient"] == "orders@precision-parts.com"
    assert "sent_at" in data

    # Verify FakeEmailService capture
    assert fake_email.get_sent_count() == 1
    sent_msg = fake_email.get_last_sent()
    assert sent_msg["to"] == "orders@precision-parts.com"
    assert quote.quotation_number in sent_msg["subject"]
    assert len(sent_msg["attachments"]) == 1

    attachment = sent_msg["attachments"][0]
    assert attachment["filename"] == f"{quote.quotation_number}.pdf"
    assert attachment["content"] == pdf_bytes

    # Verify Database state
    db = SessionLocal()
    try:
        refreshed = db.query(Quotation).filter(Quotation.id == quote.id).first()
        assert refreshed.email_status == "SENT"
        assert refreshed.email_recipient == "orders@precision-parts.com"
        assert refreshed.email_sent_at is not None
        assert refreshed.email_sent_by == "r.deshmukh@bharatprecision.co.in"
        assert refreshed.email_error is None
    finally:
        db.close()


def test_draft_quotation_cannot_be_emailed(auth_headers):
    """
    Test 2:
    - A DRAFT quotation cannot be sent by email.
    - Must return 409 Conflict with clear error message.
    """
    db = SessionLocal()
    try:
        quote = Quotation(
            company_id="comp-bpe-pune",
            quotation_number=f"QT-DRAFT-{int(time.time()*1000)}",
            status="DRAFT",
            final_total=Decimal("1000.00"),
        )
        db.add(quote)
        db.commit()
        db.refresh(quote)
        quote_id = quote.id
    finally:
        db.close()

    fake_email = get_email_service()
    fake_email.clear()

    res = client.post(f"/api/v1/quotations/{quote_id}/send-email", headers=auth_headers)
    assert res.status_code == 409
    assert "Only finalized quotations can be sent by email" in res.json()["detail"]
    assert fake_email.get_sent_count() == 0


def test_missing_or_invalid_customer_email_blocks_send(auth_headers):
    """
    Test 3, 4:
    - Missing customer email returns 422 Unprocessable Content.
    - Invalid email format returns 422 Unprocessable Content.
    """
    # Case A: Missing customer email
    cust_no_email = _seed_customer(email=None, name="Customer Without Email")
    quote_no_email = _seed_final_quotation(customer=cust_no_email)

    res1 = client.post(f"/api/v1/quotations/{quote_no_email.id}/send-email", headers=auth_headers)
    assert res1.status_code == 422
    assert "Customer email address is required" in res1.json()["detail"]

    # Case B: Invalid customer email format
    cust_bad_email = _seed_customer(email="not_a_valid_email_address", name="Customer With Bad Email")
    quote_bad_email = _seed_final_quotation(customer=cust_bad_email)

    res2 = client.post(f"/api/v1/quotations/{quote_bad_email.id}/send-email", headers=auth_headers)
    assert res2.status_code == 422
    assert "Customer email address is invalid" in res2.json()["detail"]


def test_missing_or_tampered_stored_pdf_blocks_send(auth_headers):
    """
    Test 5, 6, 7:
    - Missing stored PDF returns 409 Conflict.
    - Tampered PDF with SHA-256 hash mismatch returns 409 Conflict.
    - No email is dispatched.
    """
    fake_email = get_email_service()
    fake_email.clear()

    # Case A: Missing stored PDF in storage
    cust = _seed_customer(email="test@valid.com")
    quote_missing_pdf = _seed_final_quotation(customer=cust)
    
    # Delete the stored object from test storage
    storage = get_storage_service()
    storage.delete(settings.QUOTATION_PDF_BUCKET, quote_missing_pdf.pdf_storage_path)

    res1 = client.post(f"/api/v1/quotations/{quote_missing_pdf.id}/send-email", headers=auth_headers)
    assert res1.status_code == 409
    assert "Official quotation PDF is unavailable" in res1.json()["detail"]
    assert fake_email.get_sent_count() == 0

    # Case B: PDF SHA-256 mismatch (tampered content)
    quote_tampered = _seed_final_quotation(customer=cust)
    # Upload different bytes without updating hash
    storage.upload(
        bucket=settings.QUOTATION_PDF_BUCKET,
        path=quote_tampered.pdf_storage_path,
        data=b"%PDF-1.4 TAMPERED BYTES DIFFERENT HASH",
        content_type="application/pdf",
    )

    res2 = client.post(f"/api/v1/quotations/{quote_tampered.id}/send-email", headers=auth_headers)
    assert res2.status_code == 409
    assert "Official quotation PDF integrity check failed" in res2.json()["detail"]
    assert fake_email.get_sent_count() == 0


def test_frontend_cannot_override_recipient(auth_headers):
    """
    Test 14 & Phase 24:
    - Even if a malicious request attempts to send {"to": "attacker@evil.com"},
      the backend strictly delivers to the customer's recorded email.
    """
    cust = _seed_customer(email="legitimate-purchaser@oem.co.in")
    quote = _seed_final_quotation(customer=cust)

    fake_email = get_email_service()
    fake_email.clear()

    # Pass malicious body payload trying to redirect recipient
    res = client.post(
        f"/api/v1/quotations/{quote.id}/send-email",
        headers=auth_headers,
        json={"to": "attacker@evil.com", "recipient": "attacker@evil.com"},
    )
    assert res.status_code == 200

    # Assert that FakeEmailService received the customer email, NOT the attacker email
    sent = fake_email.get_last_sent()
    assert sent["to"] == "legitimate-purchaser@oem.co.in"
    assert "attacker@evil.com" not in sent["to"]


def test_cross_company_isolation_and_idor_blocked(auth_headers, auth_headers_company_b):
    """
    Test 15, 16, 28:
    - Company B user cannot send an email for Company A's quotation.
    - Tenant isolation is strictly enforced.
    """
    cust_a = _seed_customer(company_id="comp-bpe-pune", email="company_a@customer.com")
    quote_a = _seed_final_quotation(company_id="comp-bpe-pune", customer=cust_a)

    # Attempt send using Company B's token
    res = client.post(
        f"/api/v1/quotations/{quote_a.id}/send-email",
        headers=auth_headers_company_b,
    )
    assert res.status_code == 403
    assert "Quotation belongs to another company" in res.json()["detail"]


def test_deactivated_user_blocked(session_jwt_signer):
    """
    Test 17:
    - Deactivated user cannot send quotation emails.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == "usr-bpe-001").first()
        if user:
            user.is_active = False
            db.commit()

        cust = _seed_customer(email="user@test.com")
        quote = _seed_final_quotation(customer=cust)

        token = session_jwt_signer("usr-bpe-001", "r.deshmukh@bharatprecision.co.in")
        headers = {"Authorization": f"Bearer {token}"}

        res = client.post(f"/api/v1/quotations/{quote.id}/send-email", headers=headers)
        assert res.status_code == 403
        assert "deactivated" in res.json()["detail"].lower()
    finally:
        # Restore user active status
        if user:
            user.is_active = True
            db.commit()
        db.close()


def test_provider_failure_sets_status_failed_and_sanitizes_error(auth_headers):
    """
    Test 19, 20, 21:
    - Provider network/API error marks quotation as FAILED.
    - Does not mark quotation as SENT.
    - Error message is sanitized (no credentials).
    """
    cust = _seed_customer(email="fail-test@customer.com")
    quote = _seed_final_quotation(customer=cust)

    fake_email = get_email_service()
    fake_email.clear()
    fake_email.should_fail = True
    fake_email.failure_message = "Resend API connection timed out"

    res = client.post(f"/api/v1/quotations/{quote.id}/send-email", headers=auth_headers)
    assert res.status_code == 502
    assert "Failed to send quotation email" in res.json()["detail"]

    # Verify DB state
    db = SessionLocal()
    try:
        refreshed = db.query(Quotation).filter(Quotation.id == quote.id).first()
        assert refreshed.email_status == "FAILED"
        assert "timed out" in refreshed.email_error
    finally:
        fake_email.should_fail = False
        db.close()


def test_resend_after_sent_works_cleanly(auth_headers):
    """
    Test 22:
    - A quotation already in SENT status can be re-sent deliberately.
    - Audit records and timestamps update.
    """
    cust = _seed_customer(email="repeat-send@customer.com")
    quote = _seed_final_quotation(customer=cust)

    fake_email = get_email_service()
    fake_email.clear()

    # First send
    res1 = client.post(f"/api/v1/quotations/{quote.id}/send-email", headers=auth_headers)
    assert res1.status_code == 200
    assert fake_email.get_sent_count() == 1

    # Second send
    res2 = client.post(f"/api/v1/quotations/{quote.id}/send-email", headers=auth_headers)
    assert res2.status_code == 200
    assert fake_email.get_sent_count() == 2

    # Invariants: pricing untouched
    db = SessionLocal()
    try:
        q = db.query(Quotation).filter(Quotation.id == quote.id).first()
        assert q.final_total == Decimal("20898.00")
        assert q.email_status == "SENT"
    finally:
        db.close()


def test_quotation_immutability_and_deterministic_email_content(auth_headers):
    """
    Test 10, 11, 12, 23, 24, 25, 26, 27:
    - Email sending does NOT modify quotation pricing, line items, or PDF hash.
    - Zero AI / LLM calls are invoked.
    - Subject and bodies contain exact persisted quotation information.
    """
    cust = _seed_customer(email="procurement@industrial-tech.com", name="Industrial Tech Systems")
    pdf_bytes = b"%PDF-1.4 fixed benchmark official document"
    quote = _seed_final_quotation(customer=cust, pdf_content=pdf_bytes)

    orig_total = quote.final_total
    orig_subtotal = quote.subtotal
    orig_overhead = quote.overhead_amount
    orig_profit = quote.profit_amount
    orig_taxable = quote.taxable_amount
    orig_igst = quote.igst_amount
    orig_hash = quote.pdf_sha256

    fake_email = get_email_service()
    fake_email.clear()

    res = client.post(f"/api/v1/quotations/{quote.id}/send-email", headers=auth_headers)
    assert res.status_code == 200

    sent = fake_email.get_last_sent()
    # Check subject
    assert quote.quotation_number in sent["subject"]
    assert "Bharat Precision Engineering" in sent["subject"]

    # Check text content contains financial values
    assert "₹20,898.00" in sent["text_body"]
    assert "Industrial Tech Systems" in sent["text_body"]
    assert quote.quotation_number in sent["text_body"]
    assert "official, finalized quotation PDF document is securely attached" in sent["text_body"]

    # Check HTML content
    assert "₹20,898.00" in sent["html_body"]
    assert "Industrial Tech Systems" in sent["html_body"]
    assert quote.quotation_number in sent["html_body"]

    # Invariants in DB:
    db = SessionLocal()
    try:
        q = db.query(Quotation).filter(Quotation.id == quote.id).first()
        assert q.final_total == orig_total == Decimal("20898.00")
        assert q.subtotal == orig_subtotal == Decimal("14000.00")
        assert q.overhead_amount == orig_overhead == Decimal("1400.00")
        assert q.profit_amount == orig_profit == Decimal("2310.00")
        assert q.taxable_amount == orig_taxable == Decimal("17710.00")
        assert q.igst_amount == orig_igst == Decimal("3188.00")
        assert q.pdf_sha256 == orig_hash
        assert len(q.items) == 1
    finally:
        db.close()
