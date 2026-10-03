# Quotation AI — Comprehensive Production Security Audit

**Document Version:** 1.0.0  
**Date:** October 2026  
**Auditor:** Application Security Architecture Team  
**System:** Quotation AI — Precision B2B Manufacturing Quotation SaaS Platform  
**Target Architecture:** Multi-tenant SaaS with Supabase Auth, PostgreSQL + RLS, Private Storage, Azure Front Door + WAF, FastAPI backend, and React/Vite frontend.

---

## 1. Executive Summary

A comprehensive security audit of the complete Quotation AI codebase was executed covering frontend, backend, database schema, infrastructure, dependencies, and external integrations. 

Quotation AI features strong baseline security primitives:
- Deterministic calculation engine strictly isolated from AI extraction.
- Server-side asymmetric JWKS token validation validating `sub`, `aud`, `iss`, `alg`, and `exp`.
- Server-derived `company_id` enforcement preventing cross-tenant data access.
- Single-use Google OAuth PKCE authorization code exchange.

The audit identified critical and high-priority security gaps that must be hardened for enterprise production readiness:
1. Public unauthenticated static file mounting of the `/uploads` directory in FastAPI.
2. Leakage of internal database exception details in the `/health/ready` endpoint.
3. Lack of application-layer rate limiting across sensitive and computationally expensive endpoints.
4. Missing role-based authorization guards (`ADMIN` vs `COSTING_ENGINEER` vs `VIEWER`) on company configuration, rate cards, and PO review.
5. Incomplete file upload validation allowing client-spoofed MIME types and missing magic-byte verification.
6. Absence of a centralized, tenant-scoped audit logging service for compliance and security events.
7. Missing HTTP security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) in backend API responses.
8. Unrestricted container root user execution in Dockerfile with excessive filesystem permissions (`chmod 777`).

---

## 2. Comprehensive Security Findings Register

| ID | Severity | Category | Component | Status | Summary |
|---|---|---|---|---|---|
| **SEC-01** | **CRITICAL** | Authorization / Exposure | Backend: `app.main` `/uploads` mount | **FIXED** | Unauthenticated public static file mount exposing customer purchase orders. |
| **SEC-02** | **HIGH** | Info Disclosure | Backend: `/health/ready` | **FIXED** | Database and storage connection error exceptions leaked in health responses. |
| **SEC-03** | **HIGH** | Availability / DoS | Backend: Middleware | **FIXED** | Lack of application-level rate limiting on sensitive and expensive endpoints. |
| **SEC-04** | **HIGH** | Access Control / RBAC | Backend: `api/routes/company.py`, `rates.py` | **FIXED** | Role-based authorization was not enforced on administrative settings and pricing rules. |
| **SEC-05** | **HIGH** | File Security | Backend: `purchase_orders.py`, `company.py` | **FIXED** | Client-supplied MIME types were trusted without binary magic-byte verification. |
| **SEC-06** | **HIGH** | Compliance / Audit | Backend: System-wide | **FIXED** | Absence of unified `AuditLog` service to record security, auth, and state changes. |
| **SEC-07** | **MEDIUM** | Network Security | Backend: Response Middleware | **FIXED** | Missing HTTP security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options). |
| **SEC-08** | **MEDIUM** | Error Handling | Backend: Exception Handlers | **FIXED** | Unhandled server errors could expose stack traces or internal topology. |
| **SEC-09** | **MEDIUM** | Container Security | Infrastructure: `backend/Dockerfile` | **FIXED** | Container ran as root with insecure directory permissions (`chmod 777`). |
| **SEC-10** | **MEDIUM** | Cloud Ingress | Infrastructure: `azure/container-app.bicep` | **FIXED** | Azure Front Door bypass risk without `X-Azure-FDID` validation. |
| **SEC-11** | **MEDIUM** | CORS Configuration | Backend: `app.main` CORS middleware | **FIXED** | Wildcard HTTP methods and headers allowed on CORS policy. |
| **SEC-12** | **LOW** | Info Disclosure | Backend: Swagger / ReDoc | **FIXED** | Interactive API documentation enabled regardless of production environment mode. |

---

## 3. Deep-Dive Security Findings

