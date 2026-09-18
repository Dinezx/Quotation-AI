import time
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_create_and_get_quotation(auth_headers):
    """Test creating a quotation with items and fetching it by ID."""
    unique_qt = f"QT-API-{int(time.time())}"
    payload = {
        "quotation_number": unique_qt,
        "customer_id": "cust-mm-01",
        "currency": "INR",
        "overhead_percentage": 10.0,
        "profit_percentage": 15.0,
        "gst_type": "CGST_SGST",
        "status": "DRAFT",
        "items": [
            {
                "item_number": 1,
                "part_name": "Titanium Valve Guide",
                "specification": "Grade 5 Ti",
                "quantity": 12.0,
                "unit": "PCS",
                "subtotal": 2400.0,
            }
        ],
    }

    res_create = client.post("/api/v1/quotations", json=payload, headers=auth_headers)
    assert res_create.status_code == 201, res_create.text
    q_data = res_create.json()
    assert q_data["quotation_number"] == unique_qt
    assert q_data["status"] == "DRAFT"
    assert len(q_data["items"]) == 1
    q_id = q_data["id"]

    # Fetch by ID
    res_get = client.get(f"/api/v1/quotations/{q_id}", headers=auth_headers)
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["id"] == q_id
    assert get_data["quotation_number"] == unique_qt
    assert len(get_data["items"]) == 1


def test_list_quotations(auth_headers):
    """Test listing quotations under the authenticated company."""
    unique_qt = f"QT-LIST-{int(time.time())}"
    client.post(
        "/api/v1/quotations",
        json={"quotation_number": unique_qt, "status": "DRAFT"},
        headers=auth_headers,
    )

    res = client.get("/api/v1/quotations", headers=auth_headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    numbers = [q["quotation_number"] for q in items]
    assert unique_qt in numbers


def test_update_quotation_terms_and_status(auth_headers):
    """Test updating quotation terms, status transitions, and commercial notes."""
    unique_qt = f"QT-STAT-{int(time.time())}"
    res = client.post(
        "/api/v1/quotations",
        json={"quotation_number": unique_qt, "status": "DRAFT"},
        headers=auth_headers,
    )
    q_id = res.json()["id"]

    # Transition to SENT
    update_payload_1 = {
        "status": "SENT",
        "notes": "Delivered quotation via email to lead sourcing manager.",
        "payment_terms": "45 days from delivery",
        "delivery_terms": "Ex-works Bhosari Pune",
    }
    res_upd_1 = client.put(f"/api/v1/quotations/{q_id}", json=update_payload_1, headers=auth_headers)
    assert res_upd_1.status_code == 200
    data_1 = res_upd_1.json()
    assert data_1["status"] == "SENT"
    assert data_1["payment_terms"] == "45 days from delivery"
    assert data_1["delivery_terms"] == "Ex-works Bhosari Pune"

    # Transition to ACCEPTED
    update_payload_2 = {"status": "ACCEPTED"}
    res_upd_2 = client.put(f"/api/v1/quotations/{q_id}", json=update_payload_2, headers=auth_headers)
    assert res_upd_2.status_code == 200
    assert res_upd_2.json()["status"] == "ACCEPTED"


def test_nonexistent_quotation_404(auth_headers):
    """Test that requesting, updating, or calculating a nonexistent quotation returns 404."""
    ghost_id = "qt-00000000-0000-0000-0000-000000000000"

    res_get = client.get(f"/api/v1/quotations/{ghost_id}", headers=auth_headers)
    assert res_get.status_code == 404
    assert res_get.json()["detail"] == "Quotation not found"

    res_put = client.put(f"/api/v1/quotations/{ghost_id}", json={"status": "SENT"}, headers=auth_headers)
    assert res_put.status_code == 404

    res_calc = client.post(
        f"/api/v1/quotations/{ghost_id}/calculate",
        json={"items": [], "overhead_percentage": 10, "profit_percentage": 15, "gst_type": "CGST_SGST"},
        headers=auth_headers,
    )
    assert res_calc.status_code == 404


def test_cross_company_quotation_access_rejected(auth_headers, auth_headers_company_b):
    """Test multi-tenancy isolation: Company B cannot read or modify Company A's quotation."""
    # 1. Company A creates quotation
    unique_qt = f"QT-TENANT-A-{int(time.time())}"
    res_a = client.post(
        "/api/v1/quotations",
        json={"quotation_number": unique_qt, "status": "DRAFT"},
        headers=auth_headers,
    )
    assert res_a.status_code == 201
    q_a_id = res_a.json()["id"]

    # 2. Company B attempts GET
    res_b_get = client.get(f"/api/v1/quotations/{q_a_id}", headers=auth_headers_company_b)
    assert res_b_get.status_code == 404
    assert res_b_get.json()["detail"] == "Quotation not found"

    # 3. Company B attempts PUT
    res_b_put = client.put(
        f"/api/v1/quotations/{q_a_id}",
        json={"status": "MALICIOUS_OVERRIDE"},
        headers=auth_headers_company_b,
    )
    assert res_b_put.status_code == 404

    # 4. Company B attempts stateful recalculation
    res_b_calc = client.post(
        f"/api/v1/quotations/{q_a_id}/calculate",
        json={"items": [], "overhead_percentage": 10, "profit_percentage": 15, "gst_type": "CGST_SGST"},
        headers=auth_headers_company_b,
    )
    assert res_b_calc.status_code == 404

    # 5. Company B lists quotations -> Company A's quotation must not appear
    res_b_list = client.get("/api/v1/quotations", headers=auth_headers_company_b)
    assert res_b_list.status_code == 200
    b_quotation_ids = [q["id"] for q in res_b_list.json()]
    assert q_a_id not in b_quotation_ids
