# Azure Front Door Premium + Web Application Firewall (WAF) Setup

**Application:** Quotation AI  
**Document Status:** Production Ready  
**Target Environment:** Azure Front Door Premium with Managed WAF  

---

## 1. Executive Architecture Summary

Internet traffic reaches Quotation AI strictly through **Azure Front Door Premium**, which acts as the global edge reverse proxy, TLS termination point, and Web Application Firewall (WAF). Direct public ingress to the container environment or internal services is forbidden.

```
Internet
   │
   ▼
[DNS: quotation-ai.yourdomain.com]
   │
   ▼
Azure Front Door Premium
   │
   ├── [Azure WAF Policy]
   │    ├── Managed Default Rule Set (DRS 2.1 - OWASP)
   │    ├── Microsoft Threat Intelligence Bot Protection
   │    ├── Custom Rate Limiting Rules (Auth, PO Upload, AI Extract, PDF, Email)
   │    ├── IP / Geo Filtering Rules
   │    └── Request Body & Method Restrictions
   │
   ├── HTTPS Enforced (TLS 1.2 / TLS 1.3, HTTP->HTTPS 301 Redirect)
   │
   ▼ (Origin Request with X-Azure-FDID header)
Azure Container Apps / Reverse Proxy
   │
   ▼
FastAPI Backend (Validates X-Azure-FDID, executes RBAC, RLS, Audit Logging)
```

---

## 2. Ingress & Origin Security Controls

### 2.1 Origin Lockdown via Front Door ID (`X-Azure-FDID`)
To ensure attackers cannot bypass Azure Front Door by hitting the backend IP or Container App domain directly, Quotation AI implements origin header verification.

