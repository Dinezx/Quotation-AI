import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.notification import Notification
from app.services.notification.notification_service import NotificationService
from app.schemas.notification import NotificationType

client = TestClient(app)


def test_notification_creation_and_list(auth_headers):
    """Test creating an authoritative notification and listing it."""
    db = SessionLocal()
    try:
        notif = NotificationService.create_notification(
            db=db,
            company_id="comp-bpe-pune",
            type=NotificationType.PO_UPLOADED.value,
            title="Purchase Order Uploaded",
            message="PO-2026-TEST was successfully uploaded.",
            entity_type="PURCHASE_ORDER",
            entity_id=f"po-test-{int(time.time())}",
            severity="INFO",
        )
        notif_id = notif.id
    finally:
        db.close()

    res = client.get("/api/v1/notifications", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "items" in data
    assert "unread_count" in data
    assert data["total"] >= 1

    item_ids = [n["id"] for n in data["items"]]
    assert notif_id in item_ids

    matching = next(n for n in data["items"] if n["id"] == notif_id)
    assert matching["company_id"] == "comp-bpe-pune"
    assert matching["type"] == NotificationType.PO_UPLOADED.value
    assert matching["title"] == "Purchase Order Uploaded"
    assert matching["message"] == "PO-2026-TEST was successfully uploaded."
    assert matching["entity_type"] == "PURCHASE_ORDER"
    assert matching["severity"] == "INFO"
    assert matching["is_read"] is False
    assert matching["read_at"] is None


def test_unread_count(auth_headers):
    """Test getting unread notification count."""
    res = client.get("/api/v1/notifications/unread-count", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "unread_count" in data
    assert isinstance(data["unread_count"], int)
    assert data["unread_count"] >= 0


def test_mark_single_notification_read(auth_headers):
    """Test marking an individual notification as read."""
    db = SessionLocal()
    try:
        notif = NotificationService.create_notification(
            db=db,
            company_id="comp-bpe-pune",
            type=NotificationType.PO_NEEDS_REVIEW.value,
            title="PO Requires Review",
            message="PO-1024 has critical review flags.",
            entity_type="PURCHASE_ORDER",
            entity_id=f"po-review-{int(time.time())}",
            severity="WARNING",
        )
        notif_id = notif.id
    finally:
        db.close()

    # Mark as read
    res_read = client.post(f"/api/v1/notifications/{notif_id}/read", headers=auth_headers)
    assert res_read.status_code == 200, res_read.text
    read_data = res_read.json()
    assert read_data["success"] is True
    assert read_data["notification"]["id"] == notif_id
    assert read_data["notification"]["is_read"] is True
    assert read_data["notification"]["read_at"] is not None

    # Verify via get
    res_list = client.get("/api/v1/notifications", headers=auth_headers)
    data = res_list.json()
    updated = next(n for n in data["items"] if n["id"] == notif_id)
    assert updated["is_read"] is True
    assert updated["read_at"] is not None


def test_mark_all_as_read(auth_headers):
    """Test marking all notifications for the tenant as read."""
    db = SessionLocal()
    try:
        # Create at least 2 unread notifications
        for i in range(2):
            NotificationService.create_notification(
                db=db,
                company_id="comp-bpe-pune",
                type=NotificationType.CALCULATION_BLOCKED.value,
                title="Calculation Blocked",
                message=f"Rate issue #{i}",
                entity_type="RATE",
                entity_id=f"rate-issue-{i}-{int(time.time())}",
                severity="WARNING",
            )
    finally:
        db.close()

    res = client.post("/api/v1/notifications/read-all", headers=auth_headers)
    assert res.status_code == 200, res.text
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["marked_count"] >= 2

    # Check unread count is now 0
    count_res = client.get("/api/v1/notifications/unread-count", headers=auth_headers)
    assert count_res.json()["unread_count"] == 0


def test_pagination(auth_headers):
    """Test server-side pagination for notifications."""
    db = SessionLocal()
    try:
        for i in range(7):
            NotificationService.create_notification(
                db=db,
                company_id="comp-bpe-pune",
                type=NotificationType.QUOTATION_DRAFT_CREATED.value,
                title=f"Quotation Draft {i}",
                message=f"Draft message {i}",
                entity_type="QUOTATION",
                entity_id=f"qt-page-{i}-{int(time.time())}",
                severity="INFO",
            )
    finally:
        db.close()

    res_p1 = client.get("/api/v1/notifications?page=1&page_size=3", headers=auth_headers)
    assert res_p1.status_code == 200
    p1_data = res_p1.json()
    assert p1_data["page"] == 1
    assert p1_data["page_size"] == 3
    assert len(p1_data["items"]) == 3
    assert p1_data["total"] >= 7

    res_p2 = client.get("/api/v1/notifications?page=2&page_size=3", headers=auth_headers)
    assert res_p2.status_code == 200
    p2_data = res_p2.json()
    assert p2_data["page"] == 2
    assert len(p2_data["items"]) == 3

    # Ensure page 1 and page 2 items are disjoint
    p1_ids = {n["id"] for n in p1_data["items"]}
    p2_ids = {n["id"] for n in p2_data["items"]}
    assert p1_ids.isdisjoint(p2_ids)


def test_tenant_isolation(auth_headers, auth_headers_company_b):
    """Test strict tenant isolation: Company B cannot see or manipulate Company A's notifications."""
    db = SessionLocal()
    try:
        # Create notification for Company A
        notif_a = NotificationService.create_notification(
            db=db,
            company_id="comp-bpe-pune",
            type=NotificationType.QUOTATION_FINALIZED.value,
            title="Quotation Finalized A",
            message="Secret quotation for Company A",
            entity_type="QUOTATION",
            entity_id=f"qt-secret-a-{int(time.time())}",
            severity="SUCCESS",
        )
        notif_a_id = notif_a.id

        # Create notification for Company B
        notif_b = NotificationService.create_notification(
            db=db,
            company_id="comp-other-plant",
            type=NotificationType.PO_APPROVED.value,
            title="PO Approved B",
            message="PO for Company B",
            entity_type="PURCHASE_ORDER",
            entity_id=f"po-b-{int(time.time())}",
            severity="SUCCESS",
        )
        notif_b_id = notif_b.id
    finally:
        db.close()

    # Company B listing notifications
    res_b = client.get("/api/v1/notifications", headers=auth_headers_company_b)
    assert res_b.status_code == 200
    b_items = res_b.json()["items"]
    b_ids = [n["id"] for n in b_items]

    assert notif_b_id in b_ids
    assert notif_a_id not in b_ids

    # Company B attempting to mark Company A's notification as read should return 404
    res_cross_read = client.post(f"/api/v1/notifications/{notif_a_id}/read", headers=auth_headers_company_b)
    assert res_cross_read.status_code == 404


def test_duplicate_prevention():
    """Test deduplication window prevents spamming notifications for repeated events."""
    db = SessionLocal()
    try:
        entity_id = f"po-dedup-{int(time.time())}"
        n1 = NotificationService.create_notification(
            db=db,
            company_id="comp-bpe-pune",
            type=NotificationType.CALCULATION_BLOCKED.value,
            title="Calculation Blocked 1",
            message="First blocked attempt",
            entity_type="RATE",
            entity_id=entity_id,
            severity="WARNING",
            deduplicate_window_seconds=60,
        )

        n2 = NotificationService.create_notification(
            db=db,
            company_id="comp-bpe-pune",
            type=NotificationType.CALCULATION_BLOCKED.value,
            title="Calculation Blocked 2",
            message="Second blocked attempt within window",
            entity_type="RATE",
            entity_id=entity_id,
            severity="WARNING",
            deduplicate_window_seconds=60,
        )

        # Same record updated, not a new row
        assert n1.id == n2.id
        assert n2.title == "Calculation Blocked 2"
        assert n2.message == "Second blocked attempt within window"

        # Count in database
        count = (
            db.query(Notification)
            .filter(
                Notification.company_id == "comp-bpe-pune",
                Notification.entity_id == entity_id,
            )
            .count()
        )
        assert count == 1
    finally:
        db.close()
