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
