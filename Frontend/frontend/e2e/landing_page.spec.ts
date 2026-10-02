import { test, expect } from '@playwright/test';

test.describe('ORYNZA — Interactive manufacturing landing page', () => {
  test('renders the public landing page and premium hero', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Turn customer POs into');
    await expect(page.locator('h1')).toContainText('production-ready quotations');
    await expect(page.locator('body')).toContainText('Purchase order intelligence');
    await expect(page.locator('body')).toContainText('Authoritative database rates');
    await expect(page.locator('body')).toContainText('Zero AI price invention');
  });

  test('navigation exposes the main product sections and auth actions', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: 'How It Works' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Platform' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Why ORYNZA' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Pricing' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'FAQ' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Sign Up Free/i })).toBeVisible();
  });

  test('workflow scene contains the continuous quotation states', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText('One system. Five states. One continuous story.');
    await expect(page.locator('body')).toContainText('Purchase Order');
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toContainText(/AI Extraction|Intelligent Costing|Quotation|Ready to Send/);
  });

  test('pricing plans and enterprise CTA render', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText('Job Shop Edition');
    await expect(page.locator('body')).toContainText('Production Facility');
    await expect(page.locator('body')).toContainText('Multi-Plant Enterprise');
    await expect(page.locator('body')).toContainText('₹14,999');
    await expect(page.locator('body')).toContainText('₹34,999');
    await expect(page.getByRole('button', { name: 'Contact Enterprise Sales' })).toBeVisible();
  });

  test('FAQ accordion expands and collapses', async ({ page }) => {
    await page.goto('/');
    const gstFaq = page.getByRole('button', { name: /How are statutory GST and bank remittance details formatted on the PDF/i });
    await expect(gstFaq).toBeVisible();
    await gstFaq.click();
    await expect(page.locator('body')).toContainText(/HSN\/SAC code/i);
    await expect(page.locator('body')).toContainText(/CGST/i);
  });

  test('plant pilot modal opens, submits and closes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Contact Enterprise Sales' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText(/Request 14-Day Plant Pilot/i);
    await page.getByRole('button', { name: /Close modal/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('login navigation remains connected to the existing auth flow', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
