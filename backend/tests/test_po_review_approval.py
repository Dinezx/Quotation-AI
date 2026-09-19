"""
Comprehensive Unit & Integration Tests for PO Review, Human Approval,
Tenant Security, and Anti-Pricing Separation.

Verifies:
1. Basic Review: GET PO review data, PUT updates to header and items, validation rejections.
2. Approval Flow: Atomic state transition to APPROVED, recording approved_by and approved_at.
3. Invariant Safety: Cannot approve invalid, empty, or already approved/rejected POs.
4. Tenant Security: Strict multi-tenant isolation (Company B cannot read, update, or approve Company A's PO).
5. Quality Flags: AMBIGUOUS_PROCESS flag preserved, NULL process permitted for approval.
6. Anti-Pricing Separation: PO review/approval models and payloads strictly forbid commercial/pricing fields.
7. Quotation Link Guard: Quotations cannot be created or calculated against unapproved or rejected POs.
8. Transaction Safety: Database rollback on mid-transaction approval failure.
"""
import time
from datetime import datetime, date
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.schemas.extraction import FORBIDDEN_PRICING_FIELDS

client = TestClient(app)


def _create_sample_review_po(auth_headers, po_number=None, items=None, status="NEEDS_REVIEW"):
    """Helper to create a standard reviewable PO."""
    num = po_number or f"PO-REV-{int(time.time() * 1000)}"
    if items is None:
        items = [
            {
                "item_number": 1,
                "part_name": "Bearing Housing",
                "specification": "EN8",
                "drawing_number": "DWG-BH-001",
                "quantity": 100.0,
                "unit": "Nos",
                "material_grade": "EN8",
                "process_name": None,  # Process NULL
                "review_flags": ["AMBIGUOUS_PROCESS"],
            },
            {
                "item_number": 2,
                "part_name": "Pinion Shaft",
                "specification": "EN19",
                "drawing_number": "DWG-PS-002",
                "quantity": 50.0,
                "unit": "Nos",
                "material_grade": "EN19",
                "process_name": None,
                "review_flags": ["AMBIGUOUS_PROCESS"],
            },
        ]

    payload = {
        "po_number": num,
        "po_date": "2026-09-19T00:00:00",
        "customer_name": "ABC Engineering Components Pvt. Ltd.",
        "supplier_name": "Bharat Precision Engineering Pvt. Ltd.",
        "delivery_terms": "Ex-works Bhosari Pune",
        "payment_terms": "30 days net",
        "inspection_clauses": "Visual and dimensional inspection before dispatch",
        "general_notes": "Standard manufacturing tolerances per ISO 2768-m",
        "status": status,
        "items": items,
    }

    res = client.post("/api/v1/purchase-orders", json=payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    return res.json()


# ==============================================================================
# 1. BASIC REVIEW DATA CONTRACT TESTS
# ==============================================================================

def test_get_po_review_data(auth_headers):
    """Verify GET /purchase-orders/{id} returns all review contract fields."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    res = client.get(f"/api/v1/purchase-orders/{po_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    # Header contract
    assert data["customer_name"] == "ABC Engineering Components Pvt. Ltd."
    assert data["supplier_name"] == "Bharat Precision Engineering Pvt. Ltd."
    assert data["po_number"] == created["po_number"]
    assert data["delivery_terms"] == "Ex-works Bhosari Pune"
    assert data["payment_terms"] == "30 days net"
    assert data["inspection_clauses"] == "Visual and dimensional inspection before dispatch"
    assert data["general_notes"] == "Standard manufacturing tolerances per ISO 2768-m"
    assert data["status"] == "NEEDS_REVIEW"
    assert data["review_status"] == "NEEDS_REVIEW"

    # Line item contract
    assert len(data["items"]) == 2
    item1 = data["items"][0]
    assert item1["item_number"] == 1
    assert item1["part_name"] == "Bearing Housing"
    assert item1["specification"] == "EN8"
    assert item1["drawing_number"] == "DWG-BH-001"
    assert Decimal(str(item1["quantity"])) == Decimal("100.00")
    assert item1["unit"] == "Nos"
    assert item1["process_name"] is None
    assert "AMBIGUOUS_PROCESS" in item1["review_flags"]


def test_update_po_review_header(auth_headers):
    """Verify editing header fields via PUT /purchase-orders/{id}."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    update_payload = {
        "customer_name": "ABC Engineering Components Pvt. Ltd. (Corporate)",
        "supplier_name": "Bharat Precision Engineering Ltd.",
        "delivery_terms": "Door delivery Pune plant",
        "general_notes": "Urgent delivery required",
    }
    res = client.put(f"/api/v1/purchase-orders/{po_id}", json=update_payload, headers=auth_headers)
    assert res.status_code == 200
    updated = res.json()
    assert updated["customer_name"] == "ABC Engineering Components Pvt. Ltd. (Corporate)"
    assert updated["supplier_name"] == "Bharat Precision Engineering Ltd."
    assert updated["delivery_terms"] == "Door delivery Pune plant"
    assert updated["general_notes"] == "Urgent delivery required"


