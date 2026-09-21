# Quotation AI — System Architecture

Quotation AI is an enterprise B2B SaaS application engineered for precision engineering machine shops and MSME fabrication plants. It automates intake and analysis of customer Purchase Orders (POs) and calculates deterministic, auditable commercial quotations.

---

## 1. High-Level Monorepo Architecture

```
                                +---------------------------------------------+
                                |               User / Browser                |
                                +---------------------------------------------+
                                                       |
                                        HTTP/HTTPS     |   Supabase Auth Session
                                                       v
                                +---------------------------------------------+
                                |          Frontend (React 19 + Vite)         |
                                |     - Stitch "Industrial Precision" UI      |
                                |     - TanStack Query + React Hook Form      |
                                |     - Axios with Bearer Interceptor         |
                                +---------------------------------------------+
                                                       |
                                        REST API       |   Bearer <JWT>
                                                       v
                                +---------------------------------------------+
                                |             FastAPI Application             |
                                |  +---------------------------------------+  |
                                |  | Asymmetric JWKS Token Verification    |  |
                                |  | (ES256, auto key-rotation via kid)    |  |
                                |  +---------------------------------------+  |
                                |                      |                       |
                                |  +---------------------------------------+  |
                                |  | Server-Side Multi-Tenant Isolation    |  |
                                |  | (company_id derived from user/token)  |  |
                                |  +---------------------------------------+  |
                                |                      |                       |
                                |  +---------------------------------------+  |
                                |  | Deterministic Python Pricing Engine   |  |
                                |  | (Decimal, ROUND_HALF_UP, GST 18%)     |  |
                                |  +---------------------------------------+  |
                                +---------------------------------------------+
                                                       |
                                          SQLAlchemy   |   Session Pooler (:6543)
                                                       v
                                +---------------------------------------------+
                                |        Supabase PostgreSQL Database         |
                                |     - Multi-tenant relational schema         |
                                |     - Companies, Users, Customers, Rates    |
                                |     - Purchase Orders & Quotations          |
                                +---------------------------------------------+
```

---

## 2. Frontend / Backend Boundary & Data Flow

> [!IMPORTANT]
> **Zero Direct Database Access**:
> The frontend never communicates directly with the database. All customer data, manufacturer rate cards, PO line items, and calculations pass strictly through the FastAPI REST API.

```
React Component
      ↓
TanStack Query Hook (usePurchaseOrders / useQuotations / useRates)
      ↓
Domain API Client (src/api/purchaseOrderApi.ts)
      ↓
Axios Instance (src/api/apiClient.ts) [Appends Bearer <token>]
      ↓
FastAPI Route Handler (app/api/routes/purchase_orders.py)
      ↓
FastAPI Dependency (app/api/dependencies/auth.py) [Verifies JWKS + extracts company_id]
      ↓
SQLAlchemy ORM (app/models/purchase_order.py)
      ↓
Supabase PostgreSQL (Enforcing company_id isolation)
```

---

## 3. Pricing Calculation & Quotation PDF Pipeline

Pricing is strictly deterministic and auditable. AI does not set final prices.

```
Customer PO Upload
      ↓
Extracted / Human-Verified Geometry (Billet Weight, Finished Weight, Scrap Weight)
      ↓
Manufacturer Database Rates (Base Material ₹/kg, Scrap Credit ₹/kg, Machine ₹/hr, Setup ₹)
      ↓
Deterministic Calculation Engine (backend/app/services/calculation/calculation_service.py)
  • Net Material = (Gross Wt × Base Rate) - (Scrap Wt × Scrap Rate)
  • Process Cost = (Machining Hrs × Machine Rate) + Setup Cost
  • Subtotal = Net Material + Process Cost
  • Overhead Amount = Subtotal × Overhead %
  • Profit Amount = (Subtotal + Overhead) × Profit %
  • Taxable Total = Subtotal + Overhead + Profit
  • Statutory GST = 18% (CGST 9% + SGST 9% OR IGST 18%)
  • Final Total = Taxable Total + GST (Rounded half up)
      ↓
Quotation & QuotationItem Persistence (Status: DRAFT)
      ↓
Quotation Preview & Human Review (Metadata editing; pricing fields strictly read-only)
      ↓
Human Finalization Gate (POST /quotations/{id}/finalize)
      ↓
Official PDF Generation (Presentation-only via ReportLab)
      ↓
PDF Storage in Supabase Private Bucket (companies/{company_id}/quotations/{id}/{number}.pdf)
      ↓
Immutable FINAL Quotation Record + SHA-256 Document Integrity Hash
      ↓
Quotation History Archive & Secure Document Download
```

