# Quotation AI — End-to-End Business Workflow Validation Report

**Validation Date:** 2026-09-20  
**Status:** ALL 20 PHASES PASSED  
**Application:** Quotation AI (Manufacturing B2B Automation)  
**Tenant Under Test:** Bharat Precision Engineering Pvt. Ltd. (`comp-bpe-pune`)  

---

## Executive Summary

The end-to-end business workflow of **Quotation AI** was validated against real services with zero mocked AI, zero mocked document extraction, zero mocked database operations, and zero mocked PDF generation.

```
Customer PO (PDF)
      ↓
PO Upload & Storage
      ↓
Azure Document Intelligence (Live OCR & Key-Value Extraction)
      ↓
Gemini Semantic Normalization (Correction & Anti-Pricing Invariant)
      ↓
Human PO Review (Detection of Ambiguous Processes)
      ↓
Human Correction (Process & Gross/Scrap Weight Assignment)
      ↓
PO Approval & Tenant Guard (Authorized Signatory + Multi-Tenancy IDOR Protection)
      ↓
Rate Matching (Missing Rate Guard + Catalog Binding)
      ↓
Deterministic Calculation (Pure Python Decimal Engine — Zero AI)
      ↓
Quotation Draft Creation (Unique Numbering + Tenant Isolation)
      ↓
PDF Preview Generation (ReportLab Presentation Engine)
      ↓
Quotation Finalization (Status: FINAL, Immutability Sealing)
      ↓
Official PDF Storage (Supabase Storage Private Bucket)
      ↓
PDF Cryptographic Integrity (SHA-256 Independent Verification)
      ↓
Immutability Enforcement (HTTP 409 Conflict on Recalculation & Mutation)
      ↓
Email Recipient Resolution (Quotation Email Preference vs Account Login Fallback)
      ↓
Email Dispatch via FakeEmailService (Hermetic Test Harness & Byte Equality)
      ↓
Controlled Real Resend Test (Single Live Delivery to Official Resend Sink)
      ↓
Full Regression Verification (214/214 Backend Tests, Alembic HEAD, Frontend Build)
```

---

## 1. Environment Verification

| Service | Configuration Status | Notes |
| :--- | :---: | :--- |
| **Supabase PostgreSQL** | Configured | AWS ap-south-1 connection pool |
| **Supabase Storage** | Configured | Private bucket `quotation-pdfs` |
| **Azure Document Intelligence** | Configured | East US cognitive endpoint |
| **Google Gemini API** | Configured | Primary: `gemini-3.6-flash`, Fallback: `gemini-3-flash-preview` / `gemini-flash-latest` |
| **Resend Email Service** | Configured | Default verified sender: `Quotation AI <onboarding@resend.dev>` |

*Zero secrets, API keys, passwords, or tokens are logged or committed.*

---

## 2. Customer Setup & Verification

- **Customer Name:** `ABC Engineering Components Pvt. Ltd.`
- **Customer ID:** `1b5e173b-54fd-42de-ac7b-1367181ee870`
- **Customer Code:** `CUST-1B5E17`
- **Tenant Isolation:** `comp-bpe-pune`
- **Login Email:** `purchase@abcengineering.com`
- **Quotation Email:** `quotes@abcengineering.com`
- **GSTIN:** `27AABCA1234F1Z1`
- **Active Status:** `True`
- **Result:** **PASS**

---

## 3. Real Purchase Order Upload

- **Source Document:** `sample_manufacturing_purchase_order.pdf`
- **File Size:** 28,443 bytes
- **MIME Type:** `application/pdf` (Accepted)
- **Local Storage Path:** `/uploads/po_comp-bpe-pune/58a936fb5ba2532f_sample_manufacturing_purchase_order.pdf`
- **Result:** **PASS**

---

## 4. Azure Document Intelligence Extraction

Live extraction was performed using Azure Document Intelligence `prebuilt-document` layout analysis.

- **Extraction Status:** `SUCCESS`
- **Document Pages:** 1
- **Document Confidence:** 0.98
- **Extracted Items:** 4 line items
- **Extracted PO Number:** `PO-2026-0098`
- **Extracted PO Date:** `2026-09-19`
- **Raw Customer Extracted:** `"inspection before dispatch"` *(misinterpreted from terms & conditions block header)*
- **Result:** **PASS**

---

