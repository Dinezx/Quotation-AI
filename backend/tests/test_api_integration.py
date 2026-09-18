import time
import pytest
from fastapi.testclient import TestClient
from jose import jwt, jwk
from jose.utils import base64url_encode
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

from app.main import app
from app.core.config import settings
from app.core.jwks import jwks_manager
from app.db.base import Base
from app.db.session import engine

client = TestClient(app)
INTEG_KID = "integration-test-kid-2026"

@pytest.fixture(scope="module")
def auth_headers():
    from app.db.init_db import init_db
    init_db()

    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    numbers = public_key.public_numbers()
    x_bytes = numbers.x.to_bytes(32, byteorder="big")
    y_bytes = numbers.y.to_bytes(32, byteorder="big")

    jwk_dict = {
        "kty": "EC",
        "crv": "P-256",
        "x": base64url_encode(x_bytes).decode("ascii"),
        "y": base64url_encode(y_bytes).decode("ascii"),
        "alg": "ES256",
        "use": "sig",
        "kid": INTEG_KID,
    }
    constructed_pub = jwk.construct(jwk_dict, algorithm="ES256")
    jwks_manager.register_test_key(INTEG_KID, constructed_pub)

    pem_priv = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    now = int(time.time())
    claims = {
        "sub": "usr-integ-test-01",
        "iss": settings.SUPABASE_JWT_ISSUER,
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "exp": now + 3600,
        "iat": now,
        "email": "r.deshmukh@bharatprecision.co.in",
        "user_metadata": {
            "company_id": "comp-bpe-pune",
            "role": "COSTING_ENGINEER",
            "full_name": "Rajesh Deshmukh"
        }
    }
    token = jwt.encode(claims, pem_priv, algorithm="ES256", headers={"kid": INTEG_KID})
    return {"Authorization": f"Bearer {token}"}


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_auth_me(auth_headers):
    res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["company_id"] == "comp-bpe-pune"
    assert "Bharat Precision" in data["company"]["name"]


def test_rates_materials(auth_headers):
    res = client.get("/api/v1/rates/materials", headers=auth_headers)
    assert res.status_code == 200
    materials = res.json()
    assert len(materials) >= 5
    grades = [m["grade"] for m in materials]
    assert "SS 304" in grades
    assert "EN8D" in grades


def test_rates_processes(auth_headers):
    res = client.get("/api/v1/rates/processes", headers=auth_headers)
    assert res.status_code == 200
    processes = res.json()
    assert len(processes) >= 4


def test_customers_crud(auth_headers):
    res = client.get("/api/v1/customers", headers=auth_headers)
    assert res.status_code == 200
    customers = res.json()
    assert len(customers) >= 1


def test_quotations_calculation_endpoint(auth_headers):
    payload = {
        "items": [
            {
                "part_name": "CNC Flange",
                "quantity": 10,
                "unit": "PCS",
                "gross_weight_kg": 12.0,
                "scrap_weight_kg": 4.0,
                "material_base_rate": 380.0,
                "scrap_credit_rate": 140.0,
                "machining_hours": 2.5,
                "machine_hourly_rate": 1200.0,
                "setup_cost": 500.0,
            }
        ],
        "overhead_percentage": 12,
        "profit_percentage": 15,
        "gst_type": "CGST_SGST",
    }
    res = client.post("/api/v1/quotations/calculate", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["material_cost"] == 40000.0
    assert data["process_cost"] == 30500.0
    assert data["subtotal"] == 70500.0
    assert data["overhead_amount"] == 8460.0
    assert data["profit_amount"] == 11844.0
    assert data["taxable_amount"] == 90804.0
    assert data["cgst_amount"] == 8172.0
    assert data["sgst_amount"] == 8172.0
    assert data["final_total"] == 107148.0
    assert "Indian Rupee" in data["final_total_in_words"]
