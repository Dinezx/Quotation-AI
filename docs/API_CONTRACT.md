
# Quotation AI — Frontend/Backend API Contract

This document defines the REST API integration contract between the **Frontend (React/TypeScript)** and the **Backend (FastAPI)**.

## General Specifications
- **Base URL**: `http://localhost:8000/api/v1` (configured via `VITE_API_BASE_URL`)
- **Format**: JSON (`Content-Type: application/json`)
- **Authentication**: Bearer Token in `Authorization: Bearer <access_token>`
  - Asymmetric Supabase JWT verification via JWKS (`ES256`).
  - Company tenant isolation is strictly derived server-side. Frontend should **never** supply or attempt to override `company_id`.
- **Standard Error Response Structure**:
  ```json
  {
    "detail": "Descriptive error message or validation errors array"
  }
  ```

---

## 1. Authentication & Tenant Identity

### `GET /auth/me`
Fetches the profile and tenant context for the currently authenticated Supabase user.

- **Auth Required**: Yes (Bearer Token)
- **Request Body**: None
- **Response `200 OK`**:
  ```json
  {
    "user": {
      "id": "usr-uuid-1234",
      "email": "engineer@plant.co.in",
      "full_name": "Rajesh Deshmukh",
      "role": "COSTING_ENGINEER",
      "company_id": "comp-bpe-pune",
      "is_active": true
    },
    "company": {
      "id": "comp-bpe-pune",
      "name": "Bharat Precision Engineering Pvt. Ltd.",
      "legal_name": "Bharat Precision Engineering Private Limited",
      "gstin": "27AAACB1234F1Z8",
      "address": "Plot W-42, MIDC Industrial Area, Phase II, Bhosari, Pune, MH - 411026",
      "phone": "+91 20 2712 8840",
      "email": "contact@bharatprecision.co.in"
    }
  }
  ```
- **Errors**:
  - `401 Unauthorized`: Missing, invalid, expired, or untrusted JWT signature.
  - `403 Forbidden`: Deactivated user account or no tenant assigned.

---

## 2. Customers

### `GET /customers`
Lists all active customers for the authenticated company tenant.

- **Auth Required**: Yes
- **Query Params**: None
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "cust-uuid-001",
      "company_id": "comp-bpe-pune",
      "name": "Tata Motors Ltd.",
      "contact_person": "Praveen Sharma",
      "email": "praveen.sharma@tatamotors.com",
      "phone": "+91 98201 12345",
      "billing_address": "Pimpri Industrial Plant, Pune, MH",
      "shipping_address": "Gate 4, Pimpri Plant, Pune, MH",
      "gstin": "27AAACT2727Q1ZW",
      "is_active": true,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z"
    }
  ]
  ```

### `POST /customers`
Creates a new customer under the authenticated company tenant.

- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "Mahindra & Mahindra Ltd.",
    "contact_person": "Vikram Patil",
    "email": "patil.vikram@mahindra.com",
    "phone": "+91 98220 54321",
    "billing_address": "Chakan MIDC Phase II, Pune, MH",
    "shipping_address": "Chakan Plant Gate 2, Pune, MH",
    "gstin": "27AAACM0000A1Z5",
    "is_active": true
  }
  ```
- **Response `201 Created`**: Returns created `CustomerDTO`.
- **Errors**: `400 Bad Request` (duplicate name or invalid GSTIN format).

### `PUT /customers/{id}`
Updates an existing customer record.

- **Auth Required**: Yes
- **Response `200 OK`**: Returns updated `CustomerDTO`.
- **Errors**: `404 Not Found`.

### `DELETE /customers/{id}`
Soft-deactivates or deletes a customer.

- **Auth Required**: Yes
- **Response `204 No Content`**

---

## 3. Materials & Process Rates

### `GET /rates/materials`
Retrieves the manufacturer's material grade master card.

- **Auth Required**: Yes
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "mat-ss304-pune",
      "company_id": "comp-bpe-pune",
      "name": "Stainless Steel 304",
      "grade": "SS304",
      "density": 7.93,
      "unit": "kg",
      "base_rate": 310.00,
      "scrap_credit_rate": 125.00,
      "is_active": true,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z"
    }
  ]
  ```

### `POST /rates/materials`
Adds a new material grade rate to the manufacturer card.

- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "Aluminium 6061-T6",
    "grade": "Al6061-T6",
    "density": 2.70,
    "unit": "kg",
    "base_rate": 280.00,
    "scrap_credit_rate": 110.00,
    "is_active": true
  }
  ```
- **Response `201 Created`**: Returns created `MaterialDTO`.

### `GET /rates/processes`
Retrieves manufacturer machining and process hour cards.

- **Auth Required**: Yes
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "prc-cnc-pune",
      "company_id": "comp-bpe-pune",
      "name": "CNC 4-Axis Milling",
      "unit": "hr",
      "hourly_rate": 1250.00,
      "setup_cost": 1500.00,
      "is_active": true,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z"
    }
  ]
  ```

### `POST /rates/processes`
Adds a new process machine rate.

- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "VMC 3-Axis",
    "unit": "hr",
    "hourly_rate": 950.00,
    "setup_cost": 1200.00,
    "is_active": true
  }
  ```
