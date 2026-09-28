# Quotation AI — Production B2B SaaS Platform

Enterprise B2B SaaS platform for precision manufacturing machine shops, CNC milling/turning centers, and sheet-metal fabrication MSMEs. Automates customer Purchase Order (PO) intake, multimodal optical extraction, deterministic rate matching, Python Decimal pricing calculations, cryptographic quotation finalization, and customer PDF dispatch.

---

## 1. System Architecture & Core Principles

```
Customer PO (PDF/Scan)
         │
         ▼
[Azure Document Intelligence] (Layout & Key-Value OCR)
         │
         ▼
[Google Gemini 3.6 Flash] (Normalization & Field Extraction ONLY)
         │
         ▼
[Human PO Review & Approval] ──► (Add/Correct Tolerances & Material Grades)
         │
         ▼
[Database Rate Matching] ──────► (Material, Machine Hour, Treatment, Overhead Cards)
         │
         ▼
[Deterministic Python Decimal Engine] (Zero Float Drift, Zero AI Hallucination)
         │
         ▼
[Quotation Draft & Calculation Review] (Line Item Schedule, Margins, CGST/SGST/IGST)
         │
         ▼
[Quotation Finalization] ──────► (SHA-256 Digest Sealed, Status=FINAL, Strictly Immutable)
         │
         ▼
[ReportLab PDF Engine] ────────► (Official PDF Uploaded to Private Supabase Storage Bucket)
         │
         ▼
[Email Dispatch via Resend] ───► (Recipient Resolved from Verified Tenant Customer Record)
         │
         ▼
[Audit Trail & Quotation History] (Immutable Tracking of All Commercial Actions)
```

### Non-Negotiable Architecture Invariants

1. **AI is Limited to Extraction & Normalization**: The Gemini model processes raw OCR text and drawing specifications. AI is **NEVER** permitted to calculate, invent, or approximate prices.
2. **Authoritative Database Rate Matching**: 100% of material costs, machining hourly rates, surface treatment tariffs, scrap credits, and overhead multipliers must match active database rate cards.
3. **Deterministic Python Decimal Calculation Engine**: All commercial arithmetic (subtotal, overhead, margins, taxes, round-offs) is performed using Python's `Decimal` type with `ROUND_HALF_UP` precision. The frontend client **NEVER** calculates or modifies prices.
4. **Human Review Required**: Every uploaded Purchase Order requires human review and verification before proceeding to costing.
5. **Cryptographic Quotation Immutability**: Once finalized, quotations receive an official timestamp, authorized signatory, and a SHA-256 cryptographic digest of the generated PDF. Sealed quotations **CANNOT** be recalculated, mutated, or deleted (HTTP 409 Conflict).
6. **Strict Multi-Tenant Isolation**: Tenant identity (`company_id`) is derived strictly from the authenticated Supabase session. Frontend-supplied company IDs are never trusted. All database queries enforce tenant scoping.
7. **Protected Credentials**: Zero secrets or credentials are hardcoded or committed to git. `.env` files are strictly protected.

---

## 2. Technology Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (PostgreSQL / Supabase), Alembic, Pydantic v2, ReportLab, PyPDF.
- **Frontend**: React 19, TypeScript 5.7, Vite 6, Tailwind CSS, TanStack Query v5, Supabase Auth Client, Lucide Icons.
- **AI & Document Processing**: Azure Document Intelligence (`prebuilt-document`), Google Gemini API (`gemini-3.6-flash`).
- **Storage & Infrastructure**: Supabase Storage (Private `quotation-pdfs` bucket), Docker, Docker Compose, Azure Container Apps (Bicep IaC).
- **Communication**: Resend API for transactional email dispatch with PDF attachments.
- **Testing**: Pytest (257 regression tests), Vitest (React unit tests), Playwright (E2E browser tests).

---

## 3. Local Development Setup

