import { test, expect } from '@playwright/test';

test.describe('Quotation AI — Authoritative Production Notification Workflow', () => {
  const authPayload = {
    user: {
      id: 'usr-bpe-001',
      email: 'r.deshmukh@bharatprecision.co.in',
      full_name: 'Rajesh Deshmukh',
      role: 'ADMIN',
      company_id: 'comp-bpe-pune',
    },
    company: {
      id: 'comp-bpe-pune',
      name: 'Bharat Precision Engineering',
      legal_name: 'Bharat Precision Engineering Pvt Ltd',
      gstin: '27AAACB1234F1Z8',
      settings: {},
    },
  };

  const now = new Date();
  const mockNotifications = [
    {
      id: 'notif-e2e-1',
      company_id: 'comp-bpe-pune',
      type: 'PO_NEEDS_REVIEW',
      title: 'PO Requires Review',
      message: 'PO-1024 requires human review before approval.',
      entity_type: 'PURCHASE_ORDER',
      entity_id: 'po-1024',
      severity: 'WARNING',
      is_read: false,
      read_at: null,
      created_at: now.toISOString(),
    },
    {
      id: 'notif-e2e-2',
      company_id: 'comp-bpe-pune',
      type: 'QUOTATION_FINALIZED',
      title: 'Quotation QT-2026-0192 Finalized',
      message: 'Quotation QT-2026-0192 was approved and finalized.',
      entity_type: 'QUOTATION',
      entity_id: 'qt-0192',
      severity: 'SUCCESS',
      is_read: true,
      read_at: now.toISOString(),
      created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Auth route mock
    await page.route(/\/api\/v1\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(authPayload),
      });
    });

    // Provide token in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('quotation_ai_auth_token', 'mock-valid-e2e-jwt');
    });
  });

  test('1. Unread badge displays correct count and popover displays grouped notifications', async ({ page }) => {
    let unreadCount = 1;

    await page.route(/\/api\/v1\/notifications\/unread-count/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unread_count: unreadCount }),
      });
    });

    await page.route(/\/api\/v1\/notifications(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: mockNotifications,
          total: 2,
          unread_count: unreadCount,
          page: 1,
          page_size: 15,
        }),
      });
    });

    await page.route(/\/api\/v1\/notifications\/read-all/, async (route) => {
      unreadCount = 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, marked_count: 1 }),
      });
    });

    await page.goto('/rates');

    // 1. Verify notification bell button is visible
    const bellBtn = page.getByTestId('notification-bell-button');
    await expect(bellBtn).toBeVisible({ timeout: 10000 });

    // 2. Verify unread badge shows count "1"
    const unreadBadge = page.getByTestId('notification-unread-badge');
    await expect(unreadBadge).toBeVisible({ timeout: 10000 });
    await expect(unreadBadge).toHaveText('1');

    // 3. Open notification popover dropdown
    await bellBtn.click();
    const dropdown = page.getByTestId('notification-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // 4. Verify grouped headers and notifications
    await expect(dropdown.getByText('Today')).toBeVisible();
    await expect(dropdown.getByText('PO Requires Review')).toBeVisible();
    await expect(dropdown.getByText('PO-1024 requires human review before approval.')).toBeVisible();

    // 5. Test Mark All as Read
    const markAllBtn = page.getByTestId('mark-all-read-button');
    await expect(markAllBtn).toBeVisible();
    await markAllBtn.click();
  });

  test('2. Clicking PO notification navigates to PO Review', async ({ page }) => {
    await page.route(/\/api\/v1\/notifications\/unread-count/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unread_count: 1 }),
      });
    });

    await page.route(/\/api\/v1\/notifications(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: mockNotifications,
          total: 2,
          unread_count: 1,
          page: 1,
          page_size: 15,
        }),
      });
    });

    await page.route(/\/api\/v1\/notifications\/notif-e2e-1\/read/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notification: {
            ...mockNotifications[0],
            is_read: true,
            read_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/rates');
    const bellBtn = page.getByTestId('notification-bell-button');
    await expect(bellBtn).toBeVisible({ timeout: 10000 });
    await bellBtn.click();

    const poNotif = page.getByTestId('notification-item-notif-e2e-1');
    await expect(poNotif).toBeVisible({ timeout: 5000 });
    await poNotif.click();

    // Navigates to PO review
    await expect(page).toHaveURL(/\/review\/po-1024/);
  });

  test('3. View All Notifications opens modal with pagination controls', async ({ page }) => {
    await page.route(/\/api\/v1\/notifications\/unread-count/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unread_count: 0 }),
      });
    });

    await page.route(/\/api\/v1\/notifications(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: mockNotifications,
          total: 12,
          unread_count: 0,
          page: 1,
          page_size: 10,
        }),
      });
    });

    await page.goto('/rates');
    const bellBtn = page.getByTestId('notification-bell-button');
    await expect(bellBtn).toBeVisible({ timeout: 10000 });
    await bellBtn.click();

    const viewAllBtn = page.getByTestId('view-all-notifications-button');
    await expect(viewAllBtn).toBeVisible({ timeout: 5000 });
    await viewAllBtn.click();

    // Modal dialog is displayed
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText('All Notifications')).toBeVisible();
    await expect(modal.getByText('Page 1 of 2 (12 total)')).toBeVisible();
  });

  test('4. Empty state displays "You\'re all caught up" when no notifications exist', async ({ page }) => {
    await page.route(/\/api\/v1\/notifications\/unread-count/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unread_count: 0 }),
      });
    });

    await page.route(/\/api\/v1\/notifications(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          total: 0,
          unread_count: 0,
          page: 1,
          page_size: 15,
        }),
      });
    });

    await page.goto('/rates');
    const bellBtn = page.getByTestId('notification-bell-button');
    await expect(bellBtn).toBeVisible({ timeout: 10000 });
    await bellBtn.click();

    await expect(page.getByText("You're all caught up")).toBeVisible({ timeout: 5000 });
  });
});
