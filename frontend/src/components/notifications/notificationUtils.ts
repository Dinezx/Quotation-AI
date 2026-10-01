import { NotificationItem, NotificationSeverity } from '../../api/notificationApi';

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return 'Recently';
  }
}

export interface GroupedNotifications {
  today: NotificationItem[];
  yesterday: NotificationItem[];
  earlier: NotificationItem[];
}

export function groupNotifications(items: NotificationItem[]): GroupedNotifications {
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayMidnight = todayMidnight - 24 * 60 * 60 * 1000;

  for (const item of items) {
    const itemTime = new Date(item.created_at).getTime();
    if (itemTime >= todayMidnight) {
      today.push(item);
    } else if (itemTime >= yesterdayMidnight) {
      yesterday.push(item);
    } else {
      earlier.push(item);
    }
  }

  return { today, yesterday, earlier };
}

export function getEntityNavigationUrl(
  entityType?: string | null,
  entityId?: string | null
): string | null {
  if (!entityType) return null;

  switch (entityType.toUpperCase()) {
    case 'PURCHASE_ORDER':
      return entityId ? `/review/${entityId}` : '/upload';
    case 'QUOTATION':
      return entityId ? `/quotation/${entityId}` : '/quotations';
    case 'RATE':
      return '/rates';
    case 'CUSTOMER':
      return entityId ? `/customers/${entityId}` : '/customers';
    default:
      return null;
  }
}

export function getSeverityStyles(severity: NotificationSeverity): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconBg: string;
  iconText: string;
} {
  switch (severity) {
    case 'SUCCESS':
      return {
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
        badgeText: 'text-emerald-700 dark:text-emerald-400',
        badgeBorder: 'border-emerald-200 dark:border-emerald-800',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/60',
        iconText: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'WARNING':
      return {
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
        badgeText: 'text-amber-700 dark:text-amber-400',
        badgeBorder: 'border-amber-200 dark:border-amber-800',
        iconBg: 'bg-amber-100 dark:bg-amber-900/60',
        iconText: 'text-amber-600 dark:text-amber-400',
      };
    case 'ERROR':
      return {
        badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
        badgeText: 'text-rose-700 dark:text-rose-400',
        badgeBorder: 'border-rose-200 dark:border-rose-800',
        iconBg: 'bg-rose-100 dark:bg-rose-900/60',
        iconText: 'text-rose-600 dark:text-rose-400',
      };
    case 'INFO':
    default:
      return {
        badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
        badgeText: 'text-blue-700 dark:text-blue-400',
        badgeBorder: 'border-blue-200 dark:border-blue-800',
        iconBg: 'bg-blue-100 dark:bg-blue-900/60',
        iconText: 'text-[#2563EB] dark:text-blue-400',
      };
  }
}
