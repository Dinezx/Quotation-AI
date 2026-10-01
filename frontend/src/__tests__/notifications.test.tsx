import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationDropdown } from '../components/notifications/NotificationDropdown';
import { NotificationItemView } from '../components/notifications/NotificationItemView';
import { AllNotificationsModal } from '../components/notifications/AllNotificationsModal';
import * as useNotificationsModule from '../hooks/useNotifications';
import { NotificationItem } from '../api/notificationApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Notification System Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const now = new Date();
  const sampleNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      company_id: 'comp-1',
      type: 'PO_NEEDS_REVIEW',
      title: 'PO Requires Review',
      message: 'PO-1024 requires human review before approval.',
      entity_type: 'PURCHASE_ORDER',
      entity_id: 'po-1024',
      severity: 'WARNING',
      is_read: false,
      read_at: null,
      created_at: now.toISOString(), // Today
    },
    {
      id: 'notif-2',
      company_id: 'comp-1',
      type: 'QUOTATION_FINALIZED',
      title: 'Quotation QT-2026-0192 Finalized',
      message: 'Quotation QT-2026-0192 was approved and finalized.',
      entity_type: 'QUOTATION',
      entity_id: 'qt-0192',
      severity: 'SUCCESS',
      is_read: true,
      read_at: now.toISOString(),
      created_at: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(), // Yesterday
    },
    {
      id: 'notif-3',
      company_id: 'comp-1',
      type: 'CALCULATION_BLOCKED',
      title: 'Calculation Blocked: EN24 Rate Missing',
      message: 'Missing raw material grade rate blocking calculation.',
      entity_type: 'RATE',
      entity_id: 'po-1024',
      severity: 'WARNING',
      is_read: false,
      read_at: null,
      created_at: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(), // Earlier
    },
  ];

  it('renders unread badge when unread notifications exist', () => {
    vi.spyOn(useNotificationsModule, 'useNotifications').mockReturnValue({
      notifications: sampleNotifications,
      total: 3,
      unreadCount: 2,
      page: 1,
      pageSize: 15,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      markAsRead: vi.fn(),
      markAsReadAsync: vi.fn(),
      isMarkingRead: false,
      markAllAsRead: vi.fn(),
      markAllAsReadAsync: vi.fn(),
      isMarkingAllRead: false,
    });

    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>
    );

    const badge = screen.getByTestId('notification-unread-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('2');
  });

  it('hides unread badge when unreadCount is 0', () => {
    vi.spyOn(useNotificationsModule, 'useNotifications').mockReturnValue({
      notifications: [],
      total: 0,
      unreadCount: 0,
      page: 1,
      pageSize: 15,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      markAsRead: vi.fn(),
      markAsReadAsync: vi.fn(),
      isMarkingRead: false,
      markAllAsRead: vi.fn(),
      markAllAsReadAsync: vi.fn(),
      isMarkingAllRead: false,
    });

    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('notification-unread-badge')).not.toBeInTheDocument();
  });

  it('opens dropdown and displays grouped workflow notifications', () => {
    const markAllAsReadMock = vi.fn();

    vi.spyOn(useNotificationsModule, 'useNotifications').mockReturnValue({
      notifications: sampleNotifications,
      total: 3,
      unreadCount: 2,
      page: 1,
      pageSize: 15,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      markAsRead: vi.fn(),
      markAsReadAsync: vi.fn(),
      isMarkingRead: false,
      markAllAsRead: markAllAsReadMock,
      markAllAsReadAsync: vi.fn(),
      isMarkingAllRead: false,
    });

    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>
    );

    const bell = screen.getByTestId('notification-bell-button');
    fireEvent.click(bell);

    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getAllByText('Yesterday').length).toBeGreaterThan(0);
    expect(screen.getByText('Earlier')).toBeInTheDocument();
    expect(screen.getByText('PO Requires Review')).toBeInTheDocument();
    expect(screen.getByText('Quotation QT-2026-0192 Finalized')).toBeInTheDocument();
    expect(screen.getByText('Calculation Blocked: EN24 Rate Missing')).toBeInTheDocument();

    // Mark all as read button
    const markAllBtn = screen.getByTestId('mark-all-read-button');
    fireEvent.click(markAllBtn);
    expect(markAllAsReadMock).toHaveBeenCalledTimes(1);
  });

  it('navigates to related object and marks notification as read on click', () => {
    const markReadMock = vi.fn();
    const navigateMock = vi.fn();

    render(
      <NotificationItemView
        notification={sampleNotifications[0]} // PO
        onMarkRead={markReadMock}
        onNavigate={navigateMock}
      />
    );

    const item = screen.getByTestId('notification-item-notif-1');
    fireEvent.click(item);

    expect(markReadMock).toHaveBeenCalledWith('notif-1');
    expect(navigateMock).toHaveBeenCalledWith('/review/po-1024');
  });

  it('navigates to quotation for quotation notifications', () => {
    const markReadMock = vi.fn();
    const navigateMock = vi.fn();

    render(
      <NotificationItemView
        notification={sampleNotifications[1]} // Quotation
        onMarkRead={markReadMock}
        onNavigate={navigateMock}
      />
    );

    const item = screen.getByTestId('notification-item-notif-2');
    fireEvent.click(item);

    expect(navigateMock).toHaveBeenCalledWith('/quotation/qt-0192');
  });

  it('navigates to rates for calculation blocked rate notifications', () => {
    const markReadMock = vi.fn();
    const navigateMock = vi.fn();

    render(
      <NotificationItemView
        notification={sampleNotifications[2]} // Rate issue
        onMarkRead={markReadMock}
        onNavigate={navigateMock}
      />
    );

    const item = screen.getByTestId('notification-item-notif-3');
    fireEvent.click(item);

    expect(navigateMock).toHaveBeenCalledWith('/rates');
  });

  it('renders "You\'re all caught up" empty state when no notifications exist', () => {
    vi.spyOn(useNotificationsModule, 'useNotifications').mockReturnValue({
      notifications: [],
      total: 0,
      unreadCount: 0,
      page: 1,
      pageSize: 15,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      markAsRead: vi.fn(),
      markAsReadAsync: vi.fn(),
      isMarkingRead: false,
      markAllAsRead: vi.fn(),
      markAllAsReadAsync: vi.fn(),
      isMarkingAllRead: false,
    });

    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('notification-bell-button'));
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
  });

  it('renders error state and provides retry action on failure', () => {
    const refetchMock = vi.fn();

    vi.spyOn(useNotificationsModule, 'useNotifications').mockReturnValue({
      notifications: [],
      total: 0,
      unreadCount: 0,
      page: 1,
      pageSize: 15,
      isLoading: false,
      isError: true,
      error: new Error('API Network Failure'),
      refetch: refetchMock,
      markAsRead: vi.fn(),
      markAsReadAsync: vi.fn(),
      isMarkingRead: false,
      markAllAsRead: vi.fn(),
      markAllAsReadAsync: vi.fn(),
      isMarkingAllRead: false,
    });

    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('notification-bell-button'));
    expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();

    const retryBtn = screen.getByText('Retry');
    fireEvent.click(retryBtn);
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('renders AllNotificationsModal with pagination controls and filter options', () => {
    vi.spyOn(useNotificationsModule, 'useNotifications').mockReturnValue({
      notifications: sampleNotifications,
      total: 25,
      unreadCount: 2,
      page: 1,
      pageSize: 10,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      markAsRead: vi.fn(),
      markAsReadAsync: vi.fn(),
      isMarkingRead: false,
      markAllAsRead: vi.fn(),
      markAllAsReadAsync: vi.fn(),
      isMarkingAllRead: false,
    });

    render(
      <AllNotificationsModal
        isOpen={true}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText('All Notifications')).toBeInTheDocument();
    expect(screen.getByText('All (25)')).toBeInTheDocument();
    expect(screen.getByText('Unread only (2)')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3 (25 total)')).toBeInTheDocument();
  });
});
