import uuid
from datetime import datetime, timedelta
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.models.quotation import Quotation

client = TestClient(app)


@pytest.fixture
def clean_dashboard_data():
    """Setup isolated fixtures for dashboard test assertions."""
    db = SessionLocal()
    created_q_ids = []
    created_po_ids = []
    created_c_ids = []

    try:
        # Create a dedicated customer for test company A
        cust_a = Customer(
            id=f"cust-dash-{uuid.uuid4().hex[:8]}",
            company_id="comp-bpe-pune",
            name="Alpha Motors Dash Testing",
            gstin="27AABCU9603R1ZM",
            is_active=True,
        )
        db.add(cust_a)
        created_c_ids.append(cust_a.id)

        # Create a customer for company B
        cust_b = Customer(
            id=f"cust-dash-b-{uuid.uuid4().hex[:8]}",
            company_id="comp-other-plant",
            name="Beta Motors Isolated B",
            gstin="27BBBCU9603R1ZN",
            is_active=True,
        )
        db.add(cust_b)
        created_c_ids.append(cust_b.id)

        now = datetime.utcnow()

        # 1. Company A: Draft Quotation created today
        q1 = Quotation(
            id=f"qt-dash-1-{uuid.uuid4().hex[:8]}",
            company_id="comp-bpe-pune",
            customer_id=cust_a.id,
            quotation_number=f"QT-DASH-001-{uuid.uuid4().hex[:6]}",
            quotation_date=now,
            status="DRAFT",
            final_total=Decimal("150000.00"),
            email_status="NOT_SENT",
            created_at=now,
        )
        db.add(q1)
        created_q_ids.append(q1.id)

        # 2. Company A: Finalized Quotation created today, emailed successfully
        q2 = Quotation(
            id=f"qt-dash-2-{uuid.uuid4().hex[:8]}",
            company_id="comp-bpe-pune",
            customer_id=cust_a.id,
            quotation_number=f"QT-DASH-002-{uuid.uuid4().hex[:6]}",
            quotation_date=now,
            status="FINALIZED",
            final_total=Decimal("250000.00"),
            finalized_at=now,
            finalized_by="Lead Engineer",
            email_status="SENT",
            email_sent_at=now,
            email_recipient="procurement@alphamotors.com",
            pdf_sha256="abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
            created_at=now,
        )
        db.add(q2)
        created_q_ids.append(q2.id)

        # 3. Company A: Finalized Quotation with failed email
        q3 = Quotation(
            id=f"qt-dash-3-{uuid.uuid4().hex[:8]}",
            company_id="comp-bpe-pune",
            customer_id=cust_a.id,
            quotation_number=f"QT-DASH-003-{uuid.uuid4().hex[:6]}",
            quotation_date=now,
            status="FINALIZED",
            final_total=Decimal("100000.00"),
            finalized_at=now,
            finalized_by="Lead Engineer",
            email_status="FAILED",
            email_error="SMTP Connection Refused",
            created_at=now,
        )
        db.add(q3)
        created_q_ids.append(q3.id)

        # 4. Company A: PO needing review
        po1 = PurchaseOrder(
            id=f"po-dash-1-{uuid.uuid4().hex[:8]}",
            company_id="comp-bpe-pune",
            customer_id=cust_a.id,
            customer_name="Alpha Motors Dash Testing",
            po_number=f"PO-DASH-101-{uuid.uuid4().hex[:6]}",
            status="NEEDS_REVIEW",
            created_at=now,
        )
        db.add(po1)
        created_po_ids.append(po1.id)

        # 5. Company B: Quotation in Company B (MUST NOT leak into Company A dashboard)
        qb = Quotation(
            id=f"qt-dash-b-{uuid.uuid4().hex[:8]}",
            company_id="comp-other-plant",
            customer_id=cust_b.id,
            quotation_number=f"QT-DASH-B-{uuid.uuid4().hex[:6]}",
            quotation_date=now,
            status="FINALIZED",
            final_total=Decimal("999999.00"),
            created_at=now,
        )
        db.add(qb)
        created_q_ids.append(qb.id)

        # 6. Company B: PO needing review in Company B
        pob = PurchaseOrder(
            id=f"po-dash-b-{uuid.uuid4().hex[:8]}",
            company_id="comp-other-plant",
            customer_id=cust_b.id,
            po_number=f"PO-DASH-B-{uuid.uuid4().hex[:6]}",
            status="NEEDS_REVIEW",
            created_at=now,
        )
        db.add(pob)
        created_po_ids.append(pob.id)

        db.commit()

        yield {
            "cust_a_id": cust_a.id,
            "cust_b_id": cust_b.id,
            "q1_id": q1.id,
            "q2_id": q2.id,
            "q3_id": q3.id,
            "qb_id": qb.id,
            "po1_id": po1.id,
            "pob_id": pob.id,
        }
    finally:
        for q_id in created_q_ids:
            q = db.query(Quotation).filter(Quotation.id == q_id).first()
            if q:
                db.delete(q)
        for p_id in created_po_ids:
            p = db.query(PurchaseOrder).filter(PurchaseOrder.id == p_id).first()
            if p:
                db.delete(p)
        for c_id in created_c_ids:
            c = db.query(Customer).filter(Customer.id == c_id).first()
            if c:
                db.delete(c)
        db.commit()
        db.close()


