import React from 'react';
import {
  FileText,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Download,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';
import { NotificationItem } from '../../api/notificationApi';
import {
  formatRelativeTime,
  getEntityNavigationUrl,
  getSeverityStyles,
} from './notificationUtils';

interface NotificationItemViewProps {
  notification: NotificationItem;
  onNavigate?: (url: string) => void;
  onMarkRead?: (id: string) => void;
}

export const NotificationItemView: React.FC<NotificationItemViewProps> = ({
  notification,
  onNavigate,
  onMarkRead,
}) => {
  const styles = getSeverityStyles(notification.severity);
  const navUrl = getEntityNavigationUrl(notification.entity_type, notification.entity_id);

  const getIcon = () => {
    switch (notification.type) {
      case 'PO_UPLOADED':
        return <FileText className="w-4 h-4" />;
      case 'PO_EXTRACTION_COMPLETED':
        return <FileCheck className="w-4 h-4" />;
      case 'PO_NEEDS_REVIEW':
        return <AlertCircle className="w-4 h-4" />;
      case 'PO_APPROVED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'PO_REJECTED':
        return <XCircle className="w-4 h-4" />;
      case 'CALCULATION_BLOCKED':
        return <AlertTriangle className="w-4 h-4" />;
      case 'QUOTATION_FINALIZED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'QUOTATION_PDF_GENERATED':
        return <Download className="w-4 h-4" />;
      case 'QUOTATION_EMAIL_SENT':
        return <Send className="w-4 h-4" />;
      case 'QUOTATION_EMAIL_FAILED':
        return <AlertOctagon className="w-4 h-4" />;
      case 'SYSTEM_FAILURE':
        return <AlertCircle className="w-4 h-4" />;
      case 'QUOTATION_DRAFT_CREATED':
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }
    if (navUrl && onNavigate) {
      onNavigate(navUrl);
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      data-testid={`notification-item-${notification.id}`}
      className={`group relative flex items-start gap-3 p-3.5 transition-all text-left cursor-pointer border-b border-slate-100 last:border-b-0 ${
        !notification.is_read
          ? 'bg-blue-50/50 hover:bg-blue-50/80 border-l-[3px] border-l-[#2563EB]'
          : 'bg-white hover:bg-slate-50/90 border-l-[3px] border-l-transparent text-slate-600'
      }`}
    >
      {/* Severity Icon Box */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${styles.iconBg} ${styles.iconText}`}
      >
        {getIcon()}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={`text-xs font-semibold truncate ${
              !notification.is_read ? 'text-slate-900' : 'text-slate-700'
            }`}
          >
            {notification.title}
          </span>
          <span className="text-[11px] font-medium text-slate-400 shrink-0">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>

        {/* Footer: Entity Navigation Badge & Target */}
        <div className="flex items-center justify-between mt-2 pt-1">
          {notification.entity_type && (
            <span
              className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${styles.badgeBg} ${styles.badgeText} ${styles.badgeBorder}`}
            >
              {notification.entity_type.replace('_', ' ')}
            </span>
          )}

          {navUrl && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] group-hover:translate-x-0.5 transition-transform ml-auto">
              View
              <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {/* Unread Indicator Dot */}
      {!notification.is_read && (
        <span
          data-testid="unread-indicator"
          className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0 mt-2"
          title="Unread"
        />
      )}
    </div>
  );
};

export default NotificationItemView;