### Prerequisites
- Python 3.12+
- Node.js 20+ and npm 10+
- PostgreSQL database (or Supabase project)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Configure environment (do NOT overwrite production .env)
# Create backend/.env with your Supabase, Azure, Gemini, and Resend credentials
uvicorn app.main:app --reload --port 8000
```
- API Documentation: `http://localhost:8000/docs`
- Health/Readiness Check: `http://localhost:8000/health/ready`

### 2. Frontend Setup
```bash
cd frontend
npm install

# Start Vite local development server
npm run dev
```
- Web Application: `http://localhost:5173`
- Pre-seeded Test User: `r.deshmukh@bharatprecision.co.in` (`comp-bpe-pune`)

---

## 4. Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@host:5432/dbname` |
| `SUPABASE_URL` | Supabase project URL | Yes | `https://xyzcompany.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) | Yes | `eyJhbGciOi...` |
| `SUPABASE_JWT_SECRET` | Supabase JWT verification secret | Yes | `your-jwt-secret` |
| `SUPABASE_STORAGE_BUCKET` | Private storage bucket name | No | `quotation-pdfs` (default) |
| `AZURE_DOC_INTEL_ENDPOINT` | Azure Document Intelligence endpoint | Yes | `https://<region>.api.cognitive.microsoft.com/` |
| `AZURE_DOC_INTEL_KEY` | Azure Document Intelligence API key | Yes | `secret-key` |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | `AIzaSy...` |
| `RESEND_API_KEY` | Resend API key for transactional emails | Yes | `re_123456...` |
| `CORS_ORIGINS` | Comma-separated allowed frontend domains | Yes | `http://localhost:5173,https://app.quotationai.com` |

### Frontend (`frontend/.env`)
| Variable | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `VITE_API_BASE_URL` | Backend REST API endpoint | Yes | `http://localhost:8000/api/v1` |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | `https://xyzcompany.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anonymous client key | Yes | `eyJhbGciOi...` |

---

## 5. Database Migrations

Quotation AI uses Alembic for declarative schema migrations.

```bash
cd backend

# Apply all pending migrations to database HEAD
alembic upgrade head

# Create a new deterministic migration revision
alembic revision --autogenerate -m "add_column_name"

# Downgrade by 1 revision
alembic downgrade -1
```

All migration revisions are idempotent, tenant-safe, and tested for rollback capability.

---

## 6. Authentication & Tenant Isolation Model

1. **Authentication Flow**:
   - The user signs in via `/login` using email/password.
   - Supabase Auth issues a cryptographically signed JWT.
   - The React frontend stores the session securely and injects `Authorization: Bearer <token>` on all requests.
2. **Backend Identity Extraction**:
   - FastAPI dependency `get_current_user` decodes the token using Supabase JWKS / JWT Secret.
   - The database queries the user's active tenant membership (`company_id`).
   - If the user or company is deactivated, access is immediately revoked with HTTP 403 Forbidden.
3. **Tenant Enclosure**:
   - All models (`Customer`, `PurchaseOrder`, `RateMaster`, `Quotation`) have a non-nullable `company_id` foreign key.
   - Every SELECT, UPDATE, and DELETE query includes `WHERE company_id = :authenticated_company_id`.
   - Any cross-tenant data access attempt is blocked with HTTP 404/403 (IDOR prevention).

---

## 7. Testing Suite

### Run All Backend Regression Tests (257 Tests)
```bash
cd backend
python -m pytest tests/ -v
```
Verified test coverage across:
- `test_auth_jwks.py`: Supabase JWT validation & cryptographic signature verification.
- `test_auth_tenancy.py`: Tenant isolation & IDOR prevention.
- `test_azure_extraction.py`: Live Document Intelligence parsing & table extraction.
- `test_gemini_normalization.py`: Semantic normalization & anti-pricing invariants.
- `test_po_review_approval.py`: Human approval workflows & line item tolerance verification.
- `test_rate_matching_calculation.py`: Pure Decimal engine & blocked rate card guards.
- `test_quotation_finalization.py`: Cryptographic SHA-256 seal & immutability locking.
- `test_quotation_pdf.py`: ReportLab professional vector PDF rendering.
- `test_quotation_email.py`: Resend email integration & recipient resolution.
- `test_dashboard_concurrency.py`: Connection pool stability under heavy concurrency.

### Run Frontend Unit Tests
```bash
cd frontend
npm run test:unit
```
Verifies formatting precision (Indian currency, weight, machining hours), blocked rate handling, auth route guards, and quotation immutability seals.

### Run Playwright E2E Tests
```bash
cd frontend
npm run test:e2e
```
Executes complete end-to-end user journeys including login, PO upload, review, blocked rate banners, quotation preview, and finalization immutability.

---

## 8. Docker & Production Deployment

### 1. Docker Compose (Local/Self-Hosted Production)
```bash
# Build and run backend and frontend containers
docker-compose up --build -d

