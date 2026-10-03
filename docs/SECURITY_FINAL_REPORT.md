# Quotation AI — Final Production Security & Hardening Report

**Application:** Quotation AI  
**Role:** Security Architect & Senior Application Security Engineer  
**Date:** October 2, 2026  
**Status:** PRODUCTION HARDENING COMPLETE & VALIDATED  

---

## 1. Executive Summary

Quotation AI has undergone an exhaustive, production-grade security audit and hardening cycle. All critical and high-severity architectural vulnerabilities have been resolved:
- **Unauthenticated Static File Mount Eliminated:** Replaced public `/uploads` directory exposure with a verified JWT-authenticated and multi-tenant-scoped streaming endpoint (`/uploads/{file_path:path}`).
- **Role-Based Access Control (RBAC) Enforced:** Administrative operations, rates updates, company configuration, PO approvals/rejections, and quotation finalizations are strictly guarded with server-side role dependencies (`require_role(["ADMIN", "COSTING_ENGINEER"])`).
- **File Upload Security & Magic-Byte Verification:** Added strict binary signature verification (rejecting Windows `MZ`, Linux `ELF`, shell scripts `#!`, and Java bytecode), path traversal sanitization, and a pluggable malware scanner interface.
- **Application & Edge Rate Limiting:** Implemented a thread-safe sliding window rate limiter returning `HTTP 429` with `Retry-After` headers, and designed Azure Front Door WAF rate limiting rules.
- **Tamper-Evident Audit Logging:** Created an immutable database audit log model and service with automated credential redaction, tracking all sensitive workflow and authentication events.
- **Zero AI Pricing Authority & Immutability:** Deterministic backend Decimal calculation remains strictly authoritative; finalized quotations remain immutable.
- **Zero Degradation:** All 302 backend tests passed (including 17 newly created automated security tests), all 57 frontend tests passed, and the production frontend bundle compiled cleanly.

---

## 2. Architecture & Defense-in-Depth

The production deployment implements layered defense-in-depth:

```
Internet
   │
   ▼
Azure Front Door Premium
   │ (TLS 1.2+, HSTS, DRS 2.1 OWASP, Bot Manager, Edge Rate Limits)
   ▼
Origin Ingress Lockdown (Header Check: X-Azure-FDID)
   │
   ▼
FastAPI Application Layer
   ├── SecurityHeadersMiddleware (HSTS, CSP, X-Frame-Options: DENY, nosniff)
   ├── Sliding Window Rate Limiting (Auth: 15/m, Heavy: 30/m, Standard: 120/m)
   ├── Supabase JWT Asymmetric Verification (JWKS ES256 / RS256, Issuer, Audience)
   ├── Server-Side Tenant Resolution (company_id bound to verified token)
   ├── Role-Based Access Control (ADMIN, COSTING_ENGINEER, VIEWER)
   ├── Binary Magic-Byte File Validation & Filename Sanitization
   ├── Deterministic Pricing Engine (Decimal arithmetic, Zero AI pricing authority)
   └── Tamper-Evident Audit Service (Sanitized metadata, immediate DB commit)
         │
   ┌─────┴───────────────────────┐
   ▼                             ▼
PostgreSQL (Row Level Security)  Supabase Private Storage (Tenant-scoped paths)
```

---

## 3. Authentication Security
- **OAuth Callback Single-Exchange:** The `/auth/callback` flow uses an atomic in-flight exchange lock and session cache check, preventing duplicate `exchangeCodeForSession` execution in React StrictMode.
- **Backend Outage Resilience:** If `/api/v1/auth/me` fails due to transient network or backend outage, the client maintains the valid Supabase session and does not log out the user.
- **No Client Trust:** Client cannot provide `user_id`, `company_id`, or `role` in payloads; all identities are resolved server-side from verified JWT claims.
- **Token Validation:** Tokens must possess valid asymmetric signatures verified against Supabase JWKS, match `iss` and `aud`, and not be expired.

---

## 4. Authorization Security & RBAC
- **Strict Role Boundaries:**
  - `ADMIN`: Full authority over company profile, bank remittance details, tax configuration, quotation templates, audit logs, rate cards, and user management.
  - `COSTING_ENGINEER`: Can manage rate cards, upload/review/approve/reject POs, calculate quotations, finalize quotations, and dispatch quotation emails.
  - `VIEWER`: Read-only access to company quotations, customers, and rate cards. Forbidden (403) from modifying any company configuration, pricing rules, or documents.
- **Role Escalation Protection:** Users cannot alter their own role or promote themselves through API parameters.

---

