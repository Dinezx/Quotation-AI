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
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.customer import Customer
from app.models.user import User

client = TestClient(app)

KID = "test-auth-kid-2026"
OTHER_KID = "test-untrusted-kid"

@pytest.fixture(scope="module", autouse=True)
def setup_auth_keys_and_tenants():
    # 1. Generate EC P-256 key pair for test
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
        "kid": KID,
    }

    constructed_pub_key = jwk.construct(jwk_dict, algorithm="ES256")
    jwks_manager.register_test_key(KID, constructed_pub_key)

    pem_priv = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    # 2. Setup separate Company A and Company B in DB for cross-tenant test
    from app.db.base import Base
    from app.db.session import engine
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        comp_a = db.query(Company).filter(Company.id == "comp-bpe-pune").first()
        if not comp_a:
            comp_a = Company(id="comp-bpe-pune", name="Bharat Precision Engineering Pvt Ltd")
            db.add(comp_a)

        comp_b = db.query(Company).filter(Company.id == "comp-other-plant").first()
        if not comp_b:
            comp_b = Company(id="comp-other-plant", name="Other Engineering Works")
            db.add(comp_b)
            db.commit()

        # Seed test users for Company A
        usr_test = db.query(User).filter(User.id == "usr-test-engineer-01").first()
        if not usr_test:
            usr_test = User(
                id="usr-test-engineer-01",
                company_id="comp-bpe-pune",
                email="engineer.test@bharatprecision.co.in",
                full_name="Test Costing Engineer",
                role="COSTING_ENGINEER",
                is_active=True,
            )
            db.add(usr_test)

        usr_comp_a = db.query(User).filter(User.id == "usr-comp-a-engineer").first()
        if not usr_comp_a:
            usr_comp_a = User(
                id="usr-comp-a-engineer",
                company_id="comp-bpe-pune",
                email="engineer@company-a.com",
                full_name="Company A Engineer",
                role="COSTING_ENGINEER",
                is_active=True,
            )
            db.add(usr_comp_a)

        # Seed orphaned user without company association for test_12
        usr_orphan = db.query(User).filter(User.id == "usr-no-company-test").first()
        if not usr_orphan:
            usr_orphan = User(
                id="usr-no-company-test",
                company_id=None,
                email="orphan.test@quotation.ai",
                full_name="Orphan User",
                role="COSTING_ENGINEER",
                is_active=True,
            )
            db.add(usr_orphan)

        # Customer belonging to Company B
        cust_b = db.query(Customer).filter(Customer.id == "cust-company-b-only").first()
        if not cust_b:
            cust_b = Customer(
                id="cust-company-b-only",
                company_id="comp-other-plant",
                name="Confidential Client of Company B",
                is_active=True
            )
            db.add(cust_b)

        db.commit()
    finally:
        db.close()

    yield {
        "pem_priv": pem_priv,
        "kid": KID,
    }


def make_token(pem_priv: str, kid: str, claims_override: dict = None, remove_claims: list = None) -> str:
    now = int(time.time())
    claims = {
        "sub": "usr-test-engineer-01",
        "iss": settings.SUPABASE_JWT_ISSUER,
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "exp": now + 3600,
        "iat": now,
        "role": "authenticated",
        "email": "engineer.test@bharatprecision.co.in",
        "user_metadata": {
            "company_id": "comp-bpe-pune",
            "role": "COSTING_ENGINEER",
            "full_name": "Test Costing Engineer"
        }
    }
    if claims_override:
        claims.update(claims_override)
    if remove_claims:
        for k in remove_claims:
            claims.pop(k, None)

    return jwt.encode(claims, pem_priv, algorithm="ES256", headers={"kid": kid})


def test_1_valid_access_token(setup_auth_keys_and_tenants):
    """Test valid access token verified via asymmetric key."""
    priv = setup_auth_keys_and_tenants["pem_priv"]
    token = make_token(priv, KID)

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["company_id"] == "comp-bpe-pune"
    assert data["user"]["email"] == "engineer.test@bharatprecision.co.in"


def test_2_expired_token(setup_auth_keys_and_tenants):
    """Test expired token returns 401 Unauthorized."""
    priv = setup_auth_keys_and_tenants["pem_priv"]
    now = int(time.time())
    token = make_token(priv, KID, claims_override={"exp": now - 300, "iat": now - 600})

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"].lower()


def test_3_invalid_signature(setup_auth_keys_and_tenants):
    """Test token signed with an unauthorized private key returns 401 Unauthorized."""
    rogue_priv = ec.generate_private_key(ec.SECP256R1()).private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    token = make_token(rogue_priv, KID)

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "invalid token signature" in resp.json()["detail"].lower()


def test_4_missing_authorization_header():
    """Test request without Authorization header returns 401 Unauthorized."""
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert "missing authorization header" in resp.json()["detail"].lower()


