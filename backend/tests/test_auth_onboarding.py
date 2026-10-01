import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.material import Material
from app.models.process import Process

client = TestClient(app)


def test_onboarding_unauthenticated_rejected_401():
    """Verify that calling POST /api/v1/auth/onboarding without a Bearer token returns 401 Unauthorized."""
    res = client.post("/api/v1/auth/onboarding", json={"company_name": "Test Shop"})
    assert res.status_code == 401
    assert "missing authorization header" in res.json()["detail"].lower()


def test_onboarding_missing_company_name_rejected_400(session_jwt_signer):
    """Verify that company_name is mandatory for tenant onboarding."""
    sub = f"usr-oauth-test-{int(time.time() * 1000)}"
    email = f"lead.{int(time.time())}@precisionmfg.in"
    token = session_jwt_signer(sub, email)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/v1/auth/onboarding",
        json={"company_name": "   ", "legal_name": "Empty Name Corp"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "company name is required" in res.json()["detail"].lower()


def test_onboarding_invalid_gstin_rejected_422(session_jwt_signer):
    """Verify GSTIN validation (expects 15 alphanumeric characters)."""
    sub = f"usr-oauth-test-{int(time.time() * 1000)}"
    email = f"lead.{int(time.time())}@precisionmfg.in"
    token = session_jwt_signer(sub, email)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/v1/auth/onboarding",
        json={
            "company_name": "Apex Machining Pvt Ltd",
            "gstin": "INVALID-SHORT",
        },
        headers=headers,
    )
    assert res.status_code == 422
    assert "invalid gstin format" in res.json()["detail"].lower()


def test_onboarding_creates_tenant_user_and_seeds_rate_cards(session_jwt_signer):
    """
    Test complete onboarding flow:
    1. Authenticated Google/Supabase user has NO company.
    2. Calling /api/v1/auth/me returns 403 (no associated tenant company).
    3. User submits /api/v1/auth/onboarding with company legal name, GSTIN, address, and phone.
    4. Backend assigns an isolated company_id, creates Company and User, seeds standard rate cards.
    5. Subsequent /api/v1/auth/me calls succeed with 200 and return the company profile.
    """
    t = int(time.time() * 1000)
    sub = f"usr-google-{t}"
    email = f"engineer.{t}@pune-precision.co.in"
    token = session_jwt_signer(sub, email)
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Pre-onboarding /auth/me returns 403
    me_pre = client.get("/api/v1/auth/me", headers=headers)
    assert me_pre.status_code == 403
    assert "no associated tenant company" in me_pre.json()["detail"].lower()

    # Step 2: Perform Onboarding
    onboard_payload = {
        "company_name": "Pune Precision Machining Works",
        "legal_name": "Pune Precision Machining Works LLP",
        "gstin": "27AAACP9876R1Z5",
        "address": "Plot C-14, MIDC Chakan Phase 2, Pune, MH 410501",
        "phone": "+91 20 2714 5500",
        "contact_email": f"rfq.{t}@pune-precision.co.in",
        "full_name": "Anil Deshpande",
        # Attempt to spoof company_id (MUST BE IGNORED)
        "company_id": "comp-hacked-root",
    }

    res = client.post("/api/v1/auth/onboarding", json=onboard_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["status"] == "success"
    assert data["user"]["id"] == sub
    assert data["user"]["email"] == email
    assert data["user"]["full_name"] == "Anil Deshpande"
    assert data["user"]["role"] == "ADMIN"

    assigned_company_id = data["company"]["id"]
    # Guaranteed server-side ID generation:
    assert assigned_company_id != "comp-hacked-root"
    assert assigned_company_id.startswith("comp-")
    assert data["company"]["name"] == "Pune Precision Machining Works"
    assert data["company"]["legal_name"] == "Pune Precision Machining Works LLP"
    assert data["company"]["gstin"] == "27AAACP9876R1Z5"
    assert data["company"]["address"] == "Plot C-14, MIDC Chakan Phase 2, Pune, MH 410501"

    # Step 3: Verify new company starts with zero rate cards (empty rate master)
    db = SessionLocal()
    try:
        materials = db.query(Material).filter(Material.company_id == assigned_company_id).all()
        processes = db.query(Process).filter(Process.company_id == assigned_company_id).all()
        assert len(materials) == 0, f"Expected 0 materials for newly onboarded company, found {len(materials)}"
        assert len(processes) == 0, f"Expected 0 processes for newly onboarded company, found {len(processes)}"
    finally:
        db.close()

    # Step 4: Subsequent /auth/me returns 200 with newly created company profile
    me_post = client.get("/api/v1/auth/me", headers=headers)
    assert me_post.status_code == 200
    me_data = me_post.json()
    assert me_data["user"]["company_id"] == assigned_company_id
    assert me_data["company"]["id"] == assigned_company_id
    assert me_data["company"]["name"] == "Pune Precision Machining Works"
