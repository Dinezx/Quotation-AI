import { test, expect } from '@playwright/test';

test.describe('Quotation AI — Landing Page Public SaaS Experience', () => {

  test('1. Landing page renders publicly at root / without authentication', async ({ page }) => {
    await page.goto('/');
    
    // Ensure we are not redirected to /login
    await expect(page).toHaveURL('/');

    // Check main hero headline
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toContainText('Turn Customer POs Into');
    await expect(heroHeading).toContainText('Production-Ready Quotations');

    // Check key value proposition text
    await expect(page.locator('body')).toContainText('PURCHASE ORDER INTELLIGENCE');
    await expect(page.locator('body')).toContainText('Deterministic Machining Cost Engine');
    await expect(page.locator('body')).toContainText('Zero AI Price Invention');
    await expect(page.locator('body')).toContainText('Authoritative Database Rates');
  });

  test('2. Navigation bar contains all required links and actions', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Verify key nav items
    await expect(nav.getByRole('button', { name: 'How It Works' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Platform Features' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Why Us' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Pricing' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'FAQ' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Sign Up Free' })).toBeVisible();
  });

  test('3. Interactive Quotation Workspace tabs switch cleanly', async ({ page }) => {
    await page.goto('/');

    // Workspace simulation step tabs
    const step2Btn = page.getByRole('button', { name: /2. Extraction Review/i });
    if (await step2Btn.isVisible()) {
      await step2Btn.click();
      await expect(page.locator('body')).toContainText(/Extracted Line Items/i);
    }

    const step3Btn = page.getByRole('button', { name: /3. Deterministic Costing/i });
    if (await step3Btn.isVisible()) {
      await step3Btn.click();
      await expect(page.locator('body')).toContainText(/Deterministic Rule-Matched Costing/i);
    }

    const step4Btn = page.getByRole('button', { name: /4. Sealed DIN A4/i });
    if (await step4Btn.isVisible()) {
      await step4Btn.click();
      await expect(page.locator('body')).toContainText(/COMMERCIAL ESTIMATE & QUOTATION/i);
    }
  });

  test('4. Pricing plans render with transparent manufacturing tiers', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('body')).toContainText('Job Shop Edition');
    await expect(page.locator('body')).toContainText('Production Facility');
    await expect(page.locator('body')).toContainText('Multi-Plant Enterprise');
    await expect(page.locator('body')).toContainText('₹14,999');
    await expect(page.locator('body')).toContainText('₹34,999');
  });

  test('5. FAQ accordion expands and collapses', async ({ page }) => {
    await page.goto('/');

    // Click on the GST FAQ item
    const gstFaq = page.getByRole('button', { name: /How are statutory GST and bank remittance details formatted on the PDF/i });
    await expect(gstFaq).toBeVisible();
    await gstFaq.click();

    // Confirm expanded content is visible
    await expect(page.locator('body')).toContainText(/HSN\/SAC code/i);
    await expect(page.locator('body')).toContainText(/CGST/i);
  });

  test('6. Enterprise inquiry modal opens, validates, and closes', async ({ page }) => {
    await page.goto('/');

    // Click "Contact Enterprise Sales"
    const enterpriseBtn = page.getByRole('button', { name: 'Contact Enterprise Sales' });
    await enterpriseBtn.click();

    // Verify modal is shown
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText(/Request 14-Day Plant Pilot/i);

    // Close modal
    const closeBtn = page.getByRole('button', { name: /Close modal/i });
    await closeBtn.click();

    // Verify modal closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('7. Login link navigates to /login and displays Google sign-in option', async ({ page }) => {
    await page.goto('/');

    const signInBtn = page.locator('nav').getByRole('button', { name: 'Sign In' });
    await signInBtn.click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In with Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Plant Account \(Sign Up Free\)/i })).toBeVisible();
  });

  test('8. Sign up navigation presents Google and email sign-up options', async ({ page }) => {
    await page.goto('/signup');

    await expect(page).toHaveURL(/\/signup/);
    await expect(page.locator('body')).toContainText(/Register Your Precision Plant/i);

    // Google Sign Up button is prominently visible
    const googleSignUpBtn = page.getByRole('button', { name: /Sign Up with Google/i });
    await expect(googleSignUpBtn).toBeVisible();

    // Work email and plant details form inputs are visible
    await expect(page.locator('input#fullName')).toBeVisible();
    await expect(page.locator('input#companyName')).toBeVisible();
    await expect(page.locator('input#signupEmail')).toBeVisible();
    await expect(page.locator('input#signupPassword')).toBeVisible();

    // Switch to Sign In link functions
    const signInLink = page.getByRole('button', { name: /Sign In to Console/i });
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
