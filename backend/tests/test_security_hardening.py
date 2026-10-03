import io
import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.file_security import validate_file_content, sanitize_filename
from app.core.rate_limit import rate_limiter
from app.services.audit.audit_service import AuditService, sanitize_metadata
from app.db.session import SessionLocal
from app.models.user import User
from app.models.company import Company
from app.models.audit_log import AuditLog

client = TestClient(app)

# ---------------------------------------------------------------------------
# 1. SECURITY HEADERS TESTS
# ---------------------------------------------------------------------------
def test_security_headers_present():
    """Verify that production security headers are present on all responses."""
    resp = client.get("/health")
    assert resp.status_code == 200
    headers = resp.headers

    assert "Strict-Transport-Security" in headers
    assert "max-age=31536000" in headers["Strict-Transport-Security"]
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert "strict-origin-when-cross-origin" in headers.get("Referrer-Policy", "")
    assert "Permissions-Policy" in headers
    assert "Content-Security-Policy" in headers


# ---------------------------------------------------------------------------
# 2. AUTHENTICATION HARDENING TESTS
# ---------------------------------------------------------------------------
def test_auth_missing_token_rejected_401():
    """Verify accessing protected routes without token returns 401."""
    resp = client.get("/api/v1/company/settings")
    assert resp.status_code == 401
    assert "Missing Authorization header" in resp.json()["detail"]


def test_auth_malformed_token_rejected_401():
    """Verify malformed authorization headers return 401."""
    resp = client.get("/api/v1/company/settings", headers={"Authorization": "Basic YWRtaW46cGFzcw=="})
    assert resp.status_code == 401

    resp_junk = client.get("/api/v1/company/settings", headers={"Authorization": "Bearer not-a-valid-jwt"})
    assert resp_junk.status_code == 401