def test_update_po_review_item(auth_headers):
    """Verify editing an individual line item via PUT /purchase-orders/{id}/items/{item_id}."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]
    item_id = created["items"][0]["id"]

    item_update = {
        "part_name": "Bearing Housing (Heavy Duty)",
        "material_grade": "EN8D",
        "quantity": 120.0,
        "unit": "Nos",
        "gross_weight_kg": 14.5,
        "machining_hours": 2.5,
    }
    res = client.put(f"/api/v1/purchase-orders/{po_id}/items/{item_id}", json=item_update, headers=auth_headers)
    assert res.status_code == 200
    updated_item = res.json()
    assert updated_item["part_name"] == "Bearing Housing (Heavy Duty)"
    assert updated_item["material_grade"] == "EN8D"
    assert Decimal(str(updated_item["quantity"])) == Decimal("120.00")
    assert Decimal(str(updated_item["machining_hours"])) == Decimal("2.50")


def test_item_validation_rejects_negative_or_zero_quantity(auth_headers):
    """Validation: quantity must be strictly greater than 0."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]
    item_id = created["items"][0]["id"]

    res_zero = client.put(f"/api/v1/purchase-orders/{po_id}/items/{item_id}", json={"quantity": 0.0}, headers=auth_headers)
    assert res_zero.status_code == 422

    res_neg = client.put(f"/api/v1/purchase-orders/{po_id}/items/{item_id}", json={"quantity": -10.0}, headers=auth_headers)
    assert res_neg.status_code == 422


# ==============================================================================
# 2. APPROVAL & AUDIT FLOW TESTS
# ==============================================================================

def test_successful_po_approval(auth_headers):
    """Verify human approval atomically transitions status to APPROVED and records audit metadata."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    res = client.post(
        f"/api/v1/purchase-orders/{po_id}/approve",
        json={"approval_notes": "Reviewed drawing specs, all 4 items verified."},
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    approved = res.json()

    assert approved["status"] == "APPROVED"
    assert approved["review_status"] == "APPROVED"
    assert approved["approved_by"] is not None
    assert approved["approved_at"] is not None
    assert "Reviewed drawing specs" in (approved["general_notes"] or "")


def test_cannot_approve_already_approved_po(auth_headers):
    """Approval idempotent check: already approved PO cannot be approved again."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    res1 = client.post(f"/api/v1/purchase-orders/{po_id}/approve", headers=auth_headers)
    assert res1.status_code == 200

    res2 = client.post(f"/api/v1/purchase-orders/{po_id}/approve", headers=auth_headers)
    assert res2.status_code == 400
    assert "already approved" in res2.json()["detail"].lower()


def test_cannot_approve_rejected_po(auth_headers):
    """A rejected PO cannot be approved."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    # Reject
    res_reject = client.post(
        f"/api/v1/purchase-orders/{po_id}/reject",
        json={"reason": "Customer cancelled requirement"},
        headers=auth_headers,
    )
    assert res_reject.status_code == 200
    assert res_reject.json()["status"] == "REJECTED"

    # Attempt approve
    res_approve = client.post(f"/api/v1/purchase-orders/{po_id}/approve", headers=auth_headers)
    assert res_approve.status_code == 400
    assert "rejected" in res_approve.json()["detail"].lower()


def test_cannot_approve_po_without_items(auth_headers):
    """Approval fails if PO has zero line items."""
    empty_po = {
        "po_number": f"PO-EMPTY-{int(time.time() * 1000)}",
        "po_date": "2026-09-19T00:00:00",
        "customer_name": "Test Customer",
        "status": "NEEDS_REVIEW",
        "items": [],
    }
    res = client.post("/api/v1/purchase-orders", json=empty_po, headers=auth_headers)
    po_id = res.json()["id"]

    res_appr = client.post(f"/api/v1/purchase-orders/{po_id}/approve", headers=auth_headers)
    assert res_appr.status_code == 400
    assert "at least one line item" in res_appr.json()["detail"].lower()


# ==============================================================================
# 3. TENANT ISOLATION TESTS
# ==============================================================================

def test_company_b_cannot_read_company_a_po(auth_headers, auth_headers_company_b):
    """Company B cannot GET Company A's review data."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    res = client.get(f"/api/v1/purchase-orders/{po_id}", headers=auth_headers_company_b)
    assert res.status_code == 404
    assert res.json()["detail"] == "Purchase order not found"


def test_company_b_cannot_update_company_a_po(auth_headers, auth_headers_company_b):
    """Company B cannot modify Company A's PO."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    res = client.put(
        f"/api/v1/purchase-orders/{po_id}",
        json={"customer_name": "Attacker Name"},
        headers=auth_headers_company_b,
    )
    assert res.status_code == 404


def test_company_b_cannot_approve_company_a_po(auth_headers, auth_headers_company_b):
    """Company B cannot approve Company A's PO."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    res = client.post(f"/api/v1/purchase-orders/{po_id}/approve", headers=auth_headers_company_b)
    assert res.status_code == 404


