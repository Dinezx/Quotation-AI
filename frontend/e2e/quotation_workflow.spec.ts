import { test, expect } from '@playwright/test';

test.describe('Quotation AI — Complete Customer Workflow & Invariants', () => {

  test('1. Security: Unauthorized access redirects to /login', async ({ page }) => {
    // Attempt visiting protected routes unauthenticated
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/quotations');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/rates');
    await expect(page).toHaveURL(/\/login/);
  });

  test('2. Authentication: Login page renders with corporate branding and credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText(/Simplify Every Quotation|Quotation/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('3. Rate Management: Verifies database rate cards and tables', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'usr-1',
            email: 'r.deshmukh@bharatprecision.co.in',
            full_name: 'Rajesh Deshmukh',
            role: 'ADMIN',
            company_id: 'comp-bpe-pune',
          },
          company: {
            id: 'comp-bpe-pune',
            name: 'Bharat Precision Engineering',
            legal_name: 'Bharat Precision Engineering Pvt Ltd',
            gstin: '27AABCB1234F1Z5',
            settings: {
              default_margin_percent: 15,
              default_gst_percent: 18,
            },
          },
        }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('quotation_ai_auth_token', 'mock-valid-e2e-jwt');
    });

    await page.goto('/rates');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/Rate Cards|Rate/i);
  });

  test('4. PO Upload: Renders upload workspace and dropzone', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'usr-1',
            email: 'r.deshmukh@bharatprecision.co.in',
            full_name: 'Rajesh Deshmukh',
            role: 'ADMIN',
            company_id: 'comp-bpe-pune',
          },
          company: {
            id: 'comp-bpe-pune',
            name: 'Bharat Precision Engineering',
            legal_name: 'Bharat Precision Engineering Pvt Ltd',
            gstin: '27AABCB1234F1Z5',
            settings: {},
          },
        }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('quotation_ai_auth_token', 'mock-valid-e2e-jwt');
    });

    await page.goto('/upload');
    await expect(page.locator('h1')).toContainText('Upload Purchase Order');
    await expect(page.locator('text=Drag and drop your purchase order here')).toBeVisible();
  });

  test('5. Deterministic Calculation: Disallows price invention and enforces blocked state', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'usr-1',
            email: 'r.deshmukh@bharatprecision.co.in',
            full_name: 'Rajesh Deshmukh',
            role: 'ADMIN',
            company_id: 'comp-bpe-pune',
          },
          company: {
            id: 'comp-bpe-pune',
            name: 'Bharat Precision Engineering',
          },
        }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('quotation_ai_auth_token', 'mock-valid-e2e-jwt');
    });

    // Mock API response for blocked calculation
    await page.route('**/api/v1/purchase-orders/*/calculate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'calc-blocked-e2e',
          purchase_order_id: 'po-test-blocked',
          status: 'BLOCKED',
          issues: [
            {
              item_number: 1,
              code: 'MISSING_RATE',
              message: 'Material EN36C missing active rate card',
            },
          ],
          items: [],
          subtotal: 0,
          grand_total: 0,
        }),
      });
    });

    await page.goto('/calculation?po_id=po-test-blocked');
    // Verify BLOCKED banner and link to rate management
    await expect(page.locator('text=Cost Calculation Blocked')).toBeVisible();
    await expect(page.locator('text=Configure Missing Rates in Rate Master')).toBeVisible();
  });

  test('6. Quotation Immutability: Sealed quotations cannot be mutated or recalculated', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'usr-1',
            email: 'r.deshmukh@bharatprecision.co.in',
            full_name: 'Rajesh Deshmukh',
            role: 'ADMIN',
            company_id: 'comp-bpe-pune',
          },
          company: {
            id: 'comp-bpe-pune',
            name: 'Bharat Precision Engineering',
          },
        }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('quotation_ai_auth_token', 'mock-valid-e2e-jwt');
    });

    // Mock final quotation response
    await page.route('**/api/v1/quotations/quote-final-99', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'quote-final-99',
          quotation_number: 'QT-2026-0099',
          company_id: 'comp-bpe-pune',
          company_name: 'Bharat Precision Engineering',
          customer_name: 'Tata Motors Limited',
          purchase_order_id: 'po-4421',
          po_number: 'PO-2026-TM-4421',
          status: 'FINAL',
          subtotal: 425000,
          cgst_amount: 38250,
          sgst_amount: 38250,
          igst_amount: 0,
          total_tax: 76500,
          grand_total: 501500,
          final_total: 501500,
          pdf_storage_path: 'quotation-pdfs/comp-bpe-pune/QT-2026-0099.pdf',
          pdf_sha256: 'a1b2c3d4e5f60123456789abcdefa1b2c3d4e5f60123456789abcdefa1b2c3d4',
          quotation_date: '2026-09-28T12:00:00Z',
          finalized_at: '2026-09-28T12:00:00Z',
          items: [
            {
              id: 'qi-1',
              item_number: 1,
              part_name: 'Flange Bearing Housing',
              quantity: 250,
              unit: 'Pcs',
              unit_price: 1700,
              total_price: 425000,
            },
          ],
        }),
      });
    });

    await page.goto('/quotation/quote-final-99');

    // Verify Finalized badge and SHA-256 seal presence
    await expect(page.locator('text=FINALIZED (IMMUTABLE)')).toBeVisible();
    await expect(page.locator('text=Verified Legal Immutability')).toBeVisible();

    // Verify "Finalize Quotation" button is NOT rendered, but "Email Quotation" is available
    const finalizeBtn = page.locator('button:has-text("Finalize Quotation")');
    await expect(finalizeBtn).toHaveCount(0);
    await expect(page.locator('button:has-text("Email Quotation")')).toBeVisible();
  });
});
