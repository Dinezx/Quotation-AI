import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.material import Material
from app.models.process import Process

client = TestClient(app)

def test_signup_new_company_and_user_success():
    """Verify new user and manufacturing company sign up successfully."""
    db = SessionLocal()
    email = "vikas.patil@precisionforge.co.in"
    try:
        # Cleanup pre-existing test user
        db.query(User).filter(User.email == email).delete()
        db.commit()
    finally:
        db.close()

    payload = {
        "email": email,
        "full_name": "Vikas Patil",
        "company_name": "Precision Forge & Machine Works",
        "phone": "+91 98230 44123"
    }

    res = client.post("/api/v1/auth/signup", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "success"
    assert data["user"]["email"] == email
    assert data["user"]["full_name"] == "Vikas Patil"
    assert data["user"]["role"] == "ADMIN"
    assert data["company"]["name"] == "Precision Forge & Machine Works"
    
    comp_id = data["company"]["id"]
    
    # Verify new company starts with zero customer rate records (empty rate master)
    db = SessionLocal()
    try:
        mats = db.query(Material).filter(Material.company_id == comp_id).all()
        assert len(mats) == 0, f"Expected 0 materials for new company, found {len(mats)}"

        procs = db.query(Process).filter(Process.company_id == comp_id).all()
        assert len(procs) == 0, f"Expected 0 processes for new company, found {len(procs)}"
    finally:
        db.close()


def test_signup_duplicate_email_rejected_409():
    """Verify duplicate email signup is rejected with 409 Conflict."""
    payload = {
        "email": "r.deshmukh@bharatprecision.co.in", # Pre-seeded default user
        "full_name": "Duplicate Tester",
        "company_name": "Another Plant",
    }
    res = client.post("/api/v1/auth/signup", json=payload)
    assert res.status_code == 409
    assert "already exists" in res.json()["detail"].lower()


def test_signup_validation_errors():
    """Verify invalid payloads (missing fields, bad email) are rejected."""
    # Bad email
    res1 = client.post("/api/v1/auth/signup", json={
        "email": "not-an-email",
        "full_name": "John Doe",
        "company_name": "ACME"
    })
    assert res1.status_code == 422

    # Missing company name
    res2 = client.post("/api/v1/auth/signup", json={
        "email": "valid@email.com",
        "full_name": "John Doe",
        "company_name": ""
    })
    assert res2.status_code == 400