> [!CRITICAL]
> **Presentation-Only Invariant for PDF Generation**:
> **PDF generation never recalculates prices.**
> The PDF generator is presentation-only. It reads already-calculated, persisted commercial values from `Quotation` and `QuotationItem` records and renders them into an A4 industrial layout. There is exactly one pricing source of truth: `CalculationService`. No pricing formulas, GST math, or rate lookups are duplicated in the PDF service.

---

## 4. Quotation Lifecycle & Immutability Rules

The quotation lifecycle transitions through two strict states:

### State 1: `DRAFT`
- Quotation created from approved PO calculation.
- Commercial metadata (delivery terms, payment terms, validity date, general notes, prepared by, authorized signatory) can be modified via `PUT /quotations/{id}`.
- Line-item calculated pricing is read-only.
- Presentation-only PDF can be previewed/generated dynamically on the fly.
- User can finalize after human review.

### State 2: `FINAL`
- Triggered exclusively by user action on `POST /quotations/{id}/finalize`.
- **Absolute Immutability**: Once `status == 'FINAL'`, the quotation represents an official, binding commercial offer.
- `PUT /quotations/{id}` returns `409 Conflict` ("Finalized quotations cannot be modified.").
- `POST /quotations/{id}/calculate` returns `409 Conflict` ("Finalized quotations cannot be modified or recalculated.").
- Repeat finalization returns `409 Conflict` ("Quotation is already finalized.").
- The official ReportLab PDF generated at finalization is persisted to Supabase Storage.
- Subsequent downloads via `GET /quotations/{id}/pdf` retrieve the stored official PDF directly from storage. The server never silently regenerates the document.
- If the stored PDF is missing from storage, the server returns a controlled `409 Conflict` ("Final quotation PDF is unavailable.") rather than altering the quotation.

---

## 5. Storage Architecture & Tenant Isolation

Quotation PDFs contain sensitive commercial pricing and customer data.

- **Storage Provider**: Supabase Storage private bucket `quotation-pdfs` (with abstract `StorageService` interface allowing `LocalStorageService` / `FakeStorageService` for offline and automated testing).
- **Tenant Path Layout**:
  ```
  companies/{company_id}/quotations/{quotation_id}/{quotation_number}.pdf
  ```
  `company_id` is strictly extracted from the authenticated user's JWT and database identity server-side; input from the client is never trusted.
- **Document Integrity**: A SHA-256 hash (`pdf_sha256`) of the generated PDF bytes is computed and stored alongside the quotation record for cryptographic verification of downloaded documents.
- **Atomic Rollback Guard**: If database persistence fails after file upload, the uploaded object is cleaned up immediately to prevent orphaned storage objects.

---

## 6. Quotation History Architecture

Quotation history provides plant management with a searchable, paginated commercial archive.

- **Server-Side Pagination**: `GET /quotations?page=1&page_size=20` returns `{ items, total, page, page_size }`, preventing excessive memory overhead in the browser.
- **Server-Side Filtering**: Supports case-insensitive substring search across `quotation_number`, `Customer.name`, and `PurchaseOrder.po_number`, along with status filtering (`ALL`, `FINAL`, `DRAFT`).
- **Server-Side Sorting**: Quotations are consistently ordered newest first (`Quotation.created_at.desc()`).
- **Multi-Tenant Protection**: Queries enforce `Quotation.company_id == current_user.company_id`. Cross-tenant record discovery or download is blocked.

---

## 6.1. Rate Cards, Pricing Rules & Historical Immutability

