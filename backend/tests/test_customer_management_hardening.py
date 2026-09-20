import time
import hashlib
from decimal import Decimal
from typing import Optional
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.customer import Customer
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem
from app.models.purchase_order import PurchaseOrder
from app.services.storage.storage_service import get_storage_service
from app.services.email import get_email_service

client = TestClient(app)


def _seed_test_customer(
    company_id: str = "comp-bpe-pune",
    name: str = "Test Machinery Corp",
    email: Optional[str] = "purchase@testmachinery.com",
    quotation_email: Optional[str] = None,
    gstin: Optional[str] = None,
    is_active: bool = True,
) -> Customer:
    db = SessionLocal()
    try:
        cust = Customer(
            company_id=company_id,
            name=name,
            email=email,
            quotation_email=quotation_email,
            gstin=gstin,
            phone="+91 20 2712 0000",
            billing_address="Plot 44, Bhosari MIDC, Pune - 411026",
            shipping_address="Plot 44, Bhosari MIDC, Pune - 411026",
            is_active=is_active,
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)
        return cust
    finally:
        db.close()


def _seed_test_po(
    company_id: str = "comp-bpe-pune",
    customer_id: Optional[str] = None,
    customer_name: Optional[str] = None,
    po_number: Optional[str] = None,
) -> PurchaseOrder:
    db = SessionLocal()
    try:
        po_num = po_number or f"PO-TEST-{int(time.time() * 1000)}"
        po = PurchaseOrder(
            company_id=company_id,
            customer_id=customer_id,
            customer_name=customer_name or "Test Customer",
            po_number=po_num,
            status="APPROVED",
        )
        db.add(po)
        db.commit()
        db.refresh(po)
        return po
    finally:
        db.close()


def _seed_test_quotation(
    company_id: str = "comp-bpe-pune",
    customer_id: Optional[str] = None,
    purchase_order_id: Optional[str] = None,
    status: str = "FINAL",
) -> Quotation:
    pdf_content = b"%PDF-1.4 official benchmark final quotation bytes"
    pdf_hash = hashlib.sha256(pdf_content).hexdigest()
    quote_num = f"BPE/QT/{int(time.time() * 1000)}"
    storage_path = f"companies/{company_id}/quotations/temp-{int(time.time()*1000)}/{quote_num}.pdf"

    storage = get_storage_service()
    storage.upload(
        bucket=settings.QUOTATION_PDF_BUCKET,
        path=storage_path,
        data=pdf_content,
        content_type="application/pdf",
    )

    db = SessionLocal()
    try:
        q = Quotation(
            company_id=company_id,
            customer_id=customer_id,
            purchase_order_id=purchase_order_id,
            quotation_number=quote_num,
            status=status,
            final_total=Decimal("50000.00"),
            pdf_url="https://storage.supabase.co/mock-pdf.pdf",
            pdf_storage_path=storage_path,
            pdf_file_name=f"{quote_num}.pdf",
            pdf_sha256=pdf_hash,
            email_status="NOT_SENT",
        )
        db.add(q)
        db.flush()
        item = QuotationItem(
            quotation_id=q.id,
            item_number=1,
            part_name="Precision Spindle Shaft",
            quantity=Decimal("10"),
            unit="NOS",
            unit_price=Decimal("5000.00"),
            total_price=Decimal("50000.00"),
        )
        db.add(item)
        db.commit()
        db.refresh(q)
        return q
    finally:
        db.close()


# ==============================================================================
# 1. Customer Creation & Email Validations
# ==============================================================================

