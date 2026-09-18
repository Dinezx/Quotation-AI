import os
import io
import time
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_create_purchase_order_with_items(auth_headers):
    """Test creating a PO with line items."""
    unique_po = f"PO-TEST-{int(time.time())}"
    payload = {
        "po_number": unique_po,
        "customer_name": "Mahindra & Mahindra Ltd.",
        "status": "UPLOADED",
        "items": [
            {
                "item_number": 1,
                "part_number": "MM-ENG-001",
                "part_name": "Transmission Housing Flange",
                "specification": "SS 304",
                "quantity": 25.0,
                "unit": "PCS",
                "gross_weight_kg": 14.5,
                "net_weight_kg": 11.2,
                "scrap_weight_kg": 3.3,
                "machining_hours": 3.0,
                "setup_hours": 0.5,
                "confidence": 0.98,
            },
            {
                "item_number": 2,
                "part_number": "MM-ENG-002",
                "part_name": "Drive Shaft Bushing",
                "specification": "EN8D",
                "quantity": 50.0,
                "unit": "PCS",
                "gross_weight_kg": 3.2,
                "net_weight_kg": 2.5,
                "scrap_weight_kg": 0.7,
                "machining_hours": 0.75,
                "setup_hours": 0.25,
                "confidence": 0.95,
            },
        ],
    }

    res = client.post("/api/v1/purchase-orders", json=payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["id"] is not None
    assert data["po_number"] == unique_po
    assert len(data["items"]) == 2
    assert data["items"][0]["part_number"] == "MM-ENG-001"
    assert data["items"][1]["part_number"] == "MM-ENG-002"
    assert Decimal(str(data["items"][0]["quantity"])) == Decimal("25.00")


def test_create_purchase_order_without_items(auth_headers):
    """Test creating a minimal PO without pre-extracted items."""
    unique_po = f"PO-MIN-{int(time.time())}"
    payload = {
        "po_number": unique_po,
        "customer_name": "Tata Motors Ltd.",
        "status": "DRAFT",
    }
    res = client.post("/api/v1/purchase-orders", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["po_number"] == unique_po
    assert data["items"] == []


def test_list_purchase_orders_and_filter(auth_headers):
    """Test listing POs with and without status filtering."""
    # Create an uploaded and a reviewed PO
    po_num_1 = f"PO-UP-{int(time.time())}"
    po_num_2 = f"PO-REV-{int(time.time())}"

    client.post(
        "/api/v1/purchase-orders",
        json={"po_number": po_num_1, "status": "UPLOADED"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/purchase-orders",
        json={"po_number": po_num_2, "status": "REVIEWED"},
        headers=auth_headers,
    )

    # List all
    res_all = client.get("/api/v1/purchase-orders", headers=auth_headers)
    assert res_all.status_code == 200
    pos = res_all.json()
    assert len(pos) >= 2

    # Filter by UPLOADED
    res_filtered = client.get("/api/v1/purchase-orders?status_filter=UPLOADED", headers=auth_headers)
    assert res_filtered.status_code == 200
    filtered_pos = res_filtered.json()
    for po in filtered_pos:
        assert po["status"] == "UPLOADED"


def test_get_purchase_order_by_id(auth_headers):
    """Test retrieving a single PO by ID with its line items."""
    unique_po = f"PO-GET-{int(time.time())}"
    create_res = client.post(
        "/api/v1/purchase-orders",
        json={
            "po_number": unique_po,
            "items": [{"part_name": "Cylinder Head", "quantity": 5.0}],
        },
        headers=auth_headers,
    )
    po_id = create_res.json()["id"]

    res = client.get(f"/api/v1/purchase-orders/{po_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == po_id
    assert data["po_number"] == unique_po
    assert len(data["items"]) == 1


def test_update_purchase_order_header(auth_headers):
    """Test updating PO header attributes."""
    unique_po = f"PO-UPD-{int(time.time())}"
    create_res = client.post(
        "/api/v1/purchase-orders",
        json={"po_number": unique_po, "status": "UPLOADED"},
        headers=auth_headers,
    )
    po_id = create_res.json()["id"]

    update_payload = {
        "status": "CONFIRMED",
        "customer_name": "Updated Customer Name",
    }
    update_res = client.put(f"/api/v1/purchase-orders/{po_id}", json=update_payload, headers=auth_headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["status"] == "CONFIRMED"
    assert updated_data["customer_name"] == "Updated Customer Name"


def test_update_purchase_order_item(auth_headers):
    """Test overriding properties on an individual PO line item."""
    create_res = client.post(
        "/api/v1/purchase-orders",
        json={
            "po_number": f"PO-ITEM-UPD-{int(time.time())}",
            "items": [
                {
                    "item_number": 1,
                    "part_name": "Rough Bushing",
                    "specification": "MS 2062",
                    "quantity": 10.0,
                    "gross_weight_kg": 5.0,
                    "machining_hours": 1.0,
                }
            ],
        },
        headers=auth_headers,
    )
    po_id = create_res.json()["id"]
    item_id = create_res.json()["items"][0]["id"]

    # Update item override
    item_update_payload = {
        "specification": "SS 304",
        "material_grade": "SS 304",
        "gross_weight_kg": 6.5,
        "machining_hours": 2.2,
    }
    res = client.put(
        f"/api/v1/purchase-orders/{po_id}/items/{item_id}",
        json=item_update_payload,
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == item_id
    assert data["specification"] == "SS 304"
    assert Decimal(str(data["gross_weight_kg"])) == Decimal("6.500")
    assert Decimal(str(data["machining_hours"])) == Decimal("2.20")


def test_upload_po_document_valid_and_cleanup(auth_headers):
    """Test uploading a valid PDF document and cleaning up local test artifacts."""
    from app.services.storage.storage_service import UPLOAD_DIR

    fake_pdf_bytes = b"%PDF-1.4 Mock purchase order document stream"
    file_payload = {
        "file": ("test_purchase_order.pdf", io.BytesIO(fake_pdf_bytes), "application/pdf")
    }

    res = client.post("/api/v1/purchase-orders/upload", files=file_payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["source_file_name"] == "test_purchase_order.pdf"
    assert data["content_type"] == "application/pdf"
    assert "/uploads/" in data["source_file_url"]

    # Clean up local uploaded file using StorageService.UPLOAD_DIR
    rel_after_uploads = data["source_file_url"].replace("/uploads/", "")
    full_path = os.path.join(UPLOAD_DIR, rel_after_uploads)
    if os.path.exists(full_path):
        os.remove(full_path)


def test_upload_po_document_invalid_type(auth_headers):
    """Test uploading an unsupported file type is rejected with HTTP 400."""
    fake_txt_bytes = b"This is plain text not allowed"
    file_payload = {
        "file": ("document.txt", io.BytesIO(fake_txt_bytes), "text/plain")
    }

    res = client.post("/api/v1/purchase-orders/upload", files=file_payload, headers=auth_headers)
    assert res.status_code == 400
    assert "Invalid file type" in res.json()["detail"]


def test_nonexistent_purchase_order_404(auth_headers):
    """Test accessing or updating a nonexistent PO ID returns 404."""
    nonexistent_id = "po-00000000-0000-0000-0000-000000000000"
    res_get = client.get(f"/api/v1/purchase-orders/{nonexistent_id}", headers=auth_headers)
    assert res_get.status_code == 404
    assert res_get.json()["detail"] == "Purchase order not found"

    res_put = client.put(
        f"/api/v1/purchase-orders/{nonexistent_id}",
        json={"status": "CANCELLED"},
        headers=auth_headers,
    )
    assert res_put.status_code == 404
    assert res_put.json()["detail"] == "Purchase order not found"

    res_item = client.put(
        f"/api/v1/purchase-orders/{nonexistent_id}/items/item-nonexistent",
        json={"part_name": "Ghost Part"},
        headers=auth_headers,
    )
    assert res_item.status_code == 404


def test_cross_company_purchase_order_access_rejected(auth_headers, auth_headers_company_b):
    """Test multi-tenancy isolation: Company B cannot read or modify Company A's PO."""
    # 1. Company A creates PO
    unique_po = f"PO-COMP-A-{int(time.time())}"
    res_a = client.post(
        "/api/v1/purchase-orders",
        json={"po_number": unique_po, "status": "UPLOADED"},
        headers=auth_headers,
    )
    assert res_a.status_code == 201
    po_a_id = res_a.json()["id"]

    # 2. Company B attempts to GET Company A's PO
    res_b_get = client.get(f"/api/v1/purchase-orders/{po_a_id}", headers=auth_headers_company_b)
    assert res_b_get.status_code == 404
    assert res_b_get.json()["detail"] == "Purchase order not found"

    # 3. Company B attempts to PUT Company A's PO
    res_b_put = client.put(
        f"/api/v1/purchase-orders/{po_a_id}",
        json={"status": "INTRUDER_MODIFIED"},
        headers=auth_headers_company_b,
    )
    assert res_b_put.status_code == 404

    # 4. Company B lists POs -> Company A's PO must not be present
    res_b_list = client.get("/api/v1/purchase-orders", headers=auth_headers_company_b)
    assert res_b_list.status_code == 200
    b_po_ids = [p["id"] for p in res_b_list.json()]
    assert po_a_id not in b_po_ids
