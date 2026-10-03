# Secrets Management & Credential Lifecycle Policy

**Application:** Quotation AI  
**Document Status:** Production Ready  
**Compliance Standard:** Principle of Least Privilege & Zero Trust  

---

## 1. Inventory of Secrets & Credentials

The following table documents all secrets required to operate Quotation AI. **No secret values are printed in this document.**

| Secret Identifier | Environment Variable | Service Provider | Scope / Access Level | Storage Location (Production) | Rotation Interval |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Supabase Database Connection** | `DATABASE_URL` | Supabase / PostgreSQL | Backend DB Read/Write | Azure Key Vault / Container App Secret | 90 days |
| **Supabase Service Key** | `SUPABASE_SECRET_KEY` | Supabase Auth/Storage | Backend Admin Server-Side | Azure Key Vault / Container App Secret | 90 days |
| **Supabase Anon Key** | `SUPABASE_ANON_KEY` | Supabase Public API | Client/Browser Public SDK | Frontend Environment Config | 180 days |
| **Azure Document Intelligence Key**| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | Azure Cognitive Services | AI OCR & Layout Engine | Azure Key Vault / Container App Secret | 90 days |
| **Google Gemini API Key** | `GEMINI_API_KEY` | Google Generative AI | Line-Item Normalization | Azure Key Vault / Container App Secret | 90 days |
| **Resend API Key** | `RESEND_API_KEY` | Resend | Quotation Email Dispatch | Azure Key Vault / Container App Secret | 90 days |
| **Azure Front Door Identifier** | `AZURE_FRONT_DOOR_ID` | Azure Front Door | Reverse Proxy Ingress Auth | Container App Secret | On deployment |

---

## 2. Architectural Boundaries: Frontend vs. Backend

### 2.1 Strictly Client-Side (Public by Design)
The frontend client bundle (`dist/`) runs within untrusted user web browsers. It must **only** receive:
1. `VITE_API_URL`: The backend reverse-proxy endpoint.
2. `VITE_SUPABASE_URL`: The public Supabase project endpoint.
3. `VITE_SUPABASE_ANON_KEY`: The public anonymous key (which is gated by Row Level Security).

### 2.2 Strictly Server-Side (Privileged)
The following credentials must **NEVER** be referenced, imported, bundled, or exposed to the frontend or git commits:
- `SUPABASE_SECRET_KEY` / `service_role`
- `DATABASE_URL`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `AZURE_FRONT_DOOR_ID`

---

## 3. Secret Rotation Protocols

### 3.1 Database Credential Rotation
1. In Supabase Dashboard > Settings > Database > Database Password:
   - Click "Reset database password".
   - Generate a cryptographically secure 32-character random string.
2. Update the secret in Azure Key Vault:
   ```bash
   az keyvault secret set --vault-name kv-quotation-ai-prod --name DATABASE-URL --value "postgresql://postgres.[ref]:[new_pass]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require"
   ```
3. Restart backend container apps to reload connection pools with zero customer disruption.

### 3.2 Third-Party API Key Rotation (Resend / Gemini / Azure)
1. Generate a secondary key in the provider console (e.g., Azure Cognitive Services or Google AI Studio).
2. Update the backend container secret in Azure Container Apps.
3. Verify that test extractions / emails succeed.
4. Revoke the old primary key in the provider console.

---

## 4. Repository & CI/CD Secret Protection Rules

1. **`.env` is Git-Ignored:** `.env` and `.env.local` files are registered in `.gitignore` and must never be staged or committed.
2. **`.env.example` Placeholders:** Only placeholder variable keys (e.g. `GEMINI_API_KEY=your_gemini_key_here`) are permitted in `.env.example`.
3. **Automated Secret Scanning in CI:**
   - GitHub Actions runs `gitleaks` / secret scanning on every pull request and push.
   - Any commit containing high-entropy strings matching private key or API key signatures automatically fails the build and prevents merge.