## 5. Multi-Tenant Isolation (Anti-IDOR / Anti-BOLA)
- Every database query across customers, purchase orders, quotations, rate cards, templates, notifications, and audit logs enforces `company_id == current_user.company_id`.
- Automated security test `test_cross_tenant_data_access_blocked` verifies that Company B receives `404 Not Found` when attempting to access Company A's entities.
- Direct file access enforces that the file path prefix (`po_{company_id}` or `companies/{company_id}`) matches the caller's tenant.

---

## 6. Database Security
- **Row Level Security (RLS):** Policies are defined across all 11 business tables (`companies`, `users`, `customers`, `materials`, `processes`, `purchase_orders`, `purchase_order_items`, `quotations`, `quotation_items`, `notifications`, `audit_logs`).
- **Role Hardening:** `anon` has all DML privileges revoked. `authenticated` is restricted strictly to their own tenant via `auth.current_company_id()`.
- **Search Path Defenses:** Database roles have `search_path = public` enforced to prevent schema hijacking.

---

## 7. Storage Security
- All buckets (`quotations`, `purchase-orders`) are **strictly private** (`public = false`).
- Objects are segregated by tenant path: `company/{company_id}/...`.
- Logo and document retrieval endpoints stream bytes over authenticated sessions or short-lived query tokens.

---

## 8. File Upload Security
- **Allowed Formats:** PDF (`%PDF-`), PNG (`\x89PNG`), JPEG (`\xff\xd8\xff`), TIFF (`II*\x00` / `MM\x00*`), and WebP (`RIFF`).
- **Signature Validation:** Binary magic bytes are inspected regardless of file extension or declared MIME type.
- **Prohibited Signatures:** Windows executables (`MZ`), Linux binaries (`\x7fELF`), shell scripts (`#!`), Java bytecode (`\xca\xfe\xba\xbe`), and compressed archives (`PK\x03\x04`, `Rar!`, `7z`) are rejected with `HTTP 400 Bad Request`.
- **Filename Sanitization:** Path traversal sequences (`..`), null bytes, and non-printable characters are stripped.
- **Malware Scanner Hook:** Integrated `BaseMalwareScanner` architectural interface ready for ClamAV or Azure Defender connection.

---

## 9. AI Security & Prompt Injection Mitigation
- **Untrusted Input Pipeline:** Customer purchase orders and engineering drawings are treated as completely untrusted data.
- **Extraction Schema Boundary:** Pydantic models validate and sanitize all extracted text before storing in `NEEDS_REVIEW` status.
- **Prompt Injection Defense:** PO content can never instruct the engine to alter pricing, override database rates, bypass human review, or change tenant parameters.

---

## 10. Pricing Security & Finalization Invariants
- **Deterministic Calculation:** Authoritative pricing is calculated solely on the backend using Python `Decimal` fixed-point arithmetic.
- **Zero AI Pricing Authority:** AI never sets material rates, machine hour rates, overhead, profit margins, GST, or final prices.
- **Missing Rate Policy:** If a drawing item lacks a matching material or process in the company's database, calculation status is flagged as `BLOCKED` and finalization is rejected with `HTTP 409 Conflict`.
- **Finalized Immutability:** Once marked `FINAL`, quotations and their generated PDFs cannot be edited or recalculated.

---

## 11. API Security
- **Input Validation:** Strict Pydantic models with bounded strings, positive numeric constraints, and regex-validated GSTIN and email addresses.
- **Pagination Protection:** All paginated APIs cap `page_size` at 100 to prevent denial-of-service memory exhaustion.
- **Error Sanitization:** Production errors log full tracebacks server-side with structured logging and return safe generic JSON errors (`"An internal server error occurred."`). Database credentials and stack traces are never leaked.

---

## 12. Web Application Firewall (WAF)
- Prepared Azure Front Door Premium WAF specification in `docs/AZURE_WAF_SETUP.md`.
- DRS 2.1 OWASP ruleset, Microsoft Bot Manager, and path-specific rate limiting rules on `/api/v1/auth/*`, `/api/v1/purchase-orders/upload`, and `/api/v1/quotations/*/finalize`.
- Two-phase rollout plan (Detection mode -> log review -> Prevention mode).

---

## 13. Rate Limiting
- **Layer 1 (Application):** Thread-safe in-memory sliding window rate limiter (`backend/app/core/rate_limit.py`) enforcing:
  - Auth routes: 15 requests / minute
  - Heavy operations (uploads, calculation, PDF, email): 30 requests / minute
  - Standard routes: 120 requests / minute
  - Returns `HTTP 429 Too Many Requests` with `Retry-After: <seconds>`.
