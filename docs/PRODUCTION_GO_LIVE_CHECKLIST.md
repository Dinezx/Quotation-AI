# Quotation AI — Production Go-Live Checklist & Deployment Manual

**Document Version:** 4.8-PROD  
**Target Environment:** Staging & Production Azure Container Apps / Managed Kubernetes  
**Audience:** DevOps Engineers, Lead Site Reliability Engineers (SRE), Technical Leads  
**Classification:** Operational Guide

---

## 1. Required Deployment Environment Variables

Configure these variables exclusively through your secure cloud secrets provider (e.g., Azure Key Vault, Azure Container Apps Secrets, or AWS Secrets Manager). **Never commit real credentials to `.env` or source control.**

### Backend Service Environment Variables (`quotation-ai-backend`)

| Variable Name | Required | Example / Format | Purpose |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql+psycopg2://<user>:<pwd>@<host>:5432/<dbname>` | Primary multi-tenant relational database connection |
| `SUPABASE_URL` | **Yes** | `https://<project-ref>.supabase.co` | Supabase platform URL for auth & object storage |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | `eyJhbGci...` (Secret) | Server-side administrative token for PDF object storage |
| `SUPABASE_JWT_ISSUER` | **Yes** | `https://<project-ref>.supabase.co/auth/v1` | OpenID Connect / JWKS issuer URL |
| `SUPABASE_JWT_AUDIENCE` | **Yes** | `authenticated` | Expected audience claim in JWT tokens |
| `AZURE_DOC_INTEL_ENDPOINT` | **Yes** | `https://<resource-name>.cognitiveservices.azure.com/` | Azure Document Intelligence endpoint for geometric OCR |
| `AZURE_DOC_INTEL_KEY` | **Yes** | `<32-character-hex-key>` (Secret) | Azure Document Intelligence API key |
| `GEMINI_API_KEY` | **Yes** | `AIzaSy...` (Secret) | Google Gemini 2.5 Flash API key for PO normalization |
| `PO_EXTRACTION_PROVIDER` | **Yes** | `azure` | OCR Engine (`azure` in production; `mock` for local tests) |
| `PO_NORMALIZATION_PROVIDER` | **Yes** | `gemini` | Normalization Engine (`gemini` in production; `mock` for tests) |
| `RESEND_API_KEY` | **Yes** | `re_123456789...` (Secret) | Transactional email provider API key |
| `RESEND_FROM_EMAIL` | **Yes** | `orders@yourdomain.com` | Verified enterprise sender email |
| `CORS_ORIGINS` | **Yes** | `https://quotation-ai.yourdomain.com` | Comma-delimited list of authorized frontend origins |
| `ENVIRONMENT` | **Yes** | `production` / `staging` | Runtime mode (`production` disables debug endpoints) |
| `PORT` | **Yes** | `8000` | HTTP listening port for container ingress |

### Frontend Service Environment Variables (`quotation-ai-frontend`)

| Variable Name | Required | Example / Format | Purpose |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | `https://api.quotation-ai.yourdomain.com/api/v1` | Backend REST API endpoint |
| `VITE_SUPABASE_URL` | **Yes** | `https://<project-ref>.supabase.co` | Supabase client URL for web session hydration |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | `eyJhbGciOi...` | Public client anonymous key for browser auth |

---

## 2. Database Schema Migration Execution & Verification

All relational schema changes are strictly governed by Alembic. Never run manual `CREATE TABLE` or raw SQL mutations in production.

### Step 1: Pre-Migration Check
Verify current database revision:
```bash
cd backend
python -m alembic current
```

### Step 2: Apply Migrations to Head
Execute all pending schema updates:
```bash
python -m alembic upgrade head
```

### Step 3: Verify Migration State
Confirm the database is synchronized with the latest head:
```bash
python -m alembic heads
# Expected Output: c3d4e5f6a7b8 (head)
python -m alembic current
# Expected Output: c3d4e5f6a7b8 (head)
```

