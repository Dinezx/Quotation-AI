# Quotation AI — Database Schema & Multi-Tenant Architecture

This document specifies the relational database schema, tenant isolation model, and data integrity constraints for Quotation AI, hosted on **Supabase PostgreSQL**.

---

## 1. Multi-Tenant Architecture & Security Model

### Tenant Isolation Principle
All business entities belong strictly to a company tenant (`companies`).

> [!IMPORTANT]
> **Strict Server-Side Derivation**:
> The frontend is **never** trusted to provide `company_id`.
> Every API request decodes and cryptographically verifies the Supabase access token using asymmetric JWKS. The `sub` claim identifies the user in `users`, from which the authoritative `company_id` is resolved.
> All database queries enforce:
> ```sql
> WHERE company_id = :authenticated_company_id
> ```

---

## 2. Table Schemas

### 1. `companies` (Tenants)
Represents manufacturing plants / precision engineering facilities.
- `id` (`VARCHAR(64)` / `UUID`, PK): Unique company identifier (e.g. `comp-bpe-pune`).
- `name` (`VARCHAR(255)`, Not Null): Commercial name.
- `legal_name` (`VARCHAR(255)`): Registered legal business entity.
- `gstin` (`VARCHAR(15)`): 15-character Indian Goods and Services Tax Identification Number.
- `address` (`TEXT`): Registered factory/plant address.
- `phone` (`VARCHAR(32)`): Contact number.
- `email` (`VARCHAR(255)`): Official correspondence email.
- `is_active` (`BOOLEAN`, Default: `TRUE`): Tenant active status.
- `created_at`, `updated_at` (`TIMESTAMP WITH TIME ZONE`).

### 2. `users`
Authenticated operators, engineers, and plant administrators.
- `id` (`VARCHAR(64)`, PK): Matches Supabase Auth user UUID (`sub`).
- `company_id` (`VARCHAR(64)`, FK ➔ `companies.id`, Not Null): Assigned tenant.
- `email` (`VARCHAR(255)`, Not Null, Indexed): User email.
- `full_name` (`VARCHAR(255)`): Operator display name.
- `role` (`VARCHAR(32)`, Default: `'COSTING_ENGINEER'`): Role (`ADMIN`, `COSTING_ENGINEER`, `VIEWER`).
- `is_active` (`BOOLEAN`, Default: `TRUE`).
- `created_at`, `updated_at` (`TIMESTAMP WITH TIME ZONE`).

### 3. `customers`
B2B clients purchasing machined components.
- `id` (`VARCHAR(64)`, PK): Unique customer identifier.
- `company_id` (`VARCHAR(64)`, FK ➔ `companies.id`, Not Null, Indexed): Tenant owner.
- `name` (`VARCHAR(255)`, Not Null): Customer business name.
- `contact_person` (`VARCHAR(255)`): Procurement contact name.
- `email` (`VARCHAR(255)`): Procurement email.
- `phone` (`VARCHAR(32)`): Procurement phone.
- `billing_address` (`TEXT`): Invoicing address.
- `shipping_address` (`TEXT`): Dispatch dock address.
- `gstin` (`VARCHAR(15)`): Customer GSTIN.
- `is_active` (`BOOLEAN`, Default: `TRUE`).
- `created_at`, `updated_at` (`TIMESTAMP WITH TIME ZONE`).

### 4. `materials`
Raw stock grade master card with base procurement and scrap credit rates.
- `id` (`VARCHAR(64)`, PK).
- `company_id` (`VARCHAR(64)`, FK ➔ `companies.id`, Not Null, Indexed).
- `name` (`VARCHAR(255)`, Not Null): Display name (e.g. `Stainless Steel 304`).
- `grade` (`VARCHAR(64)`, Not Null): Engineering grade designation (e.g. `SS304`).
- `density` (`NUMERIC(10, 4)`): Material density in g/cm³ (e.g. `7.93`).
- `unit` (`VARCHAR(16)`, Default: `'kg'`): Measurement unit.
- `base_rate` (`NUMERIC(12, 2)`, Not Null): Procurement cost per unit (₹/kg).
- `scrap_credit_rate` (`NUMERIC(12, 2)`, Default: `0.00`): Buy-back credit per unit (₹/kg).
- `is_active` (`BOOLEAN`, Default: `TRUE`).
- `created_at`, `updated_at` (`TIMESTAMP WITH TIME ZONE`).