def test_auth_expired_token_rejected_401(session_jwt_signer):
    """Verify expired JWTs are rejected with 401."""
    expired_token = session_jwt_signer("usr-bpe-001", "r.deshmukh@bharatprecision.co.in", exp_offset=-60)
    resp = client.get("/api/v1/company/settings", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401


def test_auth_unknown_user_rejected_403(session_jwt_signer):
    """Verify valid token for a user not mapped to any tenant returns 403."""
    unknown_token = session_jwt_signer("usr-unknown-attacker", "attacker@evil.com")
    resp = client.get("/api/v1/company/settings", headers={"Authorization": f"Bearer {unknown_token}"})
    assert resp.status_code == 403
    assert "no associated tenant" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# 3. ROLE-BASED ACCESS CONTROL (RBAC) & PRIVILEGE ESCALATION TESTS
# ---------------------------------------------------------------------------
def test_rbac_viewer_cannot_mutate_company_settings(session_jwt_signer):
    """Verify that a read-only VIEWER role cannot mutate company configuration."""
    db = SessionLocal()
    try:
        # Create or fetch a viewer user in comp-bpe-pune
        viewer = db.query(User).filter(User.id == "usr-viewer-001").first()
        if not viewer:
            viewer = User(
                id="usr-viewer-001",
                company_id="comp-bpe-pune",
                email="viewer@bharatprecision.co.in",
                full_name="Readonly Auditor",
                role="VIEWER",
                is_active=True,
            )
            db.add(viewer)
            db.commit()
    finally:
        db.close()

    viewer_token = session_jwt_signer("usr-viewer-001", "viewer@bharatprecision.co.in", role="VIEWER")
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # VIEWER can read settings
    resp_read = client.get("/api/v1/company/settings", headers=viewer_headers)
    assert resp_read.status_code == 200

    # VIEWER CANNOT update profile (403 Forbidden)
    resp_update = client.put(
        "/api/v1/company/profile",
        json={"name": "Hacked Plant Name"},
        headers=viewer_headers,
    )
    assert resp_update.status_code == 403
    assert "requires one of roles" in resp_update.json()["detail"]

    # VIEWER CANNOT update pricing rules
    resp_rates = client.put(
        "/api/v1/rates/pricing-rules",
        json={"overhead_percentage": 50.0, "profit_percentage": 50.0, "gst_type": "CGST_SGST", "default_gst_rate": 18.0},
        headers=viewer_headers,
    )
    assert resp_rates.status_code == 403

    # VIEWER CANNOT upload or delete logo
    resp_logo = client.delete("/api/v1/company/logo", headers=viewer_headers)
    assert resp_logo.status_code == 403


# ---------------------------------------------------------------------------
# 4. CROSS-TENANT ISOLATION (IDOR / BOLA) TESTS
# ---------------------------------------------------------------------------
def test_cross_tenant_data_access_blocked(auth_headers, auth_headers_company_b):
    """Verify that Company B cannot read, update, or delete Company A records."""
    import uuid
    uid = uuid.uuid4().hex[:6]
    # 1. Company A creates a private customer
    cust_payload = {
        "name": f"Classified Defense {uid} Ltd",
        "email": f"procurement-{uid}@classified-defense.in",
        "is_active": True,
    }
    create_resp = client.post("/api/v1/customers", json=cust_payload, headers=auth_headers)
    assert create_resp.status_code == 201
    cust_id = create_resp.json()["id"]

    # 2. Company B attempts to read Company A customer via direct ID -> 404
    resp_b_read = client.get(f"/api/v1/customers/{cust_id}", headers=auth_headers_company_b)
    assert resp_b_read.status_code == 404

    # 3. Company B attempts to modify Company A customer -> 404
    resp_b_put = client.put(
        f"/api/v1/customers/{cust_id}",
        json={"name": "Compromised Customer Name"},
        headers=auth_headers_company_b,
    )
    assert resp_b_put.status_code == 404

    # 4. Company B attempts to delete Company A customer -> 404
    resp_b_del = client.delete(f"/api/v1/customers/{cust_id}", headers=auth_headers_company_b)
    assert resp_b_del.status_code == 404

    # 5. Verify customer was unaffected
    verify_resp = client.get(f"/api/v1/customers/{cust_id}", headers=auth_headers)
    assert verify_resp.status_code == 200
    assert verify_resp.json()["name"] == f"Classified Defense {uid} Ltd"



# ---------------------------------------------------------------------------
# 5. FILE UPLOAD & MAGIC BYTE VALIDATION TESTS
# ---------------------------------------------------------------------------
def test_upload_executable_masquerading_as_pdf_rejected(auth_headers):
    """Test that Windows MZ executable disguised with a .pdf extension is rejected."""
    # Windows PE / MZ executable signature
    malicious_exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xffThis is a disguised backdoor executable."
    file_payload = {
        "file": ("malicious_payload.pdf", io.BytesIO(malicious_exe_bytes), "application/pdf")
    }
    resp = client.post("/api/v1/purchase-orders/upload", files=file_payload, headers=auth_headers)
    assert resp.status_code == 400
    assert "Invalid file signature" in resp.json()["detail"] or "Dangerous executable" in resp.json()["detail"]


def test_upload_script_masquerading_as_png_rejected(auth_headers):
    """Test that a shell script disguised with a .png extension is rejected."""
    script_bytes = b"#!/bin/bash\nrm -rf / --no-preserve-root\n"
    file_payload = {
        "file": ("exploit.png", io.BytesIO(script_bytes), "image/png")
    }
    resp = client.post("/api/v1/purchase-orders/upload", files=file_payload, headers=auth_headers)
    assert resp.status_code == 400
    assert "Dangerous executable" in resp.json()["detail"] or "Invalid file signature" in resp.json()["detail"]


def test_filename_sanitization_and_traversal_prevention():
    """Verify filename sanitization removes directory traversal characters."""
    dangerous = "../../../etc/shadow"
    safe = sanitize_filename(dangerous)
    assert ".." not in safe
    assert "/" not in safe
    assert "\\" not in safe
    assert safe == "shadow"



# ---------------------------------------------------------------------------
# 6. STATIC UPLOADS ROUTE HARDENING (SEC-01 RECTIFICATION)
# ---------------------------------------------------------------------------
def test_uploads_endpoint_unauthenticated_blocked():
    """Verify unauthenticated requests to /uploads/... are rejected with 401."""
    resp = client.get("/uploads/po_comp-bpe-pune/confidential.pdf")
    assert resp.status_code == 401


def test_uploads_endpoint_cross_tenant_access_blocked(auth_headers_company_b):
    """Verify Company B cannot download files in Company A's folder."""
    # Attempt to access Company A's directory using Company B token
    resp = client.get("/uploads/po_comp-bpe-pune/sample.pdf", headers=auth_headers_company_b)
    assert resp.status_code == 403
    assert "belonging to another company" in resp.json()["detail"]


def test_uploads_endpoint_path_traversal_blocked(auth_headers):
    """Verify path traversal attempts in /uploads/... return 400."""
    resp = client.get("/uploads/..%2F..%2Fetc%2Fpasswd", headers=auth_headers)
    assert resp.status_code in (400, 404)


# ---------------------------------------------------------------------------
# 7. RATE LIMITING TESTS
# ---------------------------------------------------------------------------
def test_rate_limiter_sliding_window_enforcement():
    """Test that the sliding window rate limiter returns retry_after when threshold is exceeded."""
    key = "test:client-ip-127.0.0.1"
    rate_limiter.reset()

    # Allow up to 3 requests
    assert rate_limiter.check_rate_limit(key, max_requests=3, window_seconds=60) is None
    assert rate_limiter.check_rate_limit(key, max_requests=3, window_seconds=60) is None
    assert rate_limiter.check_rate_limit(key, max_requests=3, window_seconds=60) is None

    # 4th request must be rate limited
    retry_after = rate_limiter.check_rate_limit(key, max_requests=3, window_seconds=60)
    assert retry_after is not None
    assert retry_after > 0

    rate_limiter.reset()


# ---------------------------------------------------------------------------
# 8. HEALTH CHECK PROBE CREDENTIAL SANITIZATION
# ---------------------------------------------------------------------------
def test_health_check_reveals_no_credentials():
    """Verify health endpoints disclose no database connection strings or internals."""
    resp = client.get("/health/ready")
    assert resp.status_code in (200, 503)
    data = resp.json()
    assert "status" in data
    assert "database" in data
    # Ensure no passwords, URLs, or secrets leaked
    dump = str(data).lower()
    assert "password" not in dump
    assert "postgresql://" not in dump
    assert "secret" not in dump


# ---------------------------------------------------------------------------
# 9. AUDIT LOGGING & SENSITIVE DATA REDACTION
# ---------------------------------------------------------------------------
def test_audit_metadata_sanitization():
    """Verify that credentials and tokens are redacted from audit logs."""
    dirty_metadata = {
        "user_email": "engineer@company.com",
        "api_key": "secret-super-key-12345",
        "nested": {
            "password": "ClearTextPassword123",
            "token": "eyJhbGciOi...",
            "safe_field": 42
        }
    }
    cleaned = sanitize_metadata(dirty_metadata)
    assert cleaned["user_email"] == "engineer@company.com"
    assert cleaned["api_key"] == "[REDACTED]"
    assert cleaned["nested"]["password"] == "[REDACTED]"
    assert cleaned["nested"]["token"] == "[REDACTED]"
    assert cleaned["nested"]["safe_field"] == 42


def test_audit_log_query_tenant_isolation(auth_headers, auth_headers_company_b, session_jwt_signer):
    """Verify that audit logs can only be queried by company ADMIN and are strictly tenant-isolated."""
    db = SessionLocal()
    try:
        # Create ADMIN for comp-bpe-pune
        admin_a = db.query(User).filter(User.id == "usr-admin-bpe").first()
        if not admin_a:
            admin_a = User(
                id="usr-admin-bpe",
                company_id="comp-bpe-pune",
                email="admin@bharatprecision.co.in",
                full_name="Plant Managing Director",
                role="ADMIN",
                is_active=True,
            )
            db.add(admin_a)
            db.commit()

        # Log an event for Company A
        AuditService.log_event(
            event="TEST_SECURITY_EVENT",
            company_id="comp-bpe-pune",
            user_id="usr-admin-bpe",
            user_email="admin@bharatprecision.co.in",
            entity_type="Test",
            entity_id="test-1",
            db=db,
        )
    finally:
        db.close()

    admin_token = session_jwt_signer("usr-admin-bpe", "admin@bharatprecision.co.in", role="ADMIN")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin A can query Company A audit logs
    resp_a = client.get("/api/v1/audit/logs", headers=admin_headers)
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["total"] >= 1
    assert any(log["event"] == "TEST_SECURITY_EVENT" for log in data_a["logs"])

    # Non-admin (COSTING_ENGINEER) cannot access audit logs -> 403 Forbidden
    resp_engineer = client.get("/api/v1/audit/logs", headers=auth_headers)
    assert resp_engineer.status_code == 403
    assert "requires one of roles: ADMIN" in resp_engineer.json()["detail"]
