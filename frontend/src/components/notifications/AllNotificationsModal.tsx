import React, { useState } from 'react';
import {
  X,
  CheckCheck,
  RefreshCw,
  Bell,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationItemView } from './NotificationItemView';

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (url: string) => void;
}

export const AllNotificationsModal: React.FC<AllNotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [severity, setSeverity] = useState<string>('');

  const {
    notifications,
    total,
    unreadCount,
    pageSize,
    isLoading,
    isError,
    refetch,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useNotifications({
    page,
    page_size: 10,
    unread_only: unreadOnly,
    severity: severity || undefined,
  });

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleItemNavigate = (url: string) => {
    onClose();
    onNavigate(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-100">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-title" className="text-sm font-bold text-slate-900">
                All Notifications
              </h2>
              <p className="text-xs text-slate-500">
                Authoritative workflow audit log & alerts
                {unreadCount > 0 && (
                  <span className="ml-2 font-semibold text-[#2563EB]">
                    ({unreadCount} unread)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                Mark all read
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setUnreadOnly(false);
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                !unreadOnly
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({total})
            </button>
            <button
              onClick={() => {
                setUnreadOnly(true);
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                unreadOnly
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Unread only ({unreadCount})
            </button>
          </div>

          {/* Severity selector */}
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">All Severities</option>
              <option value="INFO">Info</option>
              <option value="SUCCESS">Success</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
            </select>
          </div>
        </div>

        {/* Notification List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#2563EB]" />
              <span className="text-xs font-medium">Loading notification history...</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
                <X className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800 mb-1">
                Failed to load notifications
              </p>
              <p className="text-xs text-slate-500 mb-4">
                An error occurred while fetching your notification log.
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3 border border-blue-100">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">
                You're all caught up
              </h3>
              <p className="text-xs text-slate-500 max-w-xs">
                No notifications match your current filter. Real quotation and PO workflow events will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <NotificationItemView
                key={notif.id}
                notification={notif}
                onNavigate={handleItemNavigate}
                onMarkRead={(id) => markAsRead(id)}
              />
            ))
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages} ({total} total)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllNotificationsModal;
