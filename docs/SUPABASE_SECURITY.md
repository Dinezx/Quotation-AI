# Supabase Database & Storage Production Security Architecture

**Application:** Quotation AI  
**Document Status:** Production Ready  
**Audience:** Security Architect, Database Administrator, DevOps Engineer  

---

## 1. Threat Model & Invariants

Quotation AI manages proprietary manufacturing designs, confidential part drawings, commercial rate cards, and legal purchase contracts. Under no circumstance may:
1. An unauthenticated browser client read or write to any table.
2. An authenticated user from Company A read, modify, or delete rows belonging to Company B (Multi-Tenant Isolation).
3. Any browser client access Supabase with the privileged `service_role` key.
4. Storage objects (PO documents, quotation PDFs, company logos) be made publicly downloadable without verified tenant authorization.

---

## 2. Supabase Database Role & Grant Hardening

### 2.1 Principle of Least Privilege
Supabase exposes standard database roles:
- `anon`: Public, unauthenticated browser client.
- `authenticated`: User possessing a valid Supabase JWT.
- `service_role`: Privileged administrative bypass role (strictly restricted to server-side backend).

### 2.2 Permissions Hardening Script
Execute the following SQL commands in the Supabase SQL Editor to revoke dangerous public privileges:

```sql
-- 1. Revoke default public execution privileges on sensitive schemas
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM anon;

-- 2. Ensure 'anon' role cannot perform any DML operations on business tables
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- 3. Grant strictly required read/write permissions to 'authenticated' role
-- Note: Row Level Security (RLS) policies further restrict access per-tenant
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. Set search_path defensively to prevent search-path hijacking attacks
ALTER ROLE authenticated SET search_path = public;
ALTER ROLE anon SET search_path = public;
```

---

## 3. Row Level Security (RLS) Policy Architecture

Every table in Quotation AI must have Row Level Security explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

### 3.1 Tenant Helper Function
To evaluate tenant company membership efficiently without redundant subqueries, define the secure tenant context function:

```sql
-- Helper function to extract caller's company_id from their authenticated user profile
CREATE OR REPLACE FUNCTION auth.current_company_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()::text AND is_active = true LIMIT 1;
$$;
```

### 3.2 Authoritative Table RLS Matrix

```sql
-- =========================================================================
-- 1. COMPANIES
-- =========================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;

CREATE POLICY "companies_tenant_isolation_select" ON public.companies
  FOR SELECT TO authenticated
  USING (id = auth.current_company_id());

CREATE POLICY "companies_tenant_isolation_update" ON public.companies
  FOR UPDATE TO authenticated
  USING (id = auth.current_company_id())
  WITH CHECK (id = auth.current_company_id());

-- =========================================================================
-- 2. USERS
-- =========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

CREATE POLICY "users_tenant_isolation_select" ON public.users
  FOR SELECT TO authenticated
  USING (company_id = auth.current_company_id());

CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid()::text AND company_id = auth.current_company_id())
  WITH CHECK (id = auth.uid()::text AND company_id = auth.current_company_id());

-- =========================================================================
-- 3. CUSTOMERS
-- =========================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;

CREATE POLICY "customers_tenant_isolation_all" ON public.customers
  FOR ALL TO authenticated
  USING (company_id = auth.current_company_id())
  WITH CHECK (company_id = auth.current_company_id());

-- =========================================================================
-- 4. MATERIALS (Rate Cards)
-- =========================================================================
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials FORCE ROW LEVEL SECURITY;

CREATE POLICY "materials_tenant_isolation_all" ON public.materials
  FOR ALL TO authenticated
  USING (company_id = auth.current_company_id())
  WITH CHECK (company_id = auth.current_company_id());

-- =========================================================================
-- 5. PROCESSES (Rate Cards)
-- =========================================================================
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes FORCE ROW LEVEL SECURITY;

CREATE POLICY "processes_tenant_isolation_all" ON public.processes
  FOR ALL TO authenticated
  USING (company_id = auth.current_company_id())
  WITH CHECK (company_id = auth.current_company_id());

-- =========================================================================
-- 6. PURCHASE ORDERS
-- =========================================================================
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders FORCE ROW LEVEL SECURITY;

CREATE POLICY "po_tenant_isolation_all" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (company_id = auth.current_company_id())
  WITH CHECK (company_id = auth.current_company_id());

-- =========================================================================
-- 7. PURCHASE ORDER ITEMS
-- =========================================================================
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "po_items_tenant_isolation_all" ON public.purchase_order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND po.company_id = auth.current_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND po.company_id = auth.current_company_id()
    )
  );

-- =========================================================================
-- 8. QUOTATIONS
-- =========================================================================
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations FORCE ROW LEVEL SECURITY;

CREATE POLICY "quotations_tenant_isolation_all" ON public.quotations
  FOR ALL TO authenticated
  USING (company_id = auth.current_company_id())
  WITH CHECK (company_id = auth.current_company_id());

-- =========================================================================
-- 9. QUOTATION ITEMS
-- =========================================================================
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "quotation_items_tenant_isolation_all" ON public.quotation_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_items.quotation_id
        AND q.company_id = auth.current_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_items.quotation_id
        AND q.company_id = auth.current_company_id()
    )
  );

-- =========================================================================
-- 10. NOTIFICATIONS
-- =========================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY "notifications_tenant_isolation_all" ON public.notifications
  FOR ALL TO authenticated
  USING (company_id = auth.current_company_id())
  WITH CHECK (company_id = auth.current_company_id());

-- =========================================================================
-- 11. AUDIT LOGS (Immutable Append-Only Trail)
-- =========================================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Admins can only view audit logs for their own company
CREATE POLICY "audit_logs_tenant_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (company_id = auth.current_company_id());

-- Normal authenticated users cannot mutate or delete audit logs
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon;
```

---

## 4. Supabase Storage Security & Policies

### 4.1 Bucket Architecture
Quotation AI utilizes private buckets for all sensitive assets:
- `quotations`: Official final quotation PDFs (`company/{company_id}/quotations/{quotation_number}.pdf`) and company logos (`companies/{company_id}/logo/{clean_filename}`).
- `purchase-orders`: Stored uploaded customer POs (`company/{company_id}/purchase-orders/{uuid}_{filename}`).

### 4.2 Storage Rules
1. **Public access is DISABLED** (`public = false`) on all buckets.
2. File paths MUST strictly follow the tenant-prefixed convention:
   `companies/<company_id>/...` or `company/<company_id>/...`
3. Storage policies in Supabase Storage enforce that the authenticated user's `auth.current_company_id()` matches the path prefix:

```sql
-- Storage RLS policy for quotations bucket
CREATE POLICY "tenant_scoped_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'quotations'
    AND (storage.foldername(name))[2] = auth.current_company_id()
  );

CREATE POLICY "tenant_scoped_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quotations'
    AND (storage.foldername(name))[2] = auth.current_company_id()
  );
```

---

## 5. Manual Supabase Dashboard Configuration Checklist

1. **Enable MFA on Supabase Organization / Owner Accounts:**
   - Go to Supabase Dashboard > Organization Settings > Security > Enforce 2FA.
2. **Rotate Database Password:**
   - Ensure the database password is a high-entropy 32+ character random string.
3. **Verify API Settings:**
   - Confirm that the `service_role` key is **never pasted into `.env.local`** or frontend build configuration.
   - Confirm `anon` key only has read access via strictly defined RLS policies.
4. **Network Restrictions:**
   - In Supabase Dashboard > Settings > Database > Network Restrictions:
   - Restrict incoming connections to the static outbound IPs or VNet of the Azure Container Apps environment.
