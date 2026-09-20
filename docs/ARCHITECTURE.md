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
ReportLab PDF Generator (backend/app/services/pdf/quotation_pdf_service.py)
      ↓
Downloadable A4 Manufacturing Quotation Document
```

> [!CRITICAL]
> **Presentation-Only Invariant for PDF Generation**:
> **PDF generation never recalculates prices.**
> The PDF generator is presentation-only. It reads already-calculated, persisted commercial values from `Quotation` and `QuotationItem` records and renders them into an A4 industrial layout. There is exactly one pricing source of truth: `CalculationService`. No pricing formulas, GST math, or rate lookups are duplicated in the PDF service.


---

## 4. Collaborative Development Division

- **Developer 1 (Backend)**: Works inside `backend/`. Responsible for FastAPI routes, database models/migrations, JWKS auth, pricing calculations, backend tests, and future document extractors.
- **Developer 2 (Frontend)**: Works inside `frontend/`. Responsible for React UI components, Stitch Industrial Precision aesthetics, React Router navigation, TanStack Query data fetching, and Zod form validation.