The Rate & Pricing Master subsystem serves as the single authoritative commercial source of truth feeding the deterministic calculation engine:

```
Purchase Order (Approved)
          ↓
Tenant-Scoped Rate Matching (PricingService.match_tenant_rates)
          ↓
Active Rate Verification (is_active == True)
[If missing/inactive: BLOCKED (MATERIAL_RATE_MISSING / PROCESS_RATE_MISSING)]
          ↓
Authoritative Company Pricing Profile (Company.settings: Overhead %, Profit %, GST)
          ↓
Deterministic Decimal Engine (CalculationService)
          ↓
Draft Quotation Persistence
          ↓
Human Finalization (Quotation finalized -> status == 'FINAL')
          ↓
Physical PDF & SHA-256 Storage
```

### Core Architecture Invariants:
1. **Zero AI / LLM Pricing**: AI is strictly forbidden from estimating, suggesting, modifying, or determining pricing rates or markups. Rates are configured directly by authorized plant personnel.
2. **Pure Decimal Precision**: All monetary rates, scrap credit values, overheads, margins, and taxes use `Decimal` arithmetic (`ROUND_HALF_UP`) to prevent floating-point discrepancies.
3. **Single Authoritative Source**: Factory overhead %, profit margin %, and statutory GST rules belong strictly to `Company.settings`. No competing or duplicated pricing configurations exist.
4. **Historical Quotation Immutability**:
   - Master rate changes apply exclusively to **future** calculations.
   - When a material or process rate changes in the database master, existing `FINAL` quotations and stored PDFs **must not and do not change**.
   - The system strictly forbids recalculating, modifying, or regenerating PDFs for finalized quotations.
   - Attempting to recalculate a PO that already has an approved, finalized quotation returns an explicit `409 Conflict`.
5. **Inactive Rate Isolation**: Deactivated materials and processes are excluded from new calculations. Attempting to quote an inactive rate returns a hard `BLOCKED` status, requiring human review.

---

## 7. Email Dispatch Architecture (Resend)

The email dispatch subsystem delivers official finalized quotation documents directly to customers.

```
Frontend (User Confirms Send)
    ↓
POST /api/v1/quotations/{id}/send-email
    ↓
User & Tenant Validation (Active User & Company Ownership)
    ↓
Quotation Status Check (Status must be FINAL)
    ↓
Customer Email Resolution (Derived strictly from Customer record; no frontend override)
    ↓
Retrieve Stored Official PDF from Supabase Storage
    ↓
Cryptographic Verification (Downloaded PDF SHA-256 == quotation.pdf_sha256)
    ↓
Deterministic B2B Email Template Generation (Zero AI / LLM)
    ↓
Dispatch via Resend REST API (or FakeEmailService during tests)
    ↓
Atomic Audit Update (email_status, email_sent_at, email_sent_by, email_recipient)
```

### Core Security & Architecture Guarantees:
1. **Zero Price Recalculation**: Sending an email never recalculates rates, overheads, profits, or taxes.
2. **Authoritative Official PDF**: The email attachment is the exact binary document stored in Supabase Storage. The PDF is never regenerated at dispatch time.
3. **Cryptographic Integrity**: If the stored PDF hash does not match `quotation.pdf_sha256`, the email is aborted with a `409 Conflict`.
4. **Server-Side Recipient Derivation**: The recipient email is strictly read from `customer.email`. Frontend requests cannot redirect delivery to arbitrary email addresses.
5. **Hermetic Test Driver**: Automated tests utilize `FakeEmailService` in-memory mock, guaranteeing no external network calls or real customer emails are sent during CI/CD.

---

## 8. Collaborative Development Division

- **Developer 1 (Backend)**: Works inside `backend/`. Responsible for FastAPI routes, database models/migrations, JWKS auth, pricing calculations, storage & email abstractions, backend tests, and document extractors.
- **Developer 2 (Frontend)**: Works inside `frontend/`. Responsible for React UI components, Stitch Industrial Precision aesthetics, React Router navigation, TanStack Query data fetching, and Zod form validation.