# Verify container health
docker-compose ps
```
The backend includes an automatic readiness probe (`/health/ready`) checking PostgreSQL and storage availability.

### 2. Azure Container Apps Deployment
Quotation AI includes Infrastructure-as-Code templates for deploying directly to Azure Container Apps.

```bash
# Run one-click deployment to Azure
chmod +x ./azure/deploy.sh
./azure/deploy.sh rg-quotation-ai-prod eastus acrquotationai
```
Or deploy using the Azure Bicep template:
```bash
az deployment group create \
  --resource-group rg-quotation-ai-prod \
  --template-file ./azure/container-app.bicep \
  --parameters @azure/parameters.json
```

---

## 9. Customer Demo Walkthrough

Follow this 10-step guide to demonstrate the platform to a precision manufacturing client:

1. **Login (`/login`)**: Sign in with `r.deshmukh@bharatprecision.co.in` to access the Bharat Precision Engineering tenant workspace.
2. **Review Multi-Tenant Dashboard (`/dashboard`)**: Observe live pipeline metrics: Active Quotations, Monthly Revenue Pipeline, Win Rate, and Pending PO Reviews.
3. **Inspect Rate Master (`/rates`)**: Browse pre-configured database rate cards:
   - Materials: IS 2062, EN24T, SS 316L, AL 6061-T6.
   - Machining: VMC 3-Axis (₹850/hr), VMC 4-Axis (₹1,250/hr), CNC Lathe (₹650/hr).
   - Treatments: Anodizing, Black Phosphating, Heat Treatment.
4. **Upload Purchase Order (`/upload`)**: Drag and drop `frontend/public/sample_manufacturing_purchase_order.pdf` (Tata Motors Tier-1 PO).
5. **AI Extraction & OCR**: Observe automated Azure Document Intelligence layout extraction and Gemini field normalization.
6. **Human PO Review (`/review/:poId`)**: Verify part numbers, drawing numbers, quantities, tolerances, and material specifications. Confirm high-confidence items or correct specifications.
7. **Deterministic Calculation (`/calculation?po_id=...`)**: Click "Calculate Costing" — the backend Decimal engine computes raw material cost, machining cycle times, setup hours, scrap credits, overhead, and GST.
   *(Note: If a material rate is missing, observe the structured BLOCKED banner directing to Rate Management).*
8. **Commercial Quotation Preview (`/quotation/:quoteId`)**: Review the generated customer-facing quotation with corporate GSTIN, payment terms, and itemized schedule.
9. **Finalize Quotation**: Click "Finalize Quotation" — the document status transitions to `FINAL`, generating a permanent SHA-256 cryptographic seal. Recalculation is locked permanently.
10. **Dispatch & History (`/quotations`)**:
    - Click "Download Official PDF" to inspect the ReportLab vector document.
    - Click "Dispatch Quotation via Email" to send to the verified customer quotation recipient.
    - View the audit trail in Quotation History.

---

## 10. License

Proprietary B2B SaaS platform for precision manufacturing enterprises. All rights reserved.
