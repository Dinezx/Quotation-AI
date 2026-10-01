import { test, expect } from '@playwright/test';

test.describe('Quotation AI — Google OAuth & First-Time Company Onboarding', () => {

  test('1. LoginPage displays professional "Continue with Google" button', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL(/\/login/);

    // Verify "Continue with Google" button is visible and active
    const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
    await expect(googleBtn).toBeVisible();

    // Verify standard enterprise work email form is present alongside
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('body')).toContainText(/or enter work email/i);
  });

  test('2. OAuth Cancellation handling renders user-friendly recovery state', async ({ page }) => {
    // Simulate user clicking "Cancel" on Google consent screen
    await page.goto('/auth/callback?error=access_denied');

    await expect(page.locator('body')).toContainText(/Sign In Was Not Completed/i);
    await expect(page.locator('body')).toContainText(/Google Sign In was cancelled/i);

    const retryBtn = page.getByRole('button', { name: /Try Google Again/i });
    const returnBtn = page.getByRole('button', { name: /Return to Sign In/i });
    await expect(retryBtn).toBeVisible();
    await expect(returnBtn).toBeVisible();

    await returnBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('2b. OAuth Redirect URI Mismatch (Error 400) renders actionable recovery guidance', async ({ page }) => {
    await page.goto('/auth/callback?error=redirect_uri_mismatch&error_description=The+redirect+URI+in+the+request+does+not+match');

    await expect(page.locator('body')).toContainText(/Redirect URI Mismatch/i);
    await expect(page.locator('body')).toContainText(/Google Cloud Console/i);
    await expect(page.locator('body')).toContainText(/Supabase/i);

    const returnBtn = page.getByRole('button', { name: /Return to Sign In/i });
    await expect(returnBtn).toBeVisible();
    await returnBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('3. Expired OAuth session state displays clear timeout message', async ({ page }) => {
    // Navigate to callback without valid token or code
    await page.goto('/auth/callback');

    await expect(page.locator('body')).toContainText(/Authentication Window Timed Out/i);
    const returnBtn = page.getByRole('button', { name: /Return to Sign In/i });
    await expect(returnBtn).toBeVisible();

    await returnBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('4. Complete Google Sign-In -> First-Time Onboarding -> Dashboard workflow', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `plant.lead.${timestamp}@precision-mfg.in`;
    const mockToken = `mock-token-${timestamp}`;

    // Mock backend /auth/me for new un-onboarded user (403: No associated tenant company)
    let isOnboarded = false;
    let createdCompanyId = `comp-onboard-${timestamp}`;

    await page.route('**/api/v1/auth/me', async (route) => {
      if (!isOnboarded) {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'User has no associated tenant company' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: `usr-google-${timestamp}`,
              email: testEmail,
              full_name: 'Rajesh Deshmukh',
              role: 'ADMIN',
              company_id: createdCompanyId,
            },
            company: {
              id: createdCompanyId,
              name: 'Shree Precision Works',
              legal_name: 'Shree Precision Works LLP',
              gstin: '27AABCU9603R1ZM',
              address: 'Plot 48, MIDC Bhosari, Pune, MH 411026',
              phone: '+91 20 2712 5500',
              email: testEmail,
              settings: {},
            },
          }),
        });
      }
    });

    // Mock backend /auth/onboarding
    await page.route('**/api/v1/auth/onboarding', async (route) => {
      const requestData = JSON.parse(route.request().postData() || '{}');
      
      // Invariant check: frontend must never choose or spoof company_id
      expect(requestData).not.toHaveProperty('company_id');
      expect(requestData.company_name).toBe('Shree Precision Works');

      isOnboarded = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          message: 'Company onboarding completed successfully.',
          user: {
            id: `usr-google-${timestamp}`,
            email: testEmail,
            full_name: requestData.full_name || 'Rajesh Deshmukh',
            role: 'ADMIN',
            company_id: createdCompanyId,
          },
          company: {
            id: createdCompanyId,
            name: requestData.company_name,
            legal_name: requestData.legal_name || requestData.company_name,
            gstin: requestData.gstin || '27AABCU9603R1ZM',
            address: requestData.address,
            phone: requestData.phone,
            email: requestData.contact_email || testEmail,
            settings: {},
          },
        }),
      });
    });

    // Mock dashboard summary so dashboard view renders cleanly
    const mockDashboardData = {
      period: 'this_month',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      kpis: {
        quotations_created: 12,
        pending_po_review: 2,
        draft_quotations: 3,
        finalized_quotations: 7,
        total_quotation_value: 840000,
        quotation_value: 840000,
        finalized_quotation_value: 620000,
      },
      quotation_activity: [],
      status_breakdown: [],
      value_trend: [],
      pending_actions: [],
      recent_quotations: [],
      recent_activity: [],
      customer_activity: {
        total_active_customers: 4,
        customers_with_quotations: 3,
        top_customers: [],
        recent_customers: [],
      },
      email_summary: {
        sent: 6,
        failed: 0,
        pending: 1,
        not_sent: 0,
        total: 7,
        success_rate: 100,
      },
    };

    await page.route('**/api/v1/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardData),
      });
    });

    // 1. Simulate Google OAuth callback redirect for new user
    await page.goto(`/auth/callback?mock_oauth=new_user&token=${mockToken}`);

    // 2. Expect redirection to /onboarding instead of generic 403 error
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.locator('h1')).toContainText(/Company & Works Profile/i);
    await expect(page.locator('body')).toContainText(/First-Time Facility Registration/i);

    // 3. Fill in the statutory onboarding details
    await page.locator('input#companyName').fill('Shree Precision Works');
    await page.locator('input#legalName').fill('Shree Precision Works LLP');
    await page.locator('input#gstin').fill('27AABCU9603R1ZM');
    await page.locator('textarea#address').fill('Plot 48, MIDC Bhosari, Pune, MH 411026');
    await page.locator('input#phone').fill('+91 20 2712 5500');
    await page.locator('input#contactEmail').fill(testEmail);

    // 4. Submit the onboarding form
    const submitBtn = page.getByRole('button', { name: /Complete Onboarding & Enter Dashboard/i });
    await expect(submitBtn).toBeVisible();
    await page.waitForTimeout(250);
    await submitBtn.click();

    // 5. Expect redirection directly to Dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toContainText(/Costing & Quotation Cockpit/i);
    await expect(page.locator('body')).toContainText(/Shree Precision Works/i);
  });

  test('5. Existing user with company bypasses onboarding and routes directly to Dashboard', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `existing.engineer.${timestamp}@bharatprecision.co.in`;
    const mockToken = `mock-existing-token-${timestamp}`;

    // Mock backend /auth/me for existing user (returns 200 with associated company)
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: `usr-existing-${timestamp}`,
            email: testEmail,
            full_name: 'Vikram Joshi',
            role: 'ADMIN',
            company_id: 'comp-bpe-pune',
          },
          company: {
            id: 'comp-bpe-pune',
            name: 'Bharat Precision Engineering',
            legal_name: 'Bharat Precision Engineering Pvt Ltd',
            gstin: '27AAACB1234F1Z8',
            address: 'Gat No. 248, Alandi-Markal Road, Pune',
            phone: '+91 20 2712 8840',
            email: testEmail,
            settings: {},
          },
        }),
      });
    });

    await page.route('**/api/v1/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          period: 'this_month',
          start_date: '2026-09-01',
          end_date: '2026-09-30',
          kpis: {
            quotations_created: 18,
            pending_po_review: 1,
            draft_quotations: 2,
            finalized_quotations: 15,
            total_quotation_value: 1250000,
            quotation_value: 1250000,
            finalized_quotation_value: 1100000,
          },
          quotation_activity: [],
          status_breakdown: [],
          value_trend: [],
          pending_actions: [],
          recent_quotations: [],
          recent_activity: [],
          customer_activity: {
            total_active_customers: 8,
            customers_with_quotations: 6,
            top_customers: [],
            recent_customers: [],
          },
          email_summary: {
            sent: 14,
            failed: 0,
            pending: 1,
            not_sent: 0,
            total: 15,
            success_rate: 100,
          },
        }),
      });
    });

    // 1. Simulate Google OAuth callback redirect for existing user
    await page.goto(`/auth/callback?mock_oauth=existing_user&token=${mockToken}`);

    // 2. Expect immediate redirect directly to /dashboard without showing /onboarding
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toContainText(/Costing & Quotation Cockpit/i);
    await expect(page.locator('body')).toContainText(/Bharat Precision/i);
  });

});