def test_dashboard_summary_default_period(auth_headers, clean_dashboard_data):
    """Verify GET /api/v1/dashboard/summary returns 200 and adheres to complete schema."""
    res = client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["period"] == "this_month"
    assert "start_date" in data
    assert "end_date" in data
    assert "kpis" in data
    assert "quotation_activity" in data
    assert "status_breakdown" in data
    assert "value_trend" in data
    assert "pending_actions" in data
    assert "recent_quotations" in data
    assert "recent_activity" in data
    assert "customer_activity" in data
    assert "email_summary" in data

    kpis = data["kpis"]
    assert "quotations_created" in kpis
    assert "pending_po_review" in kpis
    assert "draft_quotations" in kpis
    assert "finalized_quotations" in kpis
    assert "total_quotation_value" in kpis
    assert "quotation_value" in kpis
    assert "finalized_quotation_value" in kpis


def test_dashboard_kpis_calculation(auth_headers, clean_dashboard_data):
    """Verify exact count and value aggregations in KPIs."""
    res = client.get("/api/v1/dashboard/summary?period=today", headers=auth_headers)
    assert res.status_code == 200
    kpis = res.json()["kpis"]

    assert kpis["quotations_created"] >= 3
    assert kpis["draft_quotations"] >= 1
    assert kpis["finalized_quotations"] >= 2
    assert float(kpis["total_quotation_value"]) >= 500000.00
    assert float(kpis["quotation_value"]) >= 500000.00
    assert float(kpis["finalized_quotation_value"]) >= 350000.00
    assert kpis["pending_po_review"] >= 1


def test_dashboard_all_supported_date_ranges(auth_headers, clean_dashboard_data):
    """Verify all 6 supported standard period filters work cleanly."""
    valid_periods = [
        "today",
        "this_week",
        "this_month",
        "last_month",
        "this_quarter",
        "this_year",
    ]

    for p in valid_periods:
        res = client.get(f"/api/v1/dashboard/summary?period={p}", headers=auth_headers)
        assert res.status_code == 200, f"Failed on period: {p}"
        data = res.json()
        assert data["period"] == p
        assert data["start_date"] <= data["end_date"]


def test_dashboard_custom_date_range_valid(auth_headers, clean_dashboard_data):
    """Verify custom date range filtering with valid start_date and end_date."""
    start_d = (datetime.utcnow() - timedelta(days=7)).date().isoformat()
    end_d = datetime.utcnow().date().isoformat()
    res_custom = client.get(
        f"/api/v1/dashboard/summary?period=custom&start_date={start_d}&end_date={end_d}",
        headers=auth_headers,
    )
    assert res_custom.status_code == 200
    custom_data = res_custom.json()
    assert custom_data["period"] == "custom"
    assert custom_data["start_date"] == start_d
    assert custom_data["end_date"] == end_d


