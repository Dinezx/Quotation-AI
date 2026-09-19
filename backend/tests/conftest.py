import os
import sys
import time
import pytest
from jose import jwt, jwk
from jose.utils import base64url_encode
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.jwks import jwks_manager
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.init_db import seed_initial_data
from app.models.company import Company
from app.models.user import User
from app.services.ai.extractor import po_extraction_service

CONFTEST_KID = "conftest-shared-kid-2026"


@pytest.fixture(autouse=True)
def isolate_test_po_provider():
    """
    Ensure the test suite defaults to 'mock' provider so local .env overrides
    (such as PO_EXTRACTION_PROVIDER=azure) do not affect baseline test execution.
    """
    orig_settings_provider = settings.PO_EXTRACTION_PROVIDER
    orig_svc_provider = po_extraction_service._default_provider
    settings.PO_EXTRACTION_PROVIDER = "mock"
    po_extraction_service._default_provider = "mock"
    yield
    settings.PO_EXTRACTION_PROVIDER = orig_settings_provider
    po_extraction_service._default_provider = orig_svc_provider


@pytest.fixture(autouse=True)
def guard_against_live_azure_calls(monkeypatch):
    """
    CRITICAL TEST SAFETY GUARD:
    Prevents any unmocked live network calls from being sent to Azure Document Intelligence
    during automated test execution. Any unmocked attempt raises a descriptive RuntimeError.
    """
    from azure.ai.documentintelligence import DocumentIntelligenceClient

    def _blocked_begin_analyze_document(*args, **kwargs):
        raise RuntimeError("CRITICAL TEST SAFETY VIOLATION: Unmocked Azure Document Intelligence network call attempted in tests!")

    monkeypatch.setattr(DocumentIntelligenceClient, "begin_analyze_document", _blocked_begin_analyze_document)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database schema and baseline reference data are available for testing."""
    Base.metadata.create_all(bind=engine)
    seed_initial_data()

    # Ensure secondary tenant Company B exists for cross-tenancy testing
    db = SessionLocal()
    try:
        comp_b = db.query(Company).filter(Company.id == "comp-other-plant").first()
        if not comp_b:
            comp_b = Company(
                id="comp-other-plant",
                name="Other Engineering Works",
                legal_name="Other Engineering Works Pvt Ltd",
            )
            db.add(comp_b)
            db.commit()

        user_b = db.query(User).filter(User.id == "usr-other-plant-001").first()
        if not user_b:
            user_b = User(
                id="usr-other-plant-001",
                company_id="comp-other-plant",
                email="engineer@otherplant.co.in",
                full_name="Company B Costing Engineer",
                role="COSTING_ENGINEER",
                is_active=True,
            )
            db.add(user_b)
            db.commit()
    finally:
        db.close()


@pytest.fixture(scope="session")
def session_jwt_signer():
    """Generate session-wide EC P-256 key pair and register it with jwks_manager."""
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
        "kid": CONFTEST_KID,
    }
    constructed_pub = jwk.construct(jwk_dict, algorithm="ES256")
    jwks_manager.register_test_key(CONFTEST_KID, constructed_pub)

    pem_priv = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    def _sign_token(sub: str, email: str, role: str = "COSTING_ENGINEER", exp_offset: int = 3600) -> str:
        now = int(time.time())
        claims = {
            "sub": sub,
            "iss": settings.SUPABASE_JWT_ISSUER,
            "aud": settings.SUPABASE_JWT_AUDIENCE,
            "exp": now + exp_offset,
            "iat": now,
            "role": "authenticated",
            "email": email,
        }
        return jwt.encode(claims, pem_priv, algorithm="ES256", headers={"kid": CONFTEST_KID})

    return _sign_token


@pytest.fixture
def auth_headers(session_jwt_signer):
    """Auth headers for default tenant user in comp-bpe-pune."""
    token = session_jwt_signer("usr-bpe-001", "r.deshmukh@bharatprecision.co.in")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_company_b(session_jwt_signer):
    """Auth headers for isolated secondary tenant user in comp-other-plant."""
    token = session_jwt_signer("usr-other-plant-001", "engineer@otherplant.co.in")
    return {"Authorization": f"Bearer {token}"}


