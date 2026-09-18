import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.user import User

client = TestClient(app)


def test_unauthenticated_protected_endpoints_rejected():
    """Verify that calling protected endpoints without credentials returns 401 Unauthorized."""
    endpoints = [
        ("GET", "/api/v1/auth/me"),
        ("GET", "/api/v1/purchase-orders"),
        ("GET", "/api/v1/quotations"),
        ("GET", "/api/v1/customers"),
        ("GET", "/api/v1/rates/materials"),
        ("GET", "/api/v1/rates/processes"),
        ("POST", "/api/v1/quotations/calculate"),
    ]

    for method, path in endpoints:
        res = client.request(method, path)
        assert res.status_code == 401, f"{path} did not reject unauthenticated access"
        assert "Missing Authorization header" in res.json()["detail"]


def test_deactivated_user_is_forbidden(session_jwt_signer):
    """Verify that a user marked is_active=False is rejected with 403 Forbidden."""
    # Create deactivated user in DB
    deact_sub = f"usr-deactivated-{int(time.time())}"
    deact_email = f"deactivated.{int(time.time())}@bharatprecision.co.in"

    db = SessionLocal()
    try:
        user = User(
            id=deact_sub,
            company_id="comp-bpe-pune",
            email=deact_email,
            full_name="Deactivated Test User",
            role="COSTING_ENGINEER",
            is_active=False,
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    # Generate token for deactivated user
    token = session_jwt_signer(deact_sub, deact_email)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 403
    assert "User account is deactivated" in res.json()["detail"]


def test_missing_required_fields_returns_422(auth_headers):
    """Verify FastAPI Pydantic schema validation error handling (422 Unprocessable Entity)."""
    # 1. Customer missing required 'name'
    res_cust = client.post("/api/v1/customers", json={"email": "noname@corp.com"}, headers=auth_headers)
    assert res_cust.status_code == 422

    # 2. Material missing required 'base_rate'
    res_mat = client.post("/api/v1/rates/materials", json={"name": "Incomplete Alloy", "grade": "INC-01"}, headers=auth_headers)
    assert res_mat.status_code == 422

    # 3. Process missing required 'hourly_rate'
    res_proc = client.post("/api/v1/rates/processes", json={"name": "Incomplete Process"}, headers=auth_headers)
    assert res_proc.status_code == 422

    # 4. PO missing required 'po_number'
    res_po = client.post("/api/v1/purchase-orders", json={"customer_name": "No PO Number"}, headers=auth_headers)
    assert res_po.status_code == 422


def test_auth_me_returns_company_profile(auth_headers):
    """Verify GET /api/v1/auth/me returns both user identity and company profile."""
    res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "user" in data
    assert "company" in data
    assert data["user"]["company_id"] == "comp-bpe-pune"
    assert data["company"]["id"] == "comp-bpe-pune"
    assert "Bharat Precision" in data["company"]["name"]


@pytest.fixture(scope="module")
def company_b_test_data(session_jwt_signer):
    """Seed complete suite of test entities strictly owned by Company B ('comp-other-plant')."""
    token_b = session_jwt_signer("usr-other-plant-001", "engineer@otherplant.co.in")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    t = int(time.time() * 1000)

    # 1. Company B Customer
    res_c = client.post(
        "/api/v1/customers",
        json={"name": f"Company B Exclusive Client {t}", "contact_person": "Mr B", "email": f"client{t}@comp-b.com"},
        headers=headers_b,
    )
    assert res_c.status_code == 201
    cust_b = res_c.json()

    # 2. Company B Material
    res_m = client.post(
        "/api/v1/rates/materials",
        json={
            "name": f"Titanium Grade 5 {t}",
            "grade": f"Ti-6Al-4V-{t}",
            "density": 4.43,
            "unit": "kg",
            "base_rate": 3500.0,
            "scrap_credit_rate": 800.0,
        },
        headers=headers_b,
    )
    assert res_m.status_code == 201
    mat_b = res_m.json()

    # 3. Company B Process
    res_p = client.post(
        "/api/v1/rates/processes",
        json={
            "name": f"5-Axis CNC Milling {t}",
            "unit": "hour",
            "hourly_rate": 2500.0,
            "setup_cost": 500.0,
        },
        headers=headers_b,
    )
    assert res_p.status_code == 201
    proc_b = res_p.json()

    # 4. Company B Purchase Order with Item
    res_po = client.post(
        "/api/v1/purchase-orders",
        json={
            "po_number": f"PO-B-{t}",
            "customer_id": cust_b["id"],
            "customer_name": cust_b["name"],
            "items": [
                {
                    "item_number": 1,
                    "part_number": f"PRT-B-{t}",
                    "part_name": "Aerospace Bracket",
                    "quantity": 25,
                    "unit": "pcs",
                    "material_id": mat_b["id"],
                    "process_id": proc_b["id"],
                }
            ],
        },
        headers=headers_b,
    )
    assert res_po.status_code == 201
    po_b = res_po.json()
    item_b = po_b["items"][0]

    # 5. Company B Quotation with Item
    res_q = client.post(
        "/api/v1/quotations",
        json={
            "quotation_number": f"QT-B-{t}",
            "customer_id": cust_b["id"],
            "purchase_order_id": po_b["id"],
            "status": "DRAFT",
            "items": [
                {
                    "item_number": 1,
                    "part_name": "Aerospace Bracket",
                    "quantity": 25,
                    "unit": "pcs",
                    "gross_material_cost": 500.0,
                    "process_cost": 300.0,
                    "subtotal": 800.0,
                    "total_price": 1000.0,
                }
            ],
        },
        headers=headers_b,
    )
    assert res_q.status_code == 201
    quot_b = res_q.json()

    return {
        "customer": cust_b,
        "material": mat_b,
        "process": proc_b,
        "po": po_b,
        "po_item": item_b,
        "quotation": quot_b,
    }


def test_company_a_cannot_read_company_b_customer(auth_headers, company_b_test_data):
    """Verify Company A cannot read Company B customer (404)."""
    cust_id = company_b_test_data["customer"]["id"]
    res = client.get(f"/api/v1/customers/{cust_id}", headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Customer not found"


def test_company_a_cannot_modify_company_b_customer(auth_headers, company_b_test_data):
    """Verify Company A cannot modify Company B customer (404)."""
    cust_id = company_b_test_data["customer"]["id"]
    res = client.put(f"/api/v1/customers/{cust_id}", json={"name": "Hacked Client"}, headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Customer not found"


def test_company_a_cannot_delete_company_b_customer(auth_headers, company_b_test_data):
    """Verify Company A cannot delete Company B customer (404)."""
    cust_id = company_b_test_data["customer"]["id"]
    res = client.delete(f"/api/v1/customers/{cust_id}", headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Customer not found"


def test_company_a_cannot_read_company_b_material(auth_headers, company_b_test_data):
    """Verify Company A cannot read Company B material rate card (404)."""
    mat_id = company_b_test_data["material"]["id"]
    res = client.get(f"/api/v1/rates/materials/{mat_id}", headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Material rate card not found"


def test_company_a_cannot_modify_or_delete_company_b_material(auth_headers, company_b_test_data):
    """Verify Company A cannot modify or delete Company B material rate card (404)."""
    mat_id = company_b_test_data["material"]["id"]
    # Attempt modify
    res_put = client.put(f"/api/v1/rates/materials/{mat_id}", json={"base_rate": 10.0}, headers=auth_headers)
    assert res_put.status_code == 404
    assert res_put.json()["detail"] == "Material rate card not found"

    # Attempt delete
    res_del = client.delete(f"/api/v1/rates/materials/{mat_id}", headers=auth_headers)
    assert res_del.status_code == 404
    assert res_del.json()["detail"] == "Material rate card not found"


def test_company_a_cannot_read_company_b_process(auth_headers, company_b_test_data):
    """Verify Company A cannot read Company B process rate card (404)."""
    proc_id = company_b_test_data["process"]["id"]
    res = client.get(f"/api/v1/rates/processes/{proc_id}", headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Process rate card not found"


def test_company_a_cannot_modify_or_delete_company_b_process(auth_headers, company_b_test_data):
    """Verify Company A cannot modify or delete Company B process rate card (404)."""
    proc_id = company_b_test_data["process"]["id"]
    # Attempt modify
    res_put = client.put(f"/api/v1/rates/processes/{proc_id}", json={"hourly_rate": 10.0}, headers=auth_headers)
    assert res_put.status_code == 404
    assert res_put.json()["detail"] == "Process rate card not found"

    # Attempt delete
    res_del = client.delete(f"/api/v1/rates/processes/{proc_id}", headers=auth_headers)
    assert res_del.status_code == 404
    assert res_del.json()["detail"] == "Process rate card not found"


def test_company_a_cannot_read_company_b_po(auth_headers, company_b_test_data):
    """Verify Company A cannot read Company B purchase order (404)."""
    po_id = company_b_test_data["po"]["id"]
    res = client.get(f"/api/v1/purchase-orders/{po_id}", headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Purchase order not found"


def test_company_a_cannot_modify_company_b_po(auth_headers, company_b_test_data):
    """Verify Company A cannot modify Company B purchase order (404)."""
    po_id = company_b_test_data["po"]["id"]
    res = client.put(f"/api/v1/purchase-orders/{po_id}", json={"status": "COMPLETED"}, headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Purchase order not found"


def test_company_a_cannot_read_or_modify_company_b_po_item(auth_headers, company_b_test_data):
    """Verify Company A cannot read or modify Company B PO line item (404)."""
    po_id = company_b_test_data["po"]["id"]
    item_id = company_b_test_data["po_item"]["id"]

    # Attempt read
    res_get = client.get(f"/api/v1/purchase-orders/{po_id}/items/{item_id}", headers=auth_headers)
    assert res_get.status_code == 404

    # Attempt modify
    res_put = client.put(
        f"/api/v1/purchase-orders/{po_id}/items/{item_id}",
        json={"machining_hours": 999.0},
        headers=auth_headers,
    )
    assert res_put.status_code == 404


def test_company_a_cannot_read_company_b_quotation(auth_headers, company_b_test_data):
    """Verify Company A cannot read Company B quotation (404)."""
    q_id = company_b_test_data["quotation"]["id"]
    res = client.get(f"/api/v1/quotations/{q_id}", headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Quotation not found"


def test_company_a_cannot_modify_company_b_quotation(auth_headers, company_b_test_data):
    """Verify Company A cannot modify Company B quotation (404)."""
    q_id = company_b_test_data["quotation"]["id"]
    res = client.put(f"/api/v1/quotations/{q_id}", json={"status": "APPROVED"}, headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Quotation not found"


def test_company_a_cannot_calculate_company_b_quotation(auth_headers, company_b_test_data):
    """Verify Company A cannot calculate Company B quotation (404)."""
    q_id = company_b_test_data["quotation"]["id"]
    calc_payload = {
        "quotation_number": "Q-ATTACK",
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "CGST_SGST",
        "items": [
            {
                "item_number": 1,
                "part_name": "Part",
                "quantity": 10,
                "raw_material_rate_per_kg": 100.0,
                "gross_weight_kg": 1.0,
                "net_weight_kg": 0.8,
                "scrap_credit_rate_per_kg": 20.0,
                "operations": [],
            }
        ],
    }
    res = client.post(f"/api/v1/quotations/{q_id}/calculate", json=calc_payload, headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Quotation not found"


def test_list_endpoints_do_not_leak_company_b_records(auth_headers, company_b_test_data):
    """Verify that all list endpoints strictly isolate tenant records and never leak Company B's data."""
    cust_b_id = company_b_test_data["customer"]["id"]
    mat_b_id = company_b_test_data["material"]["id"]
    proc_b_id = company_b_test_data["process"]["id"]
    po_b_id = company_b_test_data["po"]["id"]
    q_b_id = company_b_test_data["quotation"]["id"]

    # Customers
    res_c = client.get("/api/v1/customers", headers=auth_headers)
    assert res_c.status_code == 200
    assert cust_b_id not in [item["id"] for item in res_c.json()]

    # Materials
    res_m = client.get("/api/v1/rates/materials", headers=auth_headers)
    assert res_m.status_code == 200
    assert mat_b_id not in [item["id"] for item in res_m.json()]

    # Processes
    res_p = client.get("/api/v1/rates/processes", headers=auth_headers)
    assert res_p.status_code == 200
    assert proc_b_id not in [item["id"] for item in res_p.json()]

    # Purchase Orders
    res_po = client.get("/api/v1/purchase-orders", headers=auth_headers)
    assert res_po.status_code == 200
    assert po_b_id not in [item["id"] for item in res_po.json()]

    # Quotations
    res_q = client.get("/api/v1/quotations", headers=auth_headers)
    assert res_q.status_code == 200
    assert q_b_id not in [item["id"] for item in res_q.json()]


def test_company_a_cannot_link_to_company_b_foreign_keys_idor(auth_headers, company_b_test_data):
    """
    IDOR Prevention Test:
    Verify Company A cannot link newly created POs or Quotations to Company B's customers or POs.
    """
    cust_b_id = company_b_test_data["customer"]["id"]
    po_b_id = company_b_test_data["po"]["id"]

    # 1. Company A tries to create PO linking to Company B customer
    res_po = client.post(
        "/api/v1/purchase-orders",
        json={"po_number": f"PO-ATTACK-{int(time.time())}", "customer_id": cust_b_id},
        headers=auth_headers,
    )
    assert res_po.status_code == 400
    assert "invalid customer" in res_po.json()["detail"].lower()

    # 2. Company A tries to create Quotation linking to Company B customer
    res_q1 = client.post(
        "/api/v1/quotations",
        json={"quotation_number": f"QT-ATTACK-1-{int(time.time())}", "customer_id": cust_b_id, "status": "DRAFT"},
        headers=auth_headers,
    )
    assert res_q1.status_code == 400
    assert "invalid customer" in res_q1.json()["detail"].lower()

    # 3. Company A tries to create Quotation linking to Company B purchase order
    res_q2 = client.post(
        "/api/v1/quotations",
        json={"quotation_number": f"QT-ATTACK-2-{int(time.time())}", "purchase_order_id": po_b_id, "status": "DRAFT"},
        headers=auth_headers,
    )
    assert res_q2.status_code == 400
    assert "invalid purchase order" in res_q2.json()["detail"].lower()