def test_create_customer_success(auth_headers):
    """1. Create customer successfully with all fields."""
    ts = int(time.time() * 1000)
    payload = {
        "name": f"Kirloskar Heavy Engineering {ts}",
        "contact_person": "Ramesh Kulkarni",
        "email": f"purchase_{ts}@kirloskar.com",
        "quotation_email": f"quotes_{ts}@kirloskar.com",
        "phone": "+91 20 2740 1000",
        "billing_address": "Kirloskarvadi, Sangli, Maharashtra",
        "shipping_address": "Kirloskarvadi, Sangli, Maharashtra",
        "gstin": f"27AAACK{ts % 10000:04d}A1Z{ts % 10}",
        "is_active": True,
    }
    res = client.post("/api/v1/customers", json=payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["name"] == payload["name"]
    assert data["email"] == payload["email"].lower()
    assert data["login_email"] == payload["email"].lower()
    assert data["quotation_email"] == payload["quotation_email"].lower()
    assert data["code"].startswith("CUST-")
    assert data["is_active"] is True


def test_create_customer_invalid_login_email_fails(auth_headers):
    """2. Create customer with invalid login email fails (422)."""
    payload = {
        "name": "Invalid Email Corp",
        "email": "not-an-email-format",
    }
    res = client.post("/api/v1/customers", json=payload, headers=auth_headers)
    assert res.status_code == 422
    assert "Customer email address is invalid" in res.json()["detail"]


def test_create_customer_invalid_quotation_email_fails(auth_headers):
    """3. Create customer with invalid quotation email fails (422)."""
    payload = {
        "name": "Invalid Quotation Email Corp",
        "email": "valid@email.com",
        "quotation_email": "broken-email@",
    }
    res = client.post("/api/v1/customers", json=payload, headers=auth_headers)
    assert res.status_code == 422
    assert "Customer quotation email is invalid" in res.json()["detail"]


def test_create_customer_optional_quotation_email_succeeds(auth_headers):
    """4. Create customer with no quotation email succeeds (quotation email optional)."""
    ts = int(time.time() * 1000)
    payload = {
        "name": f"Optional Quote Email Corp {ts}",
        "email": f"login_only_{ts}@domain.com",
        "quotation_email": None,
    }
    res = client.post("/api/v1/customers", json=payload, headers=auth_headers)
    assert res.status_code == 201
    assert res.json()["quotation_email"] is None
    assert res.json()["email"] == f"login_only_{ts}@domain.com"


def test_update_quotation_email_succeeds(auth_headers):
    """5. Update quotation email succeeds."""
    cust = _seed_test_customer(email="account@example.com", quotation_email=None)
    res = client.put(
        f"/api/v1/customers/{cust.id}",
        json={"quotation_email": "new-quotes@example.com"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["quotation_email"] == "new-quotes@example.com"
    assert res.json()["email"] == "account@example.com"


def test_clearing_quotation_email_succeeds(auth_headers):
    """6. Clearing quotation email succeeds (falls back to login email)."""
    cust = _seed_test_customer(email="account@example.com", quotation_email="old-quote@example.com")
    res = client.put(
        f"/api/v1/customers/{cust.id}",
        json={"quotation_email": ""},
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["quotation_email"] is None
    assert res.json()["email"] == "account@example.com"


def test_login_email_remains_unchanged_when_quotation_email_changes(auth_headers):
    """7. Login email remains unchanged when quotation email changes."""
    cust = _seed_test_customer(email="strictly_login@firm.com", quotation_email="v1@firm.com")
    res = client.put(
        f"/api/v1/customers/{cust.id}/communication-settings",
        json={"quotation_email": "v2@firm.com"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["quotation_email"] == "v2@firm.com"
    assert data["email"] == "strictly_login@firm.com"


# ==============================================================================
# 2. Duplicate Customer Protection
# ==============================================================================

def test_duplicate_gstin_within_same_company_blocked(auth_headers):
    """8. Duplicate GSTIN within same company is blocked (409 Conflict)."""
    ts = int(time.time() * 1000)
    gstin = f"27AABCD{ts % 10000:04d}E1Z1"
    _seed_test_customer(name="Primary Client", gstin=gstin)

    payload = {
        "name": "Duplicate Client Attempt",
        "gstin": gstin,
    }
    res = client.post("/api/v1/customers", json=payload, headers=auth_headers)
    assert res.status_code == 409
    assert f"A customer with GSTIN '{gstin}' already exists in your company." in res.json()["detail"]


def test_duplicate_login_email_within_same_company_blocked(auth_headers):
    """9. Duplicate login email within same company is blocked (409 Conflict)."""
    ts = int(time.time() * 1000)
    dup_email = f"duplicate_{ts}@supplier.com"
    _seed_test_customer(name="Existing Customer", email=dup_email)

    payload = {
        "name": "Second Customer With Same Email",
        "email": dup_email,
    }
    res = client.post("/api/v1/customers", json=payload, headers=auth_headers)
    assert res.status_code == 409
    assert f"A customer with login email '{dup_email}' already exists in your company." in res.json()["detail"]


def test_duplicate_gstin_in_different_company_allowed(auth_headers, auth_headers_company_b):
    """10. Duplicate GSTIN in different company is allowed (Tenant Isolation)."""
    ts = int(time.time() * 1000)
    shared_gstin = f"27SHARED{ts % 1000:03d}Z1"

    # Company A creates customer with shared_gstin
    res_a = client.post(
        "/api/v1/customers",
        json={"name": "Company A Client", "gstin": shared_gstin},
        headers=auth_headers,
    )
    assert res_a.status_code == 201

    # Company B creates customer with same shared_gstin -> Must succeed!
    res_b = client.post(
        "/api/v1/customers",
        json={"name": "Company B Client", "gstin": shared_gstin},
        headers=auth_headers_company_b,
    )
    assert res_b.status_code == 201


def test_duplicate_login_email_in_different_company_allowed(auth_headers, auth_headers_company_b):
    """11. Duplicate login email in different company is allowed (Tenant Isolation)."""
    ts = int(time.time() * 1000)
    shared_email = f"shared_buyer_{ts}@conglomerate.com"

    # Company A creates customer
    res_a = client.post(
        "/api/v1/customers",
        json={"name": "Client in Tenant A", "email": shared_email},
        headers=auth_headers,
    )
    assert res_a.status_code == 201

    # Company B creates customer with same email -> Must succeed!
    res_b = client.post(
        "/api/v1/customers",
        json={"name": "Client in Tenant B", "email": shared_email},
        headers=auth_headers_company_b,
    )
    assert res_b.status_code == 201


# ==============================================================================
# 3. Tenant Isolation & IDOR Protection
# ==============================================================================

def test_customer_get_and_update_tenant_isolated(auth_headers, auth_headers_company_b):
    """12 & 13. Customer GET, PUT, DELETE return 404 for cross-company user."""
    cust_a = _seed_test_customer(company_id="comp-bpe-pune", name="Tenant A Secret Customer")

    # Company B attempts GET
    res_b_get = client.get(f"/api/v1/customers/{cust_a.id}", headers=auth_headers_company_b)
    assert res_b_get.status_code == 404

    # Company B attempts PUT
    res_b_put = client.put(f"/api/v1/customers/{cust_a.id}", json={"name": "Hacked"}, headers=auth_headers_company_b)
    assert res_b_put.status_code == 404

    # Company B attempts DELETE
    res_b_del = client.delete(f"/api/v1/customers/{cust_a.id}", headers=auth_headers_company_b)
    assert res_b_del.status_code == 404


def test_cross_company_quotation_customer_association_fails(auth_headers_company_b):
    """14. Associating a customer from Company A to Company B's quotation fails (400)."""
    cust_a = _seed_test_customer(company_id="comp-bpe-pune", name="Company A Customer")

    payload = {
        "quotation_number": f"BPE/QT/{int(time.time() * 1000)}",
        "customer_id": cust_a.id,
        "material_cost": 1000,
        "process_cost": 500,
        "subtotal": 1500,
        "taxable_amount": 1500,
        "final_total": 1770,
    }
    # Company B tries to create quotation referencing Company A customer
    res = client.post("/api/v1/quotations", json=payload, headers=auth_headers_company_b)
    assert res.status_code == 400
    assert "Invalid customer for tenant" in res.json()["detail"]


def test_cross_company_po_customer_association_fails(auth_headers_company_b):
    """15. Associating a customer from Company A to Company B's PO fails (400)."""
    cust_a = _seed_test_customer(company_id="comp-bpe-pune", name="Company A Customer")

    payload = {
        "po_number": f"PO-HIJACK-{int(time.time())}",
        "customer_id": cust_a.id,
    }
    # Company B tries to create PO referencing Company A customer
    res = client.post("/api/v1/purchase-orders", json=payload, headers=auth_headers_company_b)
    assert res.status_code == 400
    assert "Invalid customer for tenant" in res.json()["detail"]


# ==============================================================================
# 4. Customer History (Quotations & Purchase Orders)
# ==============================================================================

def test_customer_quotation_history_returns_only_that_customers_quotations(auth_headers):
    """16. GET /customers/{id}/quotations returns only that customer's quotations."""
    cust_target = _seed_test_customer(name="Target Client For History")
    cust_other = _seed_test_customer(name="Other Client")

    q1 = _seed_test_quotation(customer_id=cust_target.id)
    q2 = _seed_test_quotation(customer_id=cust_target.id)
    q_other = _seed_test_quotation(customer_id=cust_other.id)

    res = client.get(f"/api/v1/customers/{cust_target.id}/quotations", headers=auth_headers)
    assert res.status_code == 200
    history = res.json()
    history_ids = [item["id"] for item in history]
    assert q1.id in history_ids
    assert q2.id in history_ids
    assert q_other.id not in history_ids

    # Verify query filter on /quotations?customer_id=...
    res_filter = client.get(f"/api/v1/quotations?customer_id={cust_target.id}", headers=auth_headers)
    assert res_filter.status_code == 200
    filter_ids = [item["id"] for item in res_filter.json()]
    assert q1.id in filter_ids
    assert q_other.id not in filter_ids


def test_customer_po_history_returns_only_that_customers_pos(auth_headers):
    """17. GET /customers/{id}/purchase-orders returns only that customer's POs."""
    cust_target = _seed_test_customer(name="Target Client For POs")
    cust_other = _seed_test_customer(name="Other Client For POs")

    po1 = _seed_test_po(customer_id=cust_target.id)
    po2 = _seed_test_po(customer_id=cust_target.id)
    po_other = _seed_test_po(customer_id=cust_other.id)

    res = client.get(f"/api/v1/customers/{cust_target.id}/purchase-orders", headers=auth_headers)
    assert res.status_code == 200
    history = res.json()
    history_ids = [item["id"] for item in history]
    assert po1.id in history_ids
    assert po2.id in history_ids
    assert po_other.id not in history_ids

    # Verify query filter on /purchase-orders?customer_id=...
    res_filter = client.get(f"/api/v1/purchase-orders?customer_id={cust_target.id}", headers=auth_headers)
    assert res_filter.status_code == 200
    filter_ids = [item["id"] for item in res_filter.json()]
    assert po1.id in filter_ids
    assert po_other.id not in filter_ids


# ==============================================================================
# 5. Deactivated Customer Restrictions & Historical Immutability
# ==============================================================================

def test_deactivated_customer_cannot_be_used_for_new_quotations(auth_headers):
    """18. Deactivated customer cannot be used for new quotations (400)."""
    deact_cust = _seed_test_customer(name="Deactivated Corp", is_active=False)

    payload = {
        "quotation_number": f"BPE/QT/FAIL-{int(time.time() * 1000)}",
        "customer_id": deact_cust.id,
        "material_cost": 500,
        "process_cost": 500,
        "subtotal": 1000,
        "taxable_amount": 1000,
        "final_total": 1180,
    }
    res = client.post("/api/v1/quotations", json=payload, headers=auth_headers)
    assert res.status_code == 400
    assert "Cannot create quotation for deactivated customer" in res.json()["detail"]


def test_deactivated_customer_cannot_be_used_for_new_pos(auth_headers):
    """19. Deactivated customer cannot be used for new POs (400)."""
    deact_cust = _seed_test_customer(name="Deactivated Corp 2", is_active=False)

    payload = {
        "po_number": f"PO-FAIL-{int(time.time())}",
        "customer_id": deact_cust.id,
    }
    res = client.post("/api/v1/purchase-orders", json=payload, headers=auth_headers)
    assert res.status_code == 400
    assert "Cannot create purchase order for deactivated customer" in res.json()["detail"]


def test_existing_historical_final_quotations_remain_accessible_when_deactivated(auth_headers):
    """20. Historical FINAL quotations remain accessible when customer is deactivated."""
    cust = _seed_test_customer(name="Active Then Deactivated")
    final_q = _seed_test_quotation(customer_id=cust.id, status="FINAL")

    # Deactivate customer
    res_del = client.delete(f"/api/v1/customers/{cust.id}", headers=auth_headers)
    assert res_del.status_code == 204

    # Historical final quotation must remain readable
    res_q = client.get(f"/api/v1/quotations/{final_q.id}", headers=auth_headers)
    assert res_q.status_code == 200
    assert res_q.json()["id"] == final_q.id
    assert res_q.json()["status"] == "FINAL"


# ==============================================================================
# 6. Recipient Resolution & Pagination
# ==============================================================================

def test_email_recipient_resolution_priority_maintained(auth_headers):
    """21 & 22. Strict priority: Customer.quotation_email -> Customer.email / login_email."""
    fake_email = get_email_service()
    fake_email.clear()

    # Case A: Has quotation_email
    cust_a = _seed_test_customer(
        email="login_a@firm.com",
        quotation_email="quotes_a@firm.com",
    )
    quote_a = _seed_test_quotation(customer_id=cust_a.id, status="FINAL")
    res_a = client.post(f"/api/v1/quotations/{quote_a.id}/send-email", headers=auth_headers)
    assert res_a.status_code == 200
    assert fake_email.get_last_sent()["to"] == "quotes_a@firm.com"

    # Case B: No quotation_email -> falls back to login email
    cust_b = _seed_test_customer(
        email="login_b@firm.com",
        quotation_email=None,
    )
    quote_b = _seed_test_quotation(customer_id=cust_b.id, status="FINAL")
    res_b = client.post(f"/api/v1/quotations/{quote_b.id}/send-email", headers=auth_headers)
    assert res_b.status_code == 200
    assert fake_email.get_last_sent()["to"] == "login_b@firm.com"


def test_customer_pagination_search_and_status_filtering(auth_headers):
    """23 & 24. Server-side pagination, search, and status filtering."""
    ts = int(time.time() * 1000)
    c1 = _seed_test_customer(name=f"Filter Alpha {ts}", email=f"alpha_{ts}@filter.com", is_active=True)
    c2 = _seed_test_customer(name=f"Filter Beta {ts}", email=f"beta_{ts}@filter.com", is_active=False)

    # 1. Paginated active request with search targeting c1
    res_p1 = client.get(f"/api/v1/customers?page=1&page_size=10&status=active&search={ts}", headers=auth_headers)
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()
    assert "items" in data_p1
    assert "total" in data_p1
    active_ids = [it["id"] for it in data_p1["items"]]
    assert c1.id in active_ids
    assert c2.id not in active_ids

    # 2. Paginated deactivated request with search targeting c2
    res_p2 = client.get(f"/api/v1/customers?page=1&page_size=10&status=inactive&search={ts}", headers=auth_headers)
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()
    deact_ids = [it["id"] for it in data_p2["items"]]
    assert c2.id in deact_ids
    assert c1.id not in deact_ids

    # 3. Search query with status=all
    res_s = client.get(f"/api/v1/customers?page=1&page_size=10&status=all&search=Alpha {ts}", headers=auth_headers)
    assert res_s.status_code == 200
    data_s = res_s.json()
    assert len(data_s["items"]) == 1
    assert data_s["items"][0]["id"] == c1.id
