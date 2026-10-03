# Disaster Recovery & Business Continuity Plan

**Application:** Quotation AI  
**Document Status:** Production Ready  
**RTO (Recovery Time Objective):** < 1 hour  
**RPO (Recovery Point Objective):** < 15 minutes  

---

## 1. Data Classification & Resilience Requirements

| Component | Storage Engine | Criticality | Loss Impact | Protection Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | Supabase Managed Postgres | Critical | Customer rate cards, finalized quotes, audit logs lost | Daily automated snapshots + Point-in-Time Recovery (PITR) |
| **Final Quotation PDFs** | Supabase Private Storage (`quotations`) | Critical | Legal quotation contracts cannot be retrieved | Storage cross-region replication / versioning |
| **Customer PO Files** | Supabase Private Storage (`purchase-orders`) | High | Source files for customer audits unavailable | Storage versioning & soft delete |
| **Container Instances** | Azure Container Apps | Medium | Service downtime (no data loss) | Multi-replica stateless deployment across Availability Zones |

---

## 2. Backup Architecture & Verification

### 2.1 PostgreSQL Database Backups
- **Automated Daily Backups:** Managed by Supabase with 7-day retention (standard tier) or 30-day retention (Pro tier).
- **Point-in-Time Recovery (PITR):**
  - **Manual Cloud Action Required:** Must be explicitly enabled in the Supabase Pro tier to guarantee recovery to any second within the past 7 days using PostgreSQL write-ahead logs (WAL).
- **Logical Schema & Migration Dump:**
  - Alembic migrations (`backend/alembic/versions/`) represent the authoritative schema source of truth.
  - Periodic schema export verification command:
    ```bash
    pg_dump --schema-only -d "$DATABASE_URL" > db_schema_backup.sql
    ```

### 2.2 Storage Versioning & Object Preservation
- **Immutability of Final Quotations:** Once a quotation is marked `FINAL`, its generated PDF and associated line items cannot be modified or replaced.
- **Storage Lifecycle:** Quotation PDFs must be retained for a statutory minimum of 7 years for Indian GST and commercial compliance.

---

## 3. Disaster Recovery Procedures

### Scenario A: Accidental Data Corruption or Malicious Deletion
1. Identify the corruption timestamp via the tamper-evident audit logs table (`SELECT created_at FROM public.audit_logs WHERE event = '...'`).
2. Navigate to Supabase Dashboard > Settings > Database > Backups.
3. Select Point-in-Time Recovery (PITR) to a timestamp 5 minutes prior to the corruption event.
4. Restore to a new target database instance, verify integrity of company rate cards and quotation records, and update `DATABASE_URL` in Azure Key Vault.

### Scenario B: Complete Cloud Region Outage
1. Redeploy Azure Container App environment into secondary paired region (e.g., `West US 2` if primary was `East US`).
2. Re-point Azure Front Door origin to the secondary Container App FQDN.
3. Front Door automatically handles traffic rerouting with global zero-downtime DNS failover.
4. Verify backend readiness via `GET https://quotation-ai.yourdomain.com/health/ready`.
