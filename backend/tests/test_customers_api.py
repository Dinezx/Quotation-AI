import time
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_customer_crud_and_deactivate(auth_headers):
    """Test creating a customer, updating fields, soft-deleting, and list exclusion."""
    unique_name = f"Ashok Leyland Plant {int(time.time())}"
    payload = {
        "name": unique_name,
        "contact_person": "Sunil Varma",
        "email": "sunil.varma@ashokleyland.com",
        "phone": "+91 44 2530 0000",
        "billing_address": "Ennore, Chennai, Tamil Nadu - 600057",
        "shipping_address": "Hosur Unit II, Tamil Nadu",
        "gstin": "33AAACA1234B1Z2",
        "is_active": True,
    }

    # 1. Create
    res_create = client.post("/api/v1/customers", json=payload, headers=auth_headers)
    assert res_create.status_code == 201, res_create.text
    cust = res_create.json()
    cust_id = cust["id"]
    assert cust["name"] == unique_name

    # 2. Get by ID
    res_get = client.get(f"/api/v1/customers/{cust_id}", headers=auth_headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == cust_id

    # 3. Update
    res_upd = client.put(
        f"/api/v1/customers/{cust_id}",
        json={"contact_person": "Sunil Varma (VP Sourcing)"},
        headers=auth_headers,
    )
    assert res_upd.status_code == 200
    assert res_upd.json()["contact_person"] == "Sunil Varma (VP Sourcing)"

    # 4. Deactivate (soft delete)
    res_del = client.delete(f"/api/v1/customers/{cust_id}", headers=auth_headers)
    assert res_del.status_code == 204

    # 5. Verify excluded from active list
    res_list = client.get("/api/v1/customers", headers=auth_headers)
    assert res_list.status_code == 200
    active_names = [c["name"] for c in res_list.json()]
    assert unique_name not in active_names


def test_nonexistent_customer_404(auth_headers):
    """Test that accessing, updating, or deleting a nonexistent customer returns 404."""
    ghost_id = "cust-00000000-0000-0000-0000-000000000000"

    res_get = client.get(f"/api/v1/customers/{ghost_id}", headers=auth_headers)
    assert res_get.status_code == 404
    assert res_get.json()["detail"] == "Customer not found"

    res_put = client.put(f"/api/v1/customers/{ghost_id}", json={"name": "Ghost Corp"}, headers=auth_headers)
    assert res_put.status_code == 404

    res_del = client.delete(f"/api/v1/customers/{ghost_id}", headers=auth_headers)
    assert res_del.status_code == 404


def test_cross_company_customer_access_rejected(auth_headers, auth_headers_company_b):
    """Test multi-tenancy isolation: Company B cannot view, modify, or delete Company A's customer."""
    unique_name = f"Company A Secret Client {int(time.time())}"
    res_a = client.post(
        "/api/v1/customers",
        json={"name": unique_name, "email": "secret@client.com"},
        headers=auth_headers,
    )
    assert res_a.status_code == 201
    cust_a_id = res_a.json()["id"]

    # Company B attempts to read
    res_b_get = client.get(f"/api/v1/customers/{cust_a_id}", headers=auth_headers_company_b)
    assert res_b_get.status_code == 404
    assert res_b_get.json()["detail"] == "Customer not found"

    # Company B attempts to update
    res_b_put = client.put(
        f"/api/v1/customers/{cust_a_id}",
        json={"name": "Hijacked Name"},
        headers=auth_headers_company_b,
    )
    assert res_b_put.status_code == 404

    # Company B attempts to delete
    res_b_del = client.delete(f"/api/v1/customers/{cust_a_id}", headers=auth_headers_company_b)
    assert res_b_del.status_code == 404

    # Company B lists customers -> Company A's customer must not appear
    res_b_list = client.get("/api/v1/customers", headers=auth_headers_company_b)
    assert res_b_list.status_code == 200
    b_names = [c["name"] for c in res_b_list.json()]
    assert unique_name not in b_names