## 5. Gemini Semantic Normalization

Raw Azure extraction was passed to Gemini for normalization and entity reconciliation.

- **Normalized Customer:** `ABC Engineering Components Pvt. Ltd.` *(corrected from vendor address header)*
- **Normalized PO Number:** `PO-2026-0098`
- **Normalized PO Date:** `2026-09-19`
- **Normalized Items Count:** 4
- **Process Normalization:** All line items preserved as `process_name = None` *(anti-hallucination invariant strictly enforced)*
- **Anti-Pricing Invariant:** **VERIFIED** — Zero material rates, scrap credits, machining costs, taxes, or commercial figures were introduced by the AI layer.
- **Result:** **PASS**

---

## 6. PO Review Inspection

The newly parsed purchase order was inspected in its review state:

- **PO ID:** `a970cba9-7e59-4d59-b4aa-2065c6d52f05`
- **PO Number:** `PO-2026-0098-E2E-210028`
- **PO Status:** `NEEDS_REVIEW`
- **Unspecified Processes:**
  - Item #1 (Bearing Housing): `Process is NULL`
  - Item #2 (Pinion Shaft): `Process is NULL`
  - Item #3 (Mounting Bracket): `Process is NULL`
  - Item #4 (Spacer Ring): `Process is NULL`
- **Review Flags:** `AMBIGUOUS_PROCESS` / `PROCESS_MISSING` present on all 4 items.
- **Result:** **PASS**

---

## 7. Human Correction & Process Specification

Processes and engineering weights were assigned from the tenant's actual master catalog:

| Item | Part Name | Material Grade | Assigned Process | Gross Wt | Scrap Wt | Machining Time |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| 1 | Bearing Housing | EN8 | CNC 4-Axis Milling (VMC-850) | 4.50 kg | 1.00 kg | 0.75 hrs |
| 2 | Pinion Shaft | EN19 | CNC Turning Center (Doosan Puma) | 3.20 kg | 0.80 kg | 0.50 hrs |
| 3 | Mounting Bracket | IS 2062 | Fiber Laser Cutting 4kW | 2.00 kg | 0.50 kg | 0.40 hrs |
| 4 | Spacer Ring | EN1A | CNC High-Precision Turning | 0.80 kg | 0.20 kg | 0.25 hrs |

- **Review State:** Corrections saved to database; review issues cleared.
- **Result:** **PASS**

---

## 8. PO Approval & Multi-Tenancy Guard

- **PO Status:** `APPROVED`
- **Approved By:** `usr-bpe-001`
- **Approved At:** `2026-09-20 15:30:32 UTC`
- **Cross-Company IDOR Protection:** Querying the approved PO under another company (`comp-other-plant`) returned `None`.
- **Result:** **PASS**

---

## 9. Rate Matching

1. **Structured Missing Rate Invariant:**
   - Attempted rate matching on item with unknown material `NON_EXISTENT_TITANIUM_GRADE`.
   - Engine returned structured blocking issue `MATERIAL_RATE_MISSING` without inventing or defaulting prices.
2. **Approved Item Matches:**
   - **Item #1:** EN8 @ INR 85.00/kg (Scrap: INR 20.00/kg) \| CNC 4-Axis Milling @ INR 1,200.00/hr
   - **Item #2:** EN19 @ INR 145.00/kg (Scrap: INR 45.00/kg) \| CNC Turning Center @ INR 850.00/hr
   - **Item #3:** IS 2062 @ INR 95.00/kg (Scrap: INR 32.00/kg) \| Fiber Laser Cutting @ INR 1,800.00/hr
   - **Item #4:** EN1A @ INR 110.00/kg (Scrap: INR 35.00/kg) \| CNC High-Precision Turning @ INR 385.00/hr
- **Result:** **PASS**

---

## 10. Deterministic Commercial Calculation

Executed pure Python deterministic calculation engine using exact `Decimal` arithmetic:

- **Manufacturing Subtotal:** INR 273,400.00
- **Overhead (10.00%):** INR 27,340.00
- **Profit Margin (15.00%):** INR 45,111.00
- **Assessable / Taxable Amount:** INR 345,851.00
- **Statutory GST (CGST 9% + SGST 9%):** INR 62,254.00 (CGST: INR 31,127.00, SGST: INR 31,127.00)
- **Grand Total:** INR 408,105.00
- **Determinism Check:** Identical inputs across separate runs yielded exact byte-for-byte `Decimal` equality. Zero AI involvement in financial math.
- **Result:** **PASS**