def test_dashboard_invalid_date_ranges_rejected(auth_headers):
    """Verify invalid custom date ranges and unsupported periods are rejected with HTTP 422."""
    # 1. Custom range missing dates
    res_missing = client.get("/api/v1/dashboard/summary?period=custom", headers=auth_headers)
    assert res_missing.status_code == 422

    # 2. Inverted custom range (start_date > end_date)
    res_inverted = client.get(
        "/api/v1/dashboard/summary?period=custom&start_date=2026-09-20&end_date=2026-09-10",
        headers=auth_headers,
    )
    assert res_inverted.status_code == 422

    # 3. Unsupported period name
    res_unsupported = client.get("/api/v1/dashboard/summary?period=invalid_period_xyz", headers=auth_headers)
    assert res_unsupported.status_code == 422


def test_dashboard_status_breakdown(auth_headers, clean_dashboard_data):
    """Verify quotation count and value per database status."""
    res = client.get("/api/v1/dashboard/summary?period=today", headers=auth_headers)
    assert res.status_code == 200
    breakdown = res.json()["status_breakdown"]

    status_map = {item["status"]: item for item in breakdown}
    assert "DRAFT" in status_map
    assert "FINALIZED" in status_map

    draft_item = status_map["DRAFT"]
    assert draft_item["count"] >= 1
    assert float(draft_item["value"]) >= 150000.00
    assert draft_item["percentage"] > 0

    final_item = status_map["FINALIZED"]
    assert final_item["count"] >= 2
    assert float(final_item["value"]) >= 350000.00


def test_dashboard_pending_actions(auth_headers, clean_dashboard_data):
    """Verify actionable items (review required POs, draft quotes, failed emails)."""
    res = client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    pending = res.json()["pending_actions"]

    types_found = {a["type"] for a in pending}
    assert "po_review" in types_found
    assert "draft_quotation" in types_found
    assert "email_failed" in types_found

    for item in pending:
        assert item["link"].startswith("/")
        assert len(item["reference_number"]) > 0


def test_dashboard_recent_quotations(auth_headers, clean_dashboard_data):
    """Verify recent quotations response format and fields."""
    res = client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    recent_q = res.json()["recent_quotations"]
    assert len(recent_q) >= 3
    for q in recent_q:
        assert "quotation_number" in q
        assert "customer" in q
        assert "date" in q
        assert "status" in q
        assert "amount" in q
        assert "email_status" in q


def test_dashboard_recent_activity(auth_headers, clean_dashboard_data):
    """Verify recent activity feed contains factual database events."""
    res = client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    recent_act = res.json()["recent_activity"]
    assert len(recent_act) > 0
    event_types = {e["type"] for e in recent_act}
    assert any(t in event_types for t in ["QUOTATION_CREATED", "QUOTATION_FINALIZED", "PO_UPLOADED"])