### 5. `processes`
Machining operations, cutting, and surface treatment capabilities.
- `id` (`VARCHAR(64)`, PK).
- `company_id` (`VARCHAR(64)`, FK ➔ `companies.id`, Not Null, Indexed).
- `name` (`VARCHAR(255)`, Not Null): e.g. `CNC 4-Axis Milling`, `VMC 3-Axis`.
- `unit` (`VARCHAR(16)`, Default: `'hr'`): Hourly or operation unit.
- `hourly_rate` (`NUMERIC(12, 2)`, Not Null): Machine running rate per hour (₹/hr).
- `setup_cost` (`NUMERIC(12, 2)`, Default: `0.00`): Fixed fixture/tool setup fee (₹).
- `is_active` (`BOOLEAN`, Default: `TRUE`).
- `created_at`, `updated_at` (`TIMESTAMP WITH TIME ZONE`).

### 6. `purchase_orders`
Inbound customer purchase orders.
- `id` (`VARCHAR(64)`, PK).
- `company_id` (`VARCHAR(64)`, FK ➔ `companies.id`, Not Null, Indexed).
- `customer_id` (`VARCHAR(64)`, FK ➔ `customers.id`, Nullable): Linked client.
- `po_number` (`VARCHAR(128)`, Not Null): Customer's PO number.
- `po_date` (`DATE`): Issuance date.
- `delivery_date` (`DATE`): Required dispatch target.
- `source_file_url` (`TEXT`): Stored original PO PDF/document path.
- `source_file_name` (`VARCHAR(255)`): Uploaded filename.
- `status` (`VARCHAR(32)`, Default: `'review_required'`): Lifecycle status (`draft`, `uploaded`, `review_required`, `reviewed`, `quoted`, `rejected`).
- `extracted_data` (`JSONB` / `JSON`): Raw structured output from extraction.
- `raw_text` (`TEXT`): OCR text.
- `created_at`, `updated_at` (`TIMESTAMP WITH TIME ZONE`).

### 7. `purchase_order_items`
Extracted component line items requiring verification and quoting.
- `id` (`VARCHAR(64)`, PK).
- `purchase_order_id` (`VARCHAR(64)`, FK ➔ `purchase_orders.id` ON DELETE CASCADE, Not Null, Indexed).
- `item_number` (`INTEGER`, Not Null): Line index (1, 2, 3...).
- `part_number` (`VARCHAR(128)`): Engineering part number.
- `part_name` (`VARCHAR(255)`, Not Null): Component title.
- `description` (`TEXT`): Detailed geometry notes.
- `specification` (`TEXT`): Material / drawing standard.
- `quantity` (`NUMERIC(12, 2)`, Not Null): Quantity ordered.
- `unit` (`VARCHAR(32)`, Default: `'Nos'`).
- `material_id` (`VARCHAR(64)`, FK ➔ `materials.id`, Nullable): Matched material.
- `material_grade` (`VARCHAR(64)`): Grade label.
- `gross_weight_kg` (`NUMERIC(10, 3)`, Default: `0.000`): Billet weight.
- `net_weight_kg` (`NUMERIC(10, 3)`, Default: `0.000`): Finished part weight.
- `scrap_weight_kg` (`NUMERIC(10, 3)`, Default: `0.000`): Chip/swarf weight.
- `process_id` (`VARCHAR(64)`, FK ➔ `processes.id`, Nullable): Primary process.
- `process_name` (`VARCHAR(255)`).
- `machining_hours` (`NUMERIC(8, 2)`, Default: `0.00`): Cycle time per part.
- `setup_hours` (`NUMERIC(8, 2)`, Default: `0.00`): Total lot setup time.
- `confidence` (`NUMERIC(5, 2)`, Default: `100.00`): Extraction confidence percentage.
- `created_at`, `updated_at` (`TIMESTAMP WITH TIME ZONE`).