- **FastAPI Backend Setting:** `AZURE_FRONT_DOOR_ID`
- **Front Door Header:** `X-Azure-FDID` (automatically populated by Azure Front Door with the profile's unique GUID).
- **Backend Behavior:** Any request received without a matching `X-Azure-FDID` header is immediately rejected with `403 Forbidden` (`"Direct origin access forbidden. Request must pass through Azure Front Door."`).

---

## 3. Azure Front Door & WAF Configuration

### 3.1 TLS & Protocol Requirements
- **Enforce HTTPS:** Enable `HTTP to HTTPS` redirect on all routing endpoints.
- **Minimum TLS Version:** `TLS 1.2` minimum; `TLS 1.3` enabled.
- **HSTS:** Enabled at edge and reinforced via backend `SecurityHeadersMiddleware` (`max-age=31536000; includeSubDomains; preload`).

### 3.2 WAF Policy Specification

| Setting | Production Requirement | Rationale |
| :--- | :--- | :--- |
| **Tier** | Premium | Required for Bot Protection and DRS 2.1 |
| **Mode** | Phase 1: **Detection**; Phase 2: **Prevention** | Zero-downtime false-positive tuning prior to strict blocking |
| **Managed Ruleset** | Microsoft_DefaultRuleSet 2.1 (DRS 2.1) | Protects against OWASP Top 10 (SQLi, XSS, RCE, LFI/RFI) |
| **Bot Ruleset** | Microsoft_BotManagerRuleSet 1.0 | Blocks malicious bots, scraping tools, credential stuffers |
| **Body Inspection** | Max request body limit: 30 MB | Allows legitimate 25MB engineering drawings while mitigating payload bloat attacks |

---

## 4. Path-Specific Custom Rules & Rate Limiting

Configure the following custom WAF rules within the Azure Front Door WAF policy:

### Rule 1: Authentication Rate Limiting (`RateLimitAuth`)
- **Applies to:** `/api/auth/*`, `/api/v1/auth/*`
- **Rate Limit Window:** 1 minute (60 seconds)
- **Threshold:** 20 requests per client IP
- **Action:** `Block` with `HTTP 429 Too Many Requests`
- **Purpose:** Prevents brute force credential attacks and automated OAuth token polling abuse.

### Rule 2: Purchase Order Upload & Document Intelligence Rate Limiting (`RateLimitUpload`)
- **Applies to:** `/api/v1/purchase-orders/upload`, `/api/v1/purchase-orders/from-extraction`
- **Rate Limit Window:** 1 minute (60 seconds)
- **Threshold:** 30 requests per client IP
- **Action:** `Block` with `HTTP 429 Too Many Requests`
- **Purpose:** Protects AI document extraction and optical recognition pipelines from computational exhaustion.

### Rule 3: Heavy Financial & PDF Export Operations (`RateLimitHeavyOps`)
- **Applies to:** 
  - `/api/v1/quotations/*/calculate`
  - `/api/v1/quotations/*/finalize`
  - `/api/v1/quotations/*/pdf`
  - `/api/v1/quotations/*/send-email`
- **Rate Limit Window:** 1 minute (60 seconds)
- **Threshold:** 40 requests per client IP
- **Action:** `Block` with `HTTP 429 Too Many Requests`
- **Purpose:** Defends against ReportLab PDF generation DoS, email flood abuse, and pricing engine thrashing.

### Rule 4: Restrict HTTP Methods (`DisallowUnsafeMethods`)
- **Condition:** Request Method NOT IN `GET`, `HEAD`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`
- **Action:** `Block` (HTTP 405 Method Not Allowed)
- **Purpose:** Drops arbitrary/dangerous HTTP verbs (`TRACE`, `TRACK`, `CONNECT`, `DEBUG`).

---

## 5. Deployment Script (Azure CLI)

Run this bash script in the Azure Cloud Shell or deploy using your CI/CD pipeline:

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Variables
RESOURCE_GROUP="rg-quotation-ai-prod"
LOCATION="eastus"
AFD_PROFILE="afd-quotation-ai-prod"
WAF_POLICY_NAME="wafquotationaiprod"
FRONTEND_ENDPOINT="quotation-ai"

echo "Creating Azure Front Door WAF Policy..."
az network front-door waf-policy create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WAF_POLICY_NAME" \
  --sku Premium \
  --mode Detection

echo "Adding Managed Rule Sets (DRS 2.1 & Bot Manager)..."
az network front-door waf-policy managed-rules add \
  --resource-group "$RESOURCE_GROUP" \
  --policy-name "$WAF_POLICY_NAME" \
  --type Microsoft_DefaultRuleSet \
  --version 2.1

az network front-door waf-policy managed-rules add \
  --resource-group "$RESOURCE_GROUP" \
  --policy-name "$WAF_POLICY_NAME" \
  --type Microsoft_BotManagerRuleSet \
  --version 1.0

echo "Adding Custom Rate Limiting Rule for Auth Endpoints..."
az network front-door waf-policy rule create \
  --resource-group "$RESOURCE_GROUP" \
  --policy-name "$WAF_POLICY_NAME" \
  --name "RateLimitAuth" \
  --priority 100 \
  --rule-type RateLimitRule \
  --rate-limit-duration 1 \
  --rate-limit-threshold 20 \
  --action Block

az network front-door waf-policy rule match-condition add \
  --resource-group "$RESOURCE_GROUP" \
  --policy-name "$WAF_POLICY_NAME" \
  --name "RateLimitAuth" \
  --match-variable RequestUri \
  --operator Contains \
  --values "/api/v1/auth"

echo "Enabling Diagnostic Logging to Azure Monitor Log Analytics..."
# Link WAF Policy and Front Door to Log Analytics Workspace for monitoring and alerting
```

---

## 6. Phased Rollout & Tuning Strategy

### Phase 1: Detection Mode (Days 1–5)
1. Deploy WAF in **Detection** mode.
2. In Azure Monitor, query WAF events:
   ```kusto
   AzureDiagnostics
   | where ResourceProvider == "MICROSOFT.NETWORK" and Category == "FrontDoorWebApplicationFirewallLog"
   | summarize count() by ruleName_s, action_s, requestUri_s, clientIP_s
   | order by count_ desc
   ```
3. Verify that multipart form uploads (`/api/v1/purchase-orders/upload` and `/api/v1/company/logo`) do not trigger false-positive SQLi or generic payload rules.
4. If a legitimate manufacturing drawing part name (e.g., `1/2" SS304 Nipple`) triggers an inspection anomaly:
   - Add a **narrow exemption** scoped specifically to that rule ID and URI path.
   - **Never disable the ruleset globally.**

### Phase 2: Prevention Mode (Day 6+)
1. Transition WAF policy from **Detection** to **Prevention** mode:
   ```bash
   az network front-door waf-policy update \
     --resource-group "$RESOURCE_GROUP" \
     --name "$WAF_POLICY_NAME" \
     --mode Prevention
   ```
2. Verify that malicious payloads (e.g. `curl -X POST /api/v1/auth/signup -d '{"company_name":"<script>alert(1)</script>"}'`) receive HTTP 403 Forbidden at the edge.

---

## 7. Manual Azure Portal Checklist (For Cloud Administrator)

- [ ] Confirm Azure Front Door SKU is **Premium**.
- [ ] Confirm WAF Policy is attached to the Front Door Security Policy / Endpoint.
- [ ] Record the Front Door Profile ID GUID (`az afd profile show ... --query frontDoorId -o tsv`).
- [ ] Configure `AZURE_FRONT_DOOR_ID=<profile-guid>` in Azure Container Apps backend environment variables.
- [ ] Verify that navigating directly to the container app FQDN returns `403 Forbidden` ("Direct origin access forbidden").
- [ ] Configure Azure Monitor Alert rule for any spike in WAF `Block` actions (> 50 blocks in 5 minutes).