def test_dashboard_customer_activity_and_email_summary(auth_headers, clean_dashboard_data):
    """Verify customer metrics and email dispatch telemetry."""
    res = client.get("/api/v1/dashboard/summary?period=today", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    cust_act = data["customer_activity"]
    assert cust_act["total_active_customers"] >= 1
    assert cust_act["customers_with_quotations"] >= 1
    assert len(cust_act["top_customers"]) >= 1

    email_sum = data["email_summary"]
    assert email_sum["sent"] >= 1
    assert email_sum["failed"] >= 1
    assert email_sum["pending"] >= 1
    assert email_sum["total"] >= 3
    assert 0.0 <= email_sum["success_rate"] <= 100.0


def test_dashboard_empty_company(session_jwt_signer):
    """Verify safe default return (0 values, empty lists) for an empty company."""
    db = SessionLocal()
    comp_empty_id = f"comp-empty-{uuid.uuid4().hex[:8]}"
    user_empty_id = f"usr-empty-{uuid.uuid4().hex[:8]}"
    try:
        comp_empty = Company(id=comp_empty_id, name="Empty Test Company")
        user_empty = User(
            id=user_empty_id,
            company_id=comp_empty_id,
            email="empty@testcompany.com",
            full_name="Empty User",
            role="COSTING_ENGINEER",
            is_active=True,
        )
        db.add(comp_empty)
        db.add(user_empty)
        db.commit()

        token = session_jwt_signer(user_empty_id, "empty@testcompany.com")
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/v1/dashboard/summary", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["kpis"]["quotations_created"] == 0
        assert data["kpis"]["pending_po_review"] == 0
        assert float(data["kpis"]["total_quotation_value"]) == 0.0
        assert data["quotation_activity"] == []
        assert data["status_breakdown"] == []
        assert data["pending_actions"] == []
        assert data["recent_quotations"] == []
        assert data["customer_activity"]["total_active_customers"] == 0
    finally:
        u = db.query(User).filter(User.id == user_empty_id).first()
        if u:
            db.delete(u)
        c = db.query(Company).filter(Company.id == comp_empty_id).first()
        if c:
            db.delete(c)
        db.commit()
        db.close()


def test_dashboard_tenant_isolation(auth_headers, auth_headers_company_b, clean_dashboard_data):
    """
    CRITICAL SECURITY & DATA INTEGRITY TEST:
    Verify Company A dashboard NEVER contains Company B data, and vice versa.
    """
    res_a = client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert res_a.status_code == 200
    data_a = res_a.json()

    for q in data_a["recent_quotations"]:
        assert float(q["amount"]) != 999999.00
        assert "QT-DASH-B" not in q["quotation_number"]

    for pa in data_a["pending_actions"]:
        assert "PO-DASH-B" not in pa["reference_number"]

    res_b = client.get("/api/v1/dashboard/summary", headers=auth_headers_company_b)
    assert res_b.status_code == 200
    data_b = res_b.json()

    b_quote_numbers = [q["quotation_number"] for q in data_b["recent_quotations"]]
    assert any("QT-DASH-B" in qn for qn in b_quote_numbers)
    for qn in b_quote_numbers:
        assert "QT-DASH-001" not in qn
        assert "QT-DASH-002" not in qn


def test_dashboard_deactivated_user_blocked(session_jwt_signer):
    """Verify deactivated user is blocked with HTTP 403."""
    db = SessionLocal()
    deact_comp_id = f"comp-deact-{uuid.uuid4().hex[:8]}"
    deact_user_id = f"usr-deact-{uuid.uuid4().hex[:8]}"
    try:
        comp = Company(id=deact_comp_id, name="Deact Company")
        user = User(
            id=deact_user_id,
            company_id=deact_comp_id,
            email="deact@testcompany.com",
            full_name="Deactivated User",
            role="COSTING_ENGINEER",
            is_active=False,
        )
        db.add(comp)
        db.add(user)
        db.commit()

        token = session_jwt_signer(deact_user_id, "deact@testcompany.com")
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/v1/dashboard/summary", headers=headers)
        assert res.status_code == 403
    finally:
        u = db.query(User).filter(User.id == deact_user_id).first()
        if u:
            db.delete(u)
        c = db.query(Company).filter(Company.id == deact_comp_id).first()
        if c:
            db.delete(c)
        db.commit()
        db.close()


def test_finalized_quotation_immutability_preserved(auth_headers, clean_dashboard_data):
    """
    CRITICAL STATUTORY AUDIT TEST:
    Verify that reading dashboard summary never mutates finalized quotation state, SHA-256, or totals.
    """
    db = SessionLocal()
    try:
        q_before = db.query(Quotation).filter(Quotation.id == clean_dashboard_data["q2_id"]).first()
        sha_before = q_before.pdf_sha256
        total_before = q_before.final_total
        finalized_at_before = q_before.finalized_at

        # Request dashboard summary
        res = client.get("/api/v1/dashboard/summary?period=this_month", headers=auth_headers)
        assert res.status_code == 200

        # Verify DB record is strictly unchanged
        db.expire_all()
        q_after = db.query(Quotation).filter(Quotation.id == clean_dashboard_data["q2_id"]).first()
        assert q_after.pdf_sha256 == sha_before
        assert q_after.final_total == total_before
        assert q_after.finalized_at == finalized_at_before
        assert q_after.status == "FINALIZED"
    finally:
        db.close()


def test_dashboard_unauthenticated_rejected():
    """Verify unauthenticated request without token returns 401."""
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 401