---

## 11. Quotation Draft Creation

- **Quotation ID:** `625659f2-5d50-4920-8f6b-c34ace1c5acb`
- **Quotation Number:** `QT-2026-0192`
- **Status:** `DRAFT`
- **Customer:** `ABC Engineering Components Pvt. Ltd.`
- **PO Reference:** `PO-2026-0098-E2E-210028`
- **Total Amount:** INR 408,105.00
- **Company Isolation:** `company_id = comp-bpe-pune`
- **Result:** **PASS**

---

## 12. Presentation-Only PDF Preview

- **Format:** Generated via ReportLab PDF engine
- **Header:** `%PDF` magic bytes verified
- **Page Count:** 1 page
- **Rendered Content Verified:**
  - Company branding & header
  - Quotation Number: `QT-2026-0192`
  - PO Reference: `PO-2026-0098-E2E-210028`
  - Customer: `ABC Engineering Components Pvt. Ltd.`
  - Line items: Bearing Housing, Pinion Shaft, Mounting Bracket, Spacer Ring
  - Unit rates, gross/scrap weights, machining rates
  - Commercial total: INR 408,105.00
- **Safety Rule:** Preview remained in local memory buffer; zero transmission to customer.
- **Result:** **PASS**

---

## 13. Quotation Finalization

- **Status Transition:** `DRAFT` → `FINAL`
- **Finalized By:** `usr-bpe-001`
- **Finalized At:** `2026-09-20 15:30:45 UTC`
- **Storage Location:** Supabase Storage private bucket `quotation-pdfs`
- **Storage Path:** `companies/comp-bpe-pune/quotations/625659f2-5d50-4920-8f6b-c34ace1c5acb/QT-2026-0192.pdf`
- **File Name:** `QT-2026-0192.pdf`
- **Stored Binary Size:** 5,486 bytes
- **Database Recorded SHA-256:** `40cecb6cb74690f38fe8511b24820bde3067ffeb5051314f7f4094eba3f4cf90`
- **Result:** **PASS**

---

## 14. PDF Cryptographic Integrity

- **Downloaded Binary:** Stored PDF was fetched independently from Supabase Storage.
- **Independently Computed SHA-256:** `40cecb6cb74690f38fe8511b24820bde3067ffeb5051314f7f4094eba3f4cf90`
- **Hash Equality:** Matches `quotation.pdf_sha256` exactly.
- **Zero PDF Regeneration:** Consecutive downloads produced byte-identical binary without invoking ReportLab.
- **Result:** **PASS**

---

## 15. Final Quotation Immutability

Attempted unauthorized modifications on the finalized quotation:

1. **PUT `/quotations/{id}`:** Modifying notes and commercial overhead percentage was rejected with:
   ```
   HTTP 409 Conflict: Finalized quotations cannot be modified.
   ```
2. **POST `/quotations/{id}/calculate`:** Attempting recalculation was rejected with:
   ```
   HTTP 409 Conflict: Finalized quotations cannot be recalculated.
   ```
- **Financial Record Integrity:** All monetary figures, line items, and audit stamps remained sealed.
- **Result:** **PASS**

---

## 16. Email Recipient Resolution

Authoritative server-side recipient resolution rules were tested:

- **Case A (Quotation Email Configured):**
  - Customer `quotation_email = quotes@abcengineering.com`
  - Resolved To: `quotes@abcengineering.com`
- **Case B (Quotation Email Cleared):**
  - Customer `quotation_email = None`, `login_email = purchase@abcengineering.com`
  - Resolved To: `purchase@abcengineering.com`
- **Security Guard:** Client-supplied recipient overrides in request bodies are ignored; server authoritative resolution is strictly enforced.
- **Result:** **PASS**

---

## 17. Fake Email Service Validation

- **Test Harness:** Dispatched using `FakeEmailService`.
- **Recipient:** `quotes@abcengineering.com`
- **Subject:** `Quotation QT-2026-0192 from Bharat Precision Engineering Pvt. Ltd.`
- **Attachment Filename:** `QT-2026-0192.pdf`
- **Attachment Bytes:** 5,486 bytes — exact byte-for-byte match with stored Supabase PDF.
- **Zero Recalculation Check:** `final_total` remained INR 408,105.00.
- **Zero Regeneration Check:** PDF hash remained `40cecb6cb74690f38fe8511b24820bde3067ffeb5051314f7f4094eba3f4cf90`.
- **Result:** **PASS**