- **Response `201 Created`**: Returns created `ProcessDTO`.

---

## 4. Purchase Orders

### `GET /purchase-orders`
Lists all uploaded purchase orders with optional status filtering.

- **Auth Required**: Yes
- **Query Params**: `status_filter` (e.g. `review_required`, `quoted`)
- **Response `200 OK`**: Array of `PurchaseOrderDTO`.

### `POST /purchase-orders`
Registers a new purchase order with extracted line items.

- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "customer_id": "cust-uuid-001",
    "po_number": "PO-2026-0881",
    "po_date": "2026-03-15",
    "delivery_date": "2026-04-15",
    "items": [
      {
        "item_number": 1,
        "part_name": "Flange Adapter Housing",
        "specification": "SS304 round bar dia 120mm x 45mm",
        "quantity": 100,
        "unit": "Nos",
        "material_grade": "SS304",
        "gross_weight_kg": 4.20,
        "net_weight_kg": 2.80,
        "scrap_weight_kg": 1.40,
        "process_name": "CNC Machining",
        "machining_hours": 0.45,
        "setup_hours": 2.0,
        "confidence": 94.5
      }
    ]
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "po-uuid-5555",
    "company_id": "comp-bpe-pune",
    "customer_id": "cust-uuid-001",
    "po_number": "PO-2026-0881",
    "po_date": "2026-03-15",
    "status": "review_required",
    "items": [
      {
        "id": "poi-uuid-1111",
        "purchase_order_id": "po-uuid-5555",
        "item_number": 1,
        "part_name": "Flange Adapter Housing",
        "quantity": 100,
        "unit": "Nos",
        "material_grade": "SS304",
        "confidence": 94.5
      }
    ]
  }
  ```

### `PUT /purchase-orders/{id}/items/{item_id}`
Updates human-verified rates, grade, weights, or machining parameters on an extracted line item.

- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "material_id": "mat-ss304-pune",
    "material_grade": "SS304",
    "gross_weight_kg": 4.25,
    "scrap_weight_kg": 1.45,
    "machining_hours": 0.50
  }
  ```
- **Response `200 OK`**: Returns updated `PurchaseOrderItemDTO`.

---

## 5. Pricing Calculation Engine & Quotations

### `POST /quotations/calculate`
Stateless deterministic pricing calculation. Computes exact unit prices, overhead, profit margins, and GST breakdown without modifying database records.

- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "items": [
      {
        "item_number": 1,
        "part_name": "Flange Adapter Housing",
        "specification": "SS304 Precision Flange",
        "quantity": 100,
        "unit": "Nos",
        "gross_weight_kg": 4.20,
        "scrap_weight_kg": 1.40,
        "material_base_rate": 310.00,
        "scrap_credit_rate": 125.00,
        "machining_hours": 0.45,
        "machine_hourly_rate": 1250.00,
        "setup_cost": 1500.00
      }
    ],
    "overhead_percentage": 10.0,
    "profit_percentage": 15.0,
    "gst_type": "CGST_SGST"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "item_number": 1,
        "part_name": "Flange Adapter Housing",
        "quantity": 100,
        "unit": "Nos",
        "gross_material_cost": 1302.00,
        "scrap_credit": 175.00,
        "net_material_cost": 1127.00,
        "machining_cost": 562.50,
        "setup_cost": 1500.00,
        "process_cost": 2062.50,
        "subtotal": 3189.50,
        "unit_cost": 3189.50,
        "unit_price": 4034.72,
        "total_price": 403472.00
      }
    ],
    "material_cost": 112700.00,
    "process_cost": 206250.00,
    "subtotal": 318950.00,
    "overhead_percentage": 10.0,
    "overhead_amount": 31895.00,
    "profit_percentage": 15.0,
    "profit_amount": 52626.75,
    "taxable_amount": 403471.75,
    "gst_type": "CGST_SGST",
    "cgst_rate": 9.0,
    "cgst_amount": 36312.46,
    "sgst_rate": 9.0,
    "sgst_amount": 36312.46,
    "igst_rate": 0.0,
    "igst_amount": 0.0,
    "gst_amount": 72624.92,
    "final_total": 476096.67,
    "final_total_in_words": "Indian Rupees Four Lakh Seventy-Six Thousand Ninety-Six and Sixty-Seven Paise Only"
  }
  ```

### `GET /quotations`
Lists quotations for the authenticated tenant company. Supports server-side search, status filtering, and pagination.

- **Auth Required**: Yes (Bearer Token)
- **Query Parameters**:
  - `page` (optional int): 1-indexed page number. When provided, returns paginated wrapper.
  - `page_size` (optional int, default 20, max 100): number of items per page.
  - `search` (optional str): substring filter across quotation number, customer name, and PO number.
  - `status` (optional str): filter by quotation status (`DRAFT`, `FINAL`).
- **Response `200 OK` (when `page` is provided)**:
  ```json
  {
    "items": [
      {
        "id": "quot-uuid-001",
        "company_id": "comp-bpe-pune",
        "quotation_number": "QT-2026-0001",
        "status": "FINAL",
        "final_total": 20898.00,
        "finalized_at": "2026-09-20T10:30:00Z",
        "finalized_by": "engineer@bharatprecision.co.in",
        "pdf_storage_path": "companies/comp-bpe-pune/quotations/quot-uuid-001/QT-2026-0001.pdf",
        "pdf_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
  }
  ```
- **Response `200 OK` (when `page` is omitted)**:
  Returns array `List[QuotationDTO]` directly for backward compatibility.

### `POST /quotations/{id}/calculate`
Executes deterministic pricing and persists quotation line items and statutory totals.

- **Auth Required**: Yes
- **Immutability Invariant**: Blocked if `status == "FINAL"`.
- **Response `200 OK`**: Returns updated `QuotationDTO`.
- **Errors**:
  - `409 Conflict`: "Finalized quotations cannot be modified or recalculated."

### `GET /quotations/{id}`
Fetches full quotation details, itemized breakdown, commercial metadata, and current status (`DRAFT`, `FINAL`).

- **Auth Required**: Yes
- **Response `200 OK`**:
  ```json
  {
    "id": "quot-uuid-001",
    "company_id": "comp-bpe-pune",
    "quotation_number": "QT-2026-0001",
    "customer_id": "cust-uuid-001",
    "customer_name": "ABC Engineering Components Pvt. Ltd.",
    "purchase_order_id": "po-uuid-001",
    "po_number": "PO-2026-0098",
    "status": "FINAL",
    "delivery_terms": "Ex-Works Factory Bhosari",
    "payment_terms": "30 Days from date of supply",
    "valid_until": "2026-10-20T00:00:00Z",
    "inspection_terms": "Pre-dispatch inspection at vendor site",
    "notes": "Standard industrial tolerances +/- 0.05mm apply",
    "prepared_by": "Costing Engineering Department",
    "authorized_signatory": "Authorized Signatory",
    "subtotal": 14000.00,
    "overhead_amount": 1400.00,
    "profit_amount": 2310.00,
    "taxable_amount": 17710.00,
    "gst_amount": 3188.00,
    "final_total": 20898.00,
    "finalized_at": "2026-09-20T10:30:00Z",
    "finalized_by": "engineer@bharatprecision.co.in",
    "pdf_storage_path": "companies/comp-bpe-pune/quotations/quot-uuid-001/QT-2026-0001.pdf",
    "pdf_file_name": "QT-2026-0001.pdf",
    "pdf_generated_at": "2026-09-20T10:30:00Z",
    "pdf_sha256": "a3f5...",
    "items": [
      {
        "id": "qitem-uuid-001",
        "item_number": 1,
        "part_name": "Bearing Housing",
        "quantity": 10.0,
        "unit": "PCS",
        "unit_price": 1400.00,
        "total_price": 14000.00
      }
    ]
  }
  ```

### `PUT /quotations/{id}`
Updates editable commercial metadata on a `DRAFT` quotation.

- **Auth Required**: Yes
- **Immutability Invariant**: Blocked if `status == "FINAL"`.
- **Response `200 OK`**: Returns updated `QuotationDTO`.
- **Errors**:
  - `409 Conflict`: "Finalized quotations cannot be modified."

### `POST /quotations/{id}/finalize`
Finalizes a quotation from `DRAFT` to immutable `FINAL` status:
1. Validates company tenant ownership and active user status.
2. Validates line items completeness (at least 1 item required).
3. Validates positive calculated financial totals (`final_total > 0`).
4. Generates official presentation-only A4 PDF via ReportLab.
5. Computes SHA-256 document integrity hash.
6. Uploads PDF to tenant-safe private storage (`companies/{company_id}/quotations/{id}/{number}.pdf`).
7. Records `finalized_at`, `finalized_by`, `pdf_storage_path`, `pdf_file_name`, `pdf_generated_at`, `pdf_sha256`.
8. Atomically commits transaction with rollback cleanup guard.

- **Auth Required**: Yes
- **Response `200 OK`**: Returns finalized `QuotationDTO` with `status: "FINAL"`.
- **Errors**:
  - `403 Forbidden`: Cross-company finalization or deactivated user.
  - `404 Not Found`: Quotation not found.
  - `409 Conflict`: Quotation is already finalized or calculation blocked/zero.
  - `422 Unprocessable Content`: Line items missing.
  - `500 Internal Server Error`: Storage upload or persistence failure (rolled back).

### `GET /quotations/{id}/pdf` or `POST /quotations/{id}/pdf`
Secure download endpoint for quotation PDF:
- For `FINAL` quotations: retrieves the stored official PDF from persistent storage. Controlled `409 Conflict` if storage object missing. No silent recalculation or regeneration.
- For `DRAFT` quotations: generates presentation-only preview PDF dynamically.

- **Auth Required**: Yes
- **Tenant Protection**: Strict company verification (returns 403 Forbidden for cross-company requests).
- **Response `200 OK`**:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="QT-2026-0001.pdf"`
  - Response Body: Binary PDF stream.


