# Google OAuth & First-Time Company Onboarding Setup Guide

This document describes how to configure Google OAuth with Supabase Auth and Quotation AI's secure tenant onboarding architecture.

---

## 1. Architecture Overview

Quotation AI leverages an enterprise federated authentication pattern:

```
[ User Browser ]
       │
       ▼ (1) Click "Continue with Google"
[ Supabase Auth (OAuth Client) ]
       │
       ▼ (2) Google Consent Screen (Prompt / Select Account)
[ Google Identity Provider ]
       │
       ▼ (3) Redirect with PKCE code
[ Supabase Callback URL ] (https://<project-ref>.supabase.co/auth/v1/callback)
       │
       ▼ (4) Exchange PKCE code for Supabase JWT
[ Quotation AI Frontend (/auth/callback) ]
       │
       ▼ (5) GET /api/v1/auth/me (Authorization: Bearer <supabase_jwt>)
[ Quotation AI FastAPI Backend ]
       │
   ┌───┴─────────────────────────────────────────┐
   │ Check user email / sub in tenant database   │
   └───┬─────────────────────────────────────┬───┘
       │ (User associated with company)      │ (New user / no company)
       ▼ (HTTP 200)                          ▼ (HTTP 403: "No associated company")
[ Direct -> /dashboard ]              [ Redirect -> /onboarding ]
                                             │
                                             ▼ Fill plant details & submit
                                      [ POST /api/v1/auth/onboarding ]
                                             │
                                             ▼
                                      • Generates cryptographically secure `company_id`
                                      • Creates tenant company & statutory GST profile
                                      • Pre-seeds benchmark machine rates
                                      • Associates verified Supabase user as ADMIN
                                             │
                                             ▼
                                      [ Redirect -> /dashboard ]
```

### Security & Tenancy Invariants
1. **Never Trust Frontend for `company_id`:** The frontend cannot select, spoof, or provide a `company_id`. The server strictly generates `company_id` (e.g. `comp-<slug>-<uuid4>`).
2. **Asymmetric JWT Verification:** The backend verifies Supabase asymmetric JWTs (via RS256/ES256 JWKS or configured symmetric secret) extracting the immutable `sub` and `email` claims.
3. **Indian Statutory Compliance:** Onboarding collects plant name, physical factory address, plant phone, contact email, and validates statutory 15-character GSTIN format.

---

## 2. Google Cloud Platform (GCP) Configuration

### Step A: Configure OAuth Consent Screen
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project or create a new one (e.g., `quotation-ai-prod`).
3. Navigate to **APIs & Services** > **OAuth consent screen**.
4. Select **External** User Type and click **Create**.
5. Fill in the App Information:
   - **App name:** `Quotation AI`
   - **User support email:** Your support or admin email.
   - **Application home page:** `https://app.quotationai.com` (or your domain).
   - **Authorized domains:**
     - `supabase.co`
     - `quotationai.com` (or your staging/production domain).
6. Scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
7. Save and continue.

### Step B: Create OAuth 2.0 Web Client Credentials
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** > **OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Quotation AI Supabase Auth`.
5. **Authorized JavaScript origins:**
   - `https://<your-supabase-project-ref>.supabase.co`
   - `https://app.quotationai.com`
   - `http://localhost:5173` (for local development)
6. **Authorized redirect URIs:**
   - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
   *(Important: This is Supabase's callback URL, NOT the frontend URL).*
7. Click **Create** and copy:
   - **Client ID**
   - **Client Secret**

---

## 3. Supabase Dashboard Configuration

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. In the sidebar, navigate to **Authentication** > **Providers**.
4. Find **Google** in the list and expand it:
   - Set **Google Enabled** to **ON**.
   - Paste the **Client ID** from GCP.
   - Paste the **Client Secret** from GCP.
   - (Optional) Toggle **Skip nonce checks** if needed.
   - Click **Save**.
5. In the sidebar, navigate to **Authentication** > **URL Configuration**:
   - **Site URL:** Set to your primary frontend application URL (e.g. `http://localhost:5173` or `https://app.quotationai.com`).
   - **Redirect URLs:** Add the following allowed URLs:
     - `http://localhost:5173/auth/callback`
     - `https://app.quotationai.com/auth/callback`
     - `https://staging.quotationai.com/auth/callback`
6. Click **Save**.

---

## 4. Frontend Environment Setup

The frontend connects to Supabase client-side using publishable anonymous keys:

```env
# Frontend .env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

> **Note on AGENTS.md compliance:**
> `.env` is protected and never modified by automated scripts. Configure your local or staging secrets in `.env` manually.

---

## 5. First-Time Company Onboarding Details

When an un-onboarded user signs in with Google:
1. `GET /api/v1/auth/me` returns `403 Forbidden` (`{"detail": "User has no associated tenant company"}`).
2. The frontend detects this state and routes to `/onboarding`.
3. The user provides:
   - **Plant / Trade Name** (e.g., `Shree Precision Works`)
   - **Statutory Legal Name** (e.g., `Shree Precision Works LLP`)
   - **GSTIN** (15-character alphanumeric, e.g., `27AABCU9603R1ZM`)
   - **Physical Factory / Works Address**
   - **Plant Phone / WhatsApp**
   - **Commercial Quotation Email**
4. Submitting dispatches `POST /api/v1/auth/onboarding` with the Bearer JWT.
5. The backend validates statutory data, provisions tenant tables, seeds baseline machine rates (CNC 4-Axis, Turning, Grinding) and benchmark materials (EN8, SS 304, AL 6061).
6. The user is redirected directly to `/dashboard` with full access to the Quotation AI Cockpit.

---

## 6. End-to-End Test Suite Verification

To verify the complete OAuth redirect, onboarding form validation, and existing user bypass:

```bash
cd frontend
npx playwright test e2e/google_oauth_onboarding.spec.ts
```

All 5 automated E2E test cases:
- [x] LoginPage displays professional "Continue with Google" button
- [x] OAuth Cancellation handling renders user-friendly recovery state
- [x] Expired OAuth session state displays clear timeout message
- [x] Complete Google Sign-In -> First-Time Onboarding -> Dashboard workflow
- [x] Existing user with company bypasses onboarding and routes directly to Dashboard