---

## 3. Azure Cloud Deployment Architecture & Execution

The production stack is deployed on Azure Container Apps using Bicep infrastructure-as-code.

### Automated Azure Deployment Script
Execute `azure/deploy.sh` with your Azure credentials:
```bash
chmod +x azure/deploy.sh
./azure/deploy.sh rg-quotation-ai-prod eastus acrquotationaiprod
```

### Script Execution Workflow:
1. Provisions Azure Resource Group (`rg-quotation-ai-prod`).
2. Configures Azure Container Registry (`acrquotationaiprod`).
3. Builds and pushes `quotation-ai-backend:latest` using `backend/Dockerfile`.
4. Builds and pushes `quotation-ai-frontend:latest` using `frontend/Dockerfile` and `frontend/nginx.conf`.
5. Deploys container environment using `azure/container-app.bicep` with CPU/memory quotas, secure secrets injection, and health probes (`/health/ready`).

---

## 4. Staging & Production Smoke Test Procedure

Run this sequence immediately following deployment:

1. **Liveness & Readiness Health Checks:**
   ```bash
   curl -f -s https://<backend-fqdn>/health/ready | jq .
   # Expected Output: {"status":"ready","database":"connected","version":"4.8"}
   ```
2. **Frontend Availability:**
   ```bash
   curl -I https://<frontend-fqdn>/
   # Expected Output: HTTP/1.1 200 OK
   ```
3. **Automated End-to-End Pilot Simulation:**
   Execute the automated staging suite against the deployed backend:
   ```bash
   python -m pytest backend/tests/test_customer_pilot_simulation.py -v
   ```
4. **Interactive Browser Verification:**
   - Log in with corporate credentials.
   - Navigate to `/dashboard` and verify real-time metric rendering.
   - Upload `sample_manufacturing_purchase_order.pdf` on `/upload`.
   - Complete item review and approve on `/review/:poId`.
   - Calculate costing on `/calculation`.
   - Finalize quotation on `/quotation/:quoteId` and verify SHA-256 seal.
   - Download the generated PDF and inspect header, bank details, and amount in words.

---

## 5. Rollback Procedures

If critical defects or telemetry regressions are detected post-deployment:

### Container Revision Rollback (Zero Downtime)
Azure Container Apps maintains revision history. Revert traffic to the previous healthy revision:
```bash
# 1. List revisions
az containerapp revision list \
  --name quotation-ai-backend \
  --resource-group rg-quotation-ai-prod \
  --output table

# 2. Shift 100% traffic to previous stable revision
az containerapp ingress traffic set \
  --name quotation-ai-backend \
  --resource-group rg-quotation-ai-prod \
  --revision-weight <previous-healthy-revision>=100
```

### Database Migration Rollback
If a schema migration must be rolled back:
```bash
cd backend
# Rollback one migration step:
python -m alembic downgrade -1

# Or rollback to a specific revision:
python -m alembic downgrade <previous-revision-id>
```

---

## 6. Known Operational Limitations & Guardrails

1. **Maximum File Size:** PO file uploads are limited to **25 MB** per document.
2. **Supported Document Formats:** `.pdf`, `.png`, `.jpg`, `.jpeg`, `.xlsx`, `.csv`. Encrypted or password-protected PDFs must be decrypted prior to upload.
3. **Mandatory Rate Matching:** Pricing is strictly deterministic. The engine **never** invents, extrapolates, or hallucinates rates. Unmapped metallurgy grades or machining processes block quotation generation until configured in Rate Master.
4. **Quotation Immutability:** Finalized quotations (`status == 'FINAL'`) and their generated PDFs are cryptographically sealed with SHA-256. They cannot be edited, recalculated, or overwritten. Any commercial renegotiation requires creating a revised quotation version.
5. **Rate Limiting:** Ingress endpoints enforce a threshold of 100 requests per minute per IP to protect OCR and LLM normalization pipelines.