def test_5_malformed_bearer_token():
    """Test malformed bearer token returns 401 Unauthorized."""
    resp1 = client.get("/api/v1/auth/me", headers={"Authorization": "Basic dXNlcjpwYXNz"})
    assert resp1.status_code == 401

    resp2 = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt-structure"})
    assert resp2.status_code == 401


def test_6_wrong_issuer(setup_auth_keys_and_tenants):
    """Test token with incorrect issuer returns 401 Unauthorized."""
    priv = setup_auth_keys_and_tenants["pem_priv"]
    token = make_token(priv, KID, claims_override={"iss": "https://evil-untrusted-issuer.com/auth/v1"})

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "invalid token claims" in resp.json()["detail"].lower()


def test_7_cross_company_access_attempt(setup_auth_keys_and_tenants):
    """
    Test tenant isolation:
    User authenticated in Company A ('comp-bpe-pune') cannot access or view Company B's data ('comp-other-plant').
    """
    priv = setup_auth_keys_and_tenants["pem_priv"]
    token_comp_a = make_token(priv, KID, claims_override={
        "sub": "usr-comp-a-engineer",
        "email": "engineer@company-a.com",
        "user_metadata": {"company_id": "comp-bpe-pune"}
    })

    # 1. Attempt to fetch Company B's customer directly by ID
    resp = client.get(
        "/api/v1/customers/cust-company-b-only",
        headers={"Authorization": f"Bearer {token_comp_a}"}
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Customer not found"

    # 2. Attempt to list all customers
    list_resp = client.get(
        "/api/v1/customers",
        headers={"Authorization": f"Bearer {token_comp_a}"}
    )
    assert list_resp.status_code == 200
    customer_ids = [c["id"] for c in list_resp.json()]
    assert "cust-company-b-only" not in customer_ids


def test_8_valid_audience_accepted(setup_auth_keys_and_tenants):
    """Test valid token with expected audience 'authenticated' is accepted."""
    priv = setup_auth_keys_and_tenants["pem_priv"]
    token = make_token(priv, KID, claims_override={"aud": "authenticated"})

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["user"]["id"] == "usr-test-engineer-01"


def test_9_invalid_audience_rejected(setup_auth_keys_and_tenants):
    """Test token with valid signature but wrong audience is rejected with 401 Unauthorized."""
    priv = setup_auth_keys_and_tenants["pem_priv"]
    token = make_token(priv, KID, claims_override={"aud": "unauthorized-service"})

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "audience" in resp.json()["detail"].lower()


def test_10_missing_audience_rejected(setup_auth_keys_and_tenants):
    """Test token with valid signature but missing audience claim is rejected with 401 Unauthorized."""
    priv = setup_auth_keys_and_tenants["pem_priv"]
    token = make_token(priv, KID, remove_claims=["aud"])

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "aud" in resp.json()["detail"].lower() or "audience" in resp.json()["detail"].lower()


def test_11_unknown_user_rejected_403(setup_auth_keys_and_tenants):
    """Test authenticated JWT whose application user does not exist in DB is rejected with 403 Forbidden."""
    priv = setup_auth_keys_and_tenants["pem_priv"]
    ghost_sub = "usr-completely-unknown-999"
    token = make_token(priv, KID, claims_override={
        "sub": ghost_sub,
        "email": "ghost.unregistered@random.com"
    })

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    assert "no associated tenant company" in resp.json()["detail"].lower()


def test_12_user_without_valid_company_rejected_403(setup_auth_keys_and_tenants):
    """Test authenticated JWT whose application user has no valid company association is rejected with 403 Forbidden."""
    priv = setup_auth_keys_and_tenants["pem_priv"]
    token = make_token(priv, KID, claims_override={
        "sub": "usr-no-company-test",
        "email": "orphan.test@quotation.ai"
    })

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    assert "no valid company association" in resp.json()["detail"].lower()


def test_13_unknown_jwt_subject_never_resolves_to_default_company(setup_auth_keys_and_tenants):
    """
    Test that an unknown JWT subject can NEVER resolve to the demo/default company.
    Verifies that:
    1. Unknown user gets HTTP 403.
    2. No user record is inserted in the DB.
    3. The default company's resources cannot be accessed.
    """
    priv = setup_auth_keys_and_tenants["pem_priv"]
    stranger_sub = f"usr-stranger-{int(time.time())}"
    token = make_token(priv, KID, claims_override={
        "sub": stranger_sub,
        "email": f"stranger.{int(time.time())}@outsider.com",
        "user_metadata": {"company_id": "comp-bpe-pune"}  # Attacker attempts to claim default company!
    })

    # Access attempt must fail with 403
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403

    # Attempt to list default company's customers
    cust_resp = client.get("/api/v1/customers", headers={"Authorization": f"Bearer {token}"})
    assert cust_resp.status_code == 403

    # Verify no record was auto-created in the database
    db = SessionLocal()
    try:
        user_in_db = db.query(User).filter(User.id == stranger_sub).first()
        assert user_in_db is None, "Security violation: unknown user was auto-provisioned in the database!"
    finally:
        db.close()