### SEC-01: Public Unauthenticated Static Mount of Uploads Directory
- **Severity:** CRITICAL
- **Affected Component:** [backend/app/main.py](file:///d:/Quotation%20AI/backend/app/main.py#L40)
- **Vulnerability Description:** The FastAPI entrypoint mounted the local `uploads` directory directly at `/uploads` using Starlette `StaticFiles` without authentication middleware.
- **Exploit Scenario:** An unauthenticated remote attacker could discover or enumerate file paths (e.g. `/uploads/po_comp-bpe-pune/58a936fb5ba2532f_sample_po.pdf`) and download confidential trade secrets, customer engineering drawings, parts specifications, and commercial purchase orders.
- **Remediation:** Remove public static file mounting. Implement an authenticated, tenant-verified file download endpoint. All file access must require an authentic Supabase session belonging to the tenant that owns the file.
- **Status:** **REMEDIATED**

---

### SEC-02: Health Readiness Probe Leaks Database Exception Details
- **Severity:** HIGH
- **Affected Component:** [backend/app/main.py](file:///d:/Quotation%20AI/backend/app/main.py#L76-L89)
- **Vulnerability Description:** The `/health/ready` endpoint caught exceptions and formatted them directly into the JSON response: `res_data["database"] = f"error: {str(e)}"`.
- **Exploit Scenario:** During an outage or configuration error, database connection strings, database server hostnames, internal IP addresses, or driver stack traces would be exposed to unauthenticated probes.
- **Remediation:** Sanitize all health responses. Return standard operational status codes (`ready`, `unready`) with generic status indicators (`"database": "connected" | "unavailable"`). Detailed errors are logged to protected server logs only.
- **Status:** **REMEDIATED**

---

### SEC-03: Missing Application-Layer Rate Limiting
- **Severity:** HIGH
- **Affected Component:** Backend HTTP pipeline
- **Vulnerability Description:** The API had no application-level rate limiter. While Azure WAF provides edge rate limiting, backend services lacked defense-in-depth against credential stuffing, automated PO extraction loops, and resource exhaustion.
- **Exploit Scenario:** An attacker could flood `/api/v1/auth/signup`, `/api/v1/purchase-orders/upload`, or `/api/v1/quotations/{id}/pdf` with thousands of concurrent requests, driving up cloud OCR/LLM costs or starving CPU resources during PDF generation.
- **Remediation:** Implement a thread-safe sliding window rate limiter returning `HTTP 429 Too Many Requests` with `Retry-After` headers. Apply distinct limits:
  - Auth endpoints: 10 requests / minute
  - Heavy endpoints (PO Upload, AI Extraction, PDF, Email): 30 requests / minute
  - Standard API endpoints: 120 requests / minute
- **Status:** **REMEDIATED**

---

### SEC-04: Lack of Role-Based Access Control on Administrative Endpoints
- **Severity:** HIGH
- **Affected Component:** [company.py](file:///d:/Quotation%20AI/backend/app/api/routes/company.py), [rates.py](file:///d:/Quotation%20AI/backend/app/api/routes/rates.py), [purchase_orders.py](file:///d:/Quotation%20AI/backend/app/api/routes/purchase_orders.py)
- **Vulnerability Description:** While multi-tenant `company_id` isolation was strictly enforced, endpoints modifying company profiles, tax settings, bank accounts, template styles, and rate cards accepted any authenticated user in the company, including users with the `VIEWER` role.
- **Exploit Scenario:** A low-privilege `VIEWER` account (e.g. an auditor or external client) could modify the company's bank account details, manipulate overhead and profit margins, or alter rate cards, directly affecting financial quotes.
- **Remediation:** Enforce server-side role validation using `require_role(["ADMIN"])` for company settings, bank configuration, tax settings, and pricing rules. Use `require_role(["ADMIN", "COSTING_ENGINEER"])` for rate card management, PO approvals, and quotation finalization.
- **Status:** **REMEDIATED**

---

### SEC-05: Untrusted File Upload & Missing Magic-Byte Validation
- **Severity:** HIGH
- **Affected Component:** [purchase_orders.py](file:///d:/Quotation%20AI/backend/app/api/routes/purchase_orders.py#L145), [company.py](file:///d:/Quotation%20AI/backend/app/api/routes/company.py#L371)
- **Vulnerability Description:** Upload handlers relied on client-provided `Content-Type` headers (`application/pdf`, `image/png`) without checking binary magic bytes. Upload size was not bounded on PO documents.
- **Exploit Scenario:** An attacker could upload an executable binary or HTML payload with an `application/pdf` MIME type or upload a 10GB file to exhaust server memory.
- **Remediation:** 
  1. Inspect file signatures (magic bytes):
     - PDF: `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`)
     - PNG: `\x89PNG\r\n\x1a\n` (`0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`)
     - JPEG: `\xFF\xD8\xFF`
     - TIFF: `II*\x00` or `MM\x00*`
  2. Enforce file size maximums: 25 MB for PO documents, 5 MB for logos.
  3. Sanitize file names to prevent path traversal.
  4. Create an architectural malware scanning integration point.
- **Status:** **REMEDIATED**

---

### SEC-06: Missing Centralized Audit Logging Service
- **Severity:** HIGH
- **Affected Component:** System-wide
- **Vulnerability Description:** Although individual tables contained fields like `approved_by` or `email_sent_at`, the platform lacked an append-only, tenant-isolated audit log for security-critical actions (logins, company configuration changes, rate modifications, security denials).
- **Exploit Scenario:** Unauthorized changes or malicious activity could not be reconstructed in a post-incident forensic investigation.
- **Remediation:** Create an `AuditLog` table and `AuditService` capturing:
  - Event type (`AUTH_LOGIN`, `COMPANY_SETTINGS_UPDATED`, `RATE_UPDATED`, `QUOTATION_FINALIZED`, `AUTHORIZATION_DENIED`)
  - User ID, Email, Role, Company ID
  - Entity Type, Entity ID
  - IP Address and User Agent
  - Result (`SUCCESS`, `DENIED`, `FAILED`)
  - Explicit rule: Never store passwords, tokens, API keys, or raw confidential customer PO content in audit logs.
- **Status:** **REMEDIATED**

---

### SEC-07: Missing HTTP Security Headers
- **Severity:** MEDIUM
- **Affected Component:** Backend HTTP Responses
- **Vulnerability Description:** Responses from the FastAPI application lacked defensive browser security headers.
- **Remediation:** Add `SecurityHeadersMiddleware` injecting:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - `Content-Security-Policy: default-src 'self'; ...`
- **Status:** **REMEDIATED**

---

### SEC-08: Unhandled Server Exceptions and Information Leakage
- **Severity:** MEDIUM
- **Affected Component:** Backend Application
- **Vulnerability Description:** Default FastAPI error handling for unhandled 500 errors could expose internal stack traces or database schema names.
- **Remediation:** Implement global exception handler that logs full stack traces internally with unique request IDs and returns a safe, uniform JSON response:
  ```json
  {
    "detail": "Quotation AI services are temporarily unavailable.",
    "request_id": "req-xxx"
  }
  ```
- **Status:** **REMEDIATED**

---

### SEC-09: Insecure Container Configuration & Root Execution
- **Severity:** MEDIUM
- **Affected Component:** [backend/Dockerfile](file:///d:/Quotation%20AI/backend/Dockerfile)
- **Vulnerability Description:** Container ran as root user (`UID 0`) and ran `chmod 777 /app/uploads`.
- **Exploit Scenario:** A container breakout or remote code execution vulnerability would immediately yield root privileges on the container runtime.
- **Remediation:** Create dedicated non-root user `appuser` (`UID 10001`), set ownership to `appuser:appuser`, remove `chmod 777`, and declare `USER 10001` in the final runner stage.
- **Status:** **REMEDIATED**

---

### SEC-10: Direct Ingress Bypass of Azure Front Door / WAF
- **Severity:** MEDIUM
- **Affected Component:** [azure/container-app.bicep](file:///d:/Quotation%20AI/azure/container-app.bicep)
- **Vulnerability Description:** The Container App ingress was publicly reachable, allowing an attacker to bypass Azure Front Door and WAF rules if the Container App URL was known.
- **Remediation:** Configure `X-Azure-FDID` header validation. Backend rejects any direct requests that do not carry the authentic Azure Front Door identifier.
- **Status:** **REMEDIATED**

---

### SEC-11: Permissive CORS Configuration
- **Severity:** MEDIUM
- **Affected Component:** [backend/app/main.py](file:///d:/Quotation%20AI/backend/app/main.py#L33-L34)
- **Vulnerability Description:** CORS middleware allowed all methods `["*"]` and all headers `["*"]`.
- **Remediation:** Restrict to explicit methods (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, `HEAD`) and explicit headers (`Authorization`, `Content-Type`, `Accept`, `Origin`, `X-Requested-With`, `X-Azure-FDID`). Validate origin strictly against configured origins.
- **Status:** **REMEDIATED**

---

### SEC-12: Interactive API Documentation in Production
- **Severity:** LOW
- **Affected Component:** [backend/app/main.py](file:///d:/Quotation%20AI/backend/app/main.py#L23-L24)
- **Vulnerability Description:** Swagger UI (`/docs`) and ReDoc (`/redoc`) were unconditionally active.
- **Remediation:** Only enable `/docs`, `/redoc`, and `/openapi.json` when `ENVIRONMENT != "production"`.
- **Status:** **REMEDIATED**

---

## 4. Invariant Verification

During the audit, the following core architecture invariants were strictly verified and preserved:
1. **AI vs Pricing Invariant:** The AI document extraction engine (`ExtractedPurchaseOrder`, `ExtractedPOLineItem`) explicitly rejects any commercial or pricing fields via Pydantic `extra='forbid'` and validation rules. Pricing is exclusively derived from database rate cards by the deterministic calculation engine.
2. **Supabase Auth Invariant:** All user identities are derived server-side via asymmetric JWKS validation. The client-provided `company_id` is never trusted.
3. **Immutability Invariant:** Finalized quotations (`FINAL`) cannot be edited, recalculated, or overwritten.
4. **Tenant Isolation Invariant:** Every database query filters by `company_id == current_user.company_id`.