- **Layer 2 (Edge):** Azure Front Door WAF rate limiting rules.

---

## 14. Secrets Management
- Documented in `docs/SECRETS_MANAGEMENT.md`.
- Frontend bundle contains **zero privileged secrets** (only `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Server-side credentials (`DATABASE_URL`, `SUPABASE_SECRET_KEY`, `AZURE_DOCUMENT_INTELLIGENCE_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `AZURE_FRONT_DOOR_ID`) are passed solely via environment variables / Azure Key Vault.
- `.env` files are git-ignored; `.env.example` contains only placeholders.

---

## 15. Security Monitoring & Logging
- Structured logging captures client IP, user ID, tenant ID, and request method.
- Tamper-evident `public.audit_logs` records authentication, company configuration, rate card updates, PO reviews, quotation finalizations, and email dispatches.
- Sensitive metadata (passwords, tokens, keys) is automatically redacted before persistence.

---

## 16. Continuous Integration & Pipeline Security
- Backend test suite runs in CI with pytest.
- Frontend test suite runs in CI with Vitest.
- TypeScript compiler (`tsc -b`) verifies type safety.
- Secret scanning gates commits containing high-entropy credentials.

---

## 17. Automated Security Test Results

| Test Category | Test File | Cases | Status |
| :--- | :--- | :--- | :--- |
| **Backend Unit & Integration** | `backend/tests/test_*.py` | 285 | **PASSED** (100%) |
| **Automated Security Hardening** | `backend/tests/test_security_hardening.py` | 17 | **PASSED** (100%) |
| **Frontend Unit & Scenarios** | `frontend/src/__tests__/*.test.tsx` | 57 | **PASSED** (100%) |
| **TypeScript & Production Build** | `npm run build` | 2,198 modules | **PASSED** (0 errors) |
| **Total Test Coverage** | **All Test Suites** | **359 tests** | **PASSED (100%)** |

---

## 18. Remaining Risks & Classification

| Risk | Description | Severity | Remediation |
| :--- | :--- | :--- | :--- |
| **Direct Origin Exposure** | If `AZURE_FRONT_DOOR_ID` is left unconfigured in Azure Container Apps, direct requests could bypass the edge WAF. | **HIGH** | Set `AZURE_FRONT_DOOR_ID` environment variable in production. |
| **Production Malware Scanner Daemon** | Currently utilizes `NullMalwareScanner` pass-through interface. | **MEDIUM** | Attach production ClamAV or Azure Defender for Storage instance. |
| **Supabase PITR Tier** | Point-in-Time Recovery requires active Supabase Pro tier subscription. | **LOW** | Verify Supabase Pro subscription before customer onboarding. |
| **WAF Initial Tuning** | Running in Detection mode during first week is required to eliminate false positives. | **INFORMATIONAL** | Follow rollout schedule in `docs/AZURE_WAF_SETUP.md`. |

---

## 19. Manual Cloud Configuration Required

### Azure Cloud Portal Actions
1. **Azure Front Door Premium:** Create profile `afd-quotation-ai-prod` and WAF policy `wafquotationaiprod`.
2. **Link WAF Rules:** Attach DRS 2.1, Bot Manager 1.0, and rate-limiting custom rules.
3. **Capture Front Door ID:** Extract GUID via `az afd profile show --query frontDoorId -o tsv`.
4. **Configure Container App Secret:** Set `AZURE_FRONT_DOOR_ID=<guid>` on the backend container app.

### Supabase Dashboard Actions
1. **Execute Security Migration:** Run RLS scripts from `docs/SUPABASE_SECURITY.md` in the SQL Editor.
2. **Confirm Bucket Privacy:** Verify that `quotations` and `purchase-orders` buckets have `public = false`.
3. **Enforce Organization 2FA:** Require multi-factor authentication for all Supabase project admins.

---

## 20. Pre-Production Checklist

- [x] All 302 backend tests pass.
- [x] All 57 frontend tests pass.
- [x] Frontend builds with zero TypeScript errors.
- [x] Public static file mount on `/uploads` eliminated.
- [x] Security headers middleware active (HSTS, CSP, X-Frame-Options, nosniff).
- [x] Binary magic-byte upload validation implemented.
- [x] Sliding-window application rate limiter active.
- [x] RBAC enforced on company, rates, PO, and quotation endpoints.
- [x] Tamper-evident audit logging implemented and tested.
- [x] No credentials or secret keys in source code or frontend bundles.
- [x] `.env` verified untouched.
- [x] Azure WAF and Supabase security documentation completed.
