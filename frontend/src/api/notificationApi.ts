import apiClient from './apiClient';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export type NotificationType =
  | 'PO_UPLOADED'
  | 'PO_EXTRACTION_COMPLETED'
  | 'PO_NEEDS_REVIEW'
  | 'PO_APPROVED'
  | 'PO_REJECTED'
  | 'CALCULATION_BLOCKED'
  | 'QUOTATION_DRAFT_CREATED'
  | 'QUOTATION_FINALIZED'
  | 'QUOTATION_PDF_GENERATED'
  | 'QUOTATION_EMAIL_SENT'
  | 'QUOTATION_EMAIL_FAILED'
  | 'SYSTEM_FAILURE'
  | string;

export interface NotificationItem {
  id: string;
  company_id: string;
  user_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: 'PURCHASE_ORDER' | 'QUOTATION' | 'RATE' | 'CUSTOMER' | string | null;
  entity_id?: string | null;
  severity: NotificationSeverity;
  read_at?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPagination {
  items: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
}

export interface NotificationFilterParams {
  page?: number;
  page_size?: number;
  unread_only?: boolean;
  severity?: string;
}

export const notificationApi = {
  getNotifications: async (params?: NotificationFilterParams): Promise<NotificationPagination> => {
    const response = await apiClient.get<NotificationPagination>('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const response = await apiClient.get<{ unread_count: number }>('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string): Promise<{ success: boolean; notification: NotificationItem }> => {
    const response = await apiClient.post<{ success: boolean; notification: NotificationItem }>(
      `/notifications/${id}/read`
    );
    return response.data;
  },

  markAllAsRead: async (): Promise<{ success: boolean; marked_count: number }> => {
    const response = await apiClient.post<{ success: boolean; marked_count: number }>(
      '/notifications/read-all'
    );
    return response.data;
  },
};

export default notificationApi;