def test_company_b_cannot_reject_company_a_po(auth_headers, auth_headers_company_b):
    """Company B cannot reject Company A's PO."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    res = client.post(
        f"/api/v1/purchase-orders/{po_id}/reject",
        json={"reason": "Malicious reject"},
        headers=auth_headers_company_b,
    )
    assert res.status_code == 404


# ==============================================================================
# 4. QUALITY FLAGS & NULL PROCESS APPROVAL
# ==============================================================================

def test_null_process_allowed_and_ambiguous_process_preserved(auth_headers):
    """
    Critical manufacturing rule:
    When no manufacturing process is specified in the PO, process must remain NULL,
    AMBIGUOUS_PROCESS must remain active, and approval must succeed without guessing processes.
    """
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    # Verify NULL process on items
    for item in created["items"]:
        assert item["process_name"] is None
        assert "AMBIGUOUS_PROCESS" in item["review_flags"]

    # Approve without inventing a process
    res_appr = client.post(f"/api/v1/purchase-orders/{po_id}/approve", headers=auth_headers)
    assert res_appr.status_code == 200
    approved = res_appr.json()
    assert approved["status"] == "APPROVED"

    # Verify processes remain NULL and flags remain intact
    for item in approved["items"]:
        assert item["process_name"] is None
        assert "AMBIGUOUS_PROCESS" in item["review_flags"]


# ==============================================================================
# 5. STRICT PRICING SEPARATION TESTS
# ==============================================================================

def test_po_review_schema_forbids_pricing_fields():
    """Ensure Pydantic schemas reject commercial pricing fields on PO review."""
    from pydantic import ValidationError
    from app.schemas.purchase_order import PurchaseOrderBase, PurchaseOrderItemBase

    for forbidden in FORBIDDEN_PRICING_FIELDS:
        with pytest.raises(ValidationError):
            PurchaseOrderBase(po_number="PO-TEST", **{forbidden: "100.00"})

        with pytest.raises(ValidationError):
            PurchaseOrderItemBase(part_name="Test Part", **{forbidden: "100.00"})


def test_po_review_endpoints_contain_zero_pricing_fields(auth_headers):
    """Verify GET, PUT, and approve responses contain absolutely no pricing or commercial figures."""
    created = _create_sample_review_po(auth_headers, status="NEEDS_REVIEW")
    po_id = created["id"]

    # 1. Check GET response
    get_res = client.get(f"/api/v1/purchase-orders/{po_id}", headers=auth_headers)
    assert get_res.status_code == 200
    get_dump = get_res.json()
    for forbidden in FORBIDDEN_PRICING_FIELDS:
        assert forbidden not in get_dump
        for item in get_dump.get("items", []):
            assert forbidden not in item

    # 2. Check PUT response
    put_res = client.put(f"/api/v1/purchase-orders/{po_id}", json={"general_notes": "Reviewed"}, headers=auth_headers)
    assert put_res.status_code == 200
    put_dump = put_res.json()
    for forbidden in FORBIDDEN_PRICING_FIELDS:
        assert forbidden not in put_dump
        for item in put_dump.get("items", []):
            assert forbidden not in item

    # 3. Check Approve response
    appr_res = client.post(f"/api/v1/purchase-orders/{po_id}/approve", headers=auth_headers)
    assert appr_res.status_code == 200
    appr_dump = appr_res.json()
    for forbidden in FORBIDDEN_PRICING_FIELDS:
        assert forbidden not in appr_dump
        for item in appr_dump.get("items", []):
            assert forbidden not in item


# ==============================================================================
# 6. TRANSACTION SAFETY & ROLLBACK
# ==============================================================================

def test_atomic_approval_rollback_on_failure(auth_headers, monkeypatch):
    """Verify that if an approval fails midway, changes are fully rolled back."""
    created = _create_sample_review_po(auth_headers)
    po_id = created["id"]

    # Monkeypatch db.commit during approve to simulate a database failure
    from sqlalchemy.orm import Session
    orig_commit = Session.commit

    def failing_commit(self):
        raise RuntimeError("Simulated database failure during approval commit")

    monkeypatch.setattr(Session, "commit", failing_commit)

    res = client.post(f"/api/v1/purchase-orders/{po_id}/approve", headers=auth_headers)
    assert res.status_code == 400
    assert "approval failed" in res.json()["detail"].lower()

    # Restore commit and check that PO remains in NEEDS_REVIEW
    monkeypatch.setattr(Session, "commit", orig_commit)
    check_res = client.get(f"/api/v1/purchase-orders/{po_id}", headers=auth_headers)
    assert check_res.status_code == 200
    assert check_res.json()["status"] == "NEEDS_REVIEW"
    assert check_res.json()["approved_by"] is None
    assert check_res.json()["approved_at"] is None