### 8. `quotations`
Commercial quotations dispatched to customers.
- `id` (`VARCHAR(64)`, PK).
- `company_id` (`VARCHAR(64)`, FK ➔ `companies.id`, Not Null, Indexed).
- `customer_id` (`VARCHAR(64)`, FK ➔ `customers.id`, Nullable).
- `purchase_order_id` (`VARCHAR(64)`, FK ➔ `purchase_orders.id`, Nullable, Indexed).
- `quotation_number` (`VARCHAR(64)`, Not Null): e.g. `QT-2026-0881`.
- `quotation_date` (`DATE`, Not Null).
- `valid_until` (`DATE`): Validity window (typically 30 days).
- `currency` (`VARCHAR(8)`, Default: `'INR'`).
- `material_cost` (`NUMERIC(14, 2)`, Default: `0.00`).
- `process_cost` (`NUMERIC(14, 2)`, Default: `0.00`).
- `subtotal` (`NUMERIC(14, 2)`, Default: `0.00`).
- `overhead_percentage` (`NUMERIC(5, 2)`, Default: `10.00`).
- `overhead_amount` (`NUMERIC(14, 2)`, Default: `0.00`).
- `profit_percentage` (`NUMERIC(5, 2)`, Default: `15.00`).
- `profit_amount` (`NUMERIC(14, 2)`, Default: `0.00`).
- `taxable_amount` (`NUMERIC(14, 2)`, Default: `0.00`).
- `gst_type` (`VARCHAR(32)`, Default: `'CGST_SGST'`): `'CGST_SGST'` (intra-state) or `'IGST'` (inter-state).
- `cgst_rate` (`NUMERIC(5, 2)`, Default: `9.00`).
- `cgst_amount` (`NUMERIC(14, 2)`, Default: `0.00`).
- `sgst_rate` (`NUMERIC(5, 2)`, Default: `9.00`).
- `sgst_amount` (`NUMERIC(14, 2)`, Default: `0.00`).
- `igst_rate` (`NUMERIC(5, 2)`, Default: `0.00`).
- `igst_amount` (`NUMERIC(14, 2)`, Default: `0.00`).
- `gst_amount` (`NUMERIC(14, 2)`, Default: `0.00`).
- `final_total` (`NUMERIC(14, 2)`, Default: `0.00`).
- `status` (`VARCHAR(32)`, Default: `'draft'`): `draft`, `sent`, `accepted`, `rejected`.
- `pdf_url` (`TEXT`): Dispatched ReportLab PDF link.
- `payment_terms` (`TEXT`): e.g. `30 Days Net from Delivery`.
- `delivery_terms` (`TEXT`): e.g. `Ex-Works Bhosari, Pune`.
- `created_at`, `updated_at` (`TIMESTAMP WITH TIME ZONE`).

### 9. `quotation_items`
Calculated line items reflecting the deterministic unit pricing formulas.
- `id` (`VARCHAR(64)`, PK).
- `quotation_id` (`VARCHAR(64)`, FK ➔ `quotations.id` ON DELETE CASCADE, Not Null, Indexed).
- `purchase_order_item_id` (`VARCHAR(64)`, FK ➔ `purchase_order_items.id`, Nullable).
- `item_number` (`INTEGER`, Not Null).
- `part_name` (`VARCHAR(255)`, Not Null).
- `specification` (`TEXT`).
- `quantity` (`NUMERIC(12, 2)`, Not Null).
- `unit` (`VARCHAR(32)`, Default: `'Nos'`).
- `gross_material_cost` (`NUMERIC(14, 2)`).
- `scrap_credit` (`NUMERIC(14, 2)`).
- `net_material_cost` (`NUMERIC(14, 2)`).
- `machining_cost` (`NUMERIC(14, 2)`).
- `setup_cost` (`NUMERIC(14, 2)`).
- `process_cost` (`NUMERIC(14, 2)`).
- `subtotal` (`NUMERIC(14, 2)`).
- `unit_cost` (`NUMERIC(14, 2)`).
- `unit_price` (`NUMERIC(14, 2)`).
- `total_price` (`NUMERIC(14, 2)`).
- `created_at`, `updated_at` (`TIMESTAMP WITH TIME ZONE`).
