import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { groupNotifications } from './notificationUtils';
import { NotificationItemView } from './NotificationItemView';
import { AllNotificationsModal } from './AllNotificationsModal';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    refetch,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
    clearNotification,
    clearAllNotifications,
    isClearingAll,
  } = useNotifications({ page: 1, page_size: 15 });

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleNavigate = (url: string) => {
    setIsOpen(false);
    navigate(url);
  };

  const grouped = groupNotifications(notifications);
  const hasNotifications = notifications.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        data-testid="notification-bell-button"
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        className={`relative p-2 rounded-xl transition-all cursor-pointer ${
          isOpen
            ? 'bg-blue-50 text-[#2563EB]'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Bell className="w-4 h-4" />

        {/* Real unread count badge */}
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#2563EB] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-in zoom-in-50 duration-150"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 mt-2 w-[380px] sm:w-[420px] bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2563EB] text-white">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  disabled={isMarkingAllRead}
                  data-testid="mark-all-read-button"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] hover:text-blue-800 hover:bg-blue-50/80 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}

              {hasNotifications && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllNotifications();
                  }}
                  disabled={isClearingAll}
                  data-testid="clear-all-notifications-button"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isClearingAll ? 'Clearing…' : 'Clear all'}
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : isError ? (
              <div className="py-8 px-4 text-center">
                <p className="text-xs text-rose-600 font-medium mb-2">
                  Failed to load notifications
                </p>
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            ) : !hasNotifications ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto mb-2 border border-blue-100">
                  <Bell className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-0.5">
                  You're all caught up
                </h4>
                <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto">
                  No new workflow notifications. PO uploads, approvals, and quotations will appear here.
                </p>
              </div>
            ) : (
              <div>
                {/* Group: Today */}
                {grouped.today.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10 border-y border-slate-100">
                      Today
                    </div>
                    {grouped.today.map((notif) => (
                      <NotificationItemView
                        key={notif.id}
                        notification={notif}
                        onNavigate={handleNavigate}
                        onMarkRead={(id) => markAsRead(id)}
                        onClear={(id) => clearNotification(id)}
                      />
                    ))}
                  </div>
                )}

                {/* Group: Yesterday */}
                {grouped.yesterday.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10 border-y border-slate-100">
                      Yesterday
                    </div>
                    {grouped.yesterday.map((notif) => (
                      <NotificationItemView
                        key={notif.id}
                        notification={notif}
                        onNavigate={handleNavigate}
                        onMarkRead={(id) => markAsRead(id)}
                        onClear={(id) => clearNotification(id)}
                      />
                    ))}
                  </div>
                )}

                {/* Group: Earlier */}
                {grouped.earlier.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10 border-y border-slate-100">
                      Earlier
                    </div>
                    {grouped.earlier.map((notif) => (
                      <NotificationItemView
                        key={notif.id}
                        notification={notif}
                        onNavigate={handleNavigate}
                        onMarkRead={(id) => markAsRead(id)}
                        onClear={(id) => clearNotification(id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: View All Action */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsModalOpen(true);
              }}
              data-testid="view-all-notifications-button"
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              View all notifications
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Full Modal for All Notifications */}
      <AllNotificationsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export default NotificationDropdown;