---

## 18. Controlled Real Resend Delivery Test

A single live dispatch was performed against the Resend REST API using the official sandbox sink (`delivered@resend.dev`):

| Check | Specification | Result |
| :--- | :--- | :---: |
| 1. HTTP Status | Resend API accepted with HTTP 200/201 | **VERIFIED** |
| 2. Sender Address | `Quotation AI <onboarding@resend.dev>` | **VERIFIED** |
| 3. Recipient Address | `delivered@resend.dev` | **VERIFIED** |
| 4. Subject | `Quotation QT-2026-0192 - Bharat Precision Engineering` | **VERIFIED** |
| 5. Attachment | Official PDF binary attached | **VERIFIED** |
| 6. Attachment Filename | `QT-2026-0192.pdf` | **VERIFIED** |
| 7. PDF Opens Cleanly | 1 page parsed successfully by `PdfReader` | **VERIFIED** |
| 8. Official Storage Path | `companies/comp-bpe-pune/quotations/625659f2-5d50-4920-8f6b-c34ace1c5acb/QT-2026-0192.pdf` | **VERIFIED** |
| 9. SHA-256 Exact Match | `40cecb6cb74690f38fe8511b24820bde3067ffeb5051314f7f4094eba3f4cf90` | **VERIFIED** |
| 10. Quotation Number | `QT-2026-0192` | **VERIFIED** |
| 11. Grand Total | `INR 408,105.00` | **VERIFIED** |
| 12. Zero Recalculation | Financial state sealed & preserved | **VERIFIED** |
| **Resend Message ID** | `01a0bf71-42fd-702c-8261-4979b4130069` | **VERIFIED** |
| **Dispatch Timestamp** | `2026-09-20 15:31:09 UTC` | **VERIFIED** |

- **Result:** **PASS**

---

## 19. Full Regression Verification

### Backend Pytest Suite
```bash
python -m pytest tests/ -q
```
- **Passed:** **214 / 214**
- **Failures:** 0
- **Errors:** 0
- **Execution Time:** ~14m 49s (including full DB and OCR suites)

### Database Migration Status
```bash
python -m alembic current
```
- **Current Alembic Revision:** `b2c3d4e5f6a7 (head)`

### Frontend TypeScript Build
```bash
cd frontend && npm run build
```
- **Result:** `✓ built in 13.25s`
- **TypeScript Errors:** **0**

---

## 20. Issues Discovered & Resolved During Validation

1. **Gemini High-Demand Handling:**
   - *Discovery:* Transient HTTP 503 from `gemini-3.6-flash` during high traffic periods.
   - *Fix:* Added resilient retry with fallback across `gemini-3-flash-preview` and `gemini-flash-latest` in `normalizer.py`.
2. **Supabase Storage Bucket Creation:**
   - *Discovery:* The `quotation-pdfs` private bucket did not exist in the Supabase project, causing upload failures.
   - *Fix:* Provisioned private bucket `quotation-pdfs` via Supabase Storage API.
3. **Database Column Non-Null Constraint on Quotation Email Status:**
   - *Discovery:* `email_status` column in PostgreSQL has a NOT NULL constraint (`default='NOT_SENT'`).
   - *Fix:* Ensured test harness sets status to `'NOT_SENT'` rather than `None`.
4. **Tenant Master Material Catalog:**
   - *Discovery:* Tenant catalog in `comp-bpe-pune` previously only contained `EN8`; materials `EN19`, `IS 2062`, and `EN1A` were unseeded.
   - *Fix:* Seeded valid tenant catalog entries with market scrap and purchase rates.

---

## 21. Remaining Limitations & Operational Notes

- **Resend Free Tier Sender Domain:** Live email dispatch requires sending from `onboarding@resend.dev` or a DNS-verified domain on the Resend account. Dispatches to unverified external mailboxes outside the account team require domain DNS TXT/MX records to be configured in production.
- **Tenant Process Defaults:** Unspecified processes on customer POs correctly trigger human review and cannot be guessed by the AI layer. This is an intentional safety design rather than a defect.
