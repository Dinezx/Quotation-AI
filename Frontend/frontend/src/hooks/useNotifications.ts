import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, NotificationFilterParams } from '../api/notificationApi';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export function useNotifications(params?: NotificationFilterParams) {
  const queryClient = useQueryClient();
  const { company } = useAuth();

  const hasAuth = Boolean(
    company?.id || (typeof window !== 'undefined' && localStorage.getItem('quotation_ai_auth_token'))
  );

  const notificationsQuery = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.getNotifications(params),
    staleTime: 10000,
    enabled: hasAuth,
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationApi.getUnreadCount(),
    staleTime: 10000,
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
    enabled: hasAuth,
  });

  // Real-time Supabase subscription if enabled
  useEffect(() => {
    if (!isSupabaseConfigured || !company?.id) return;

    try {
      const channel = supabase
        .channel(`public:notifications:company_${company.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `company_id=eq.${company.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Graceful fallback to periodic polling
    }
  }, [company?.id, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationApi.clearNotification(notificationId),
    onSuccess: (_, notificationId) => {
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) return old;
        if (typeof old.unread_count === 'number' && old.items === undefined) {
          return { unread_count: Math.max(0, old.unread_count - 1) };
        }
        if (!old.items) return old;
        const target = old.items.find((it: any) => it.id === notificationId);
        const wasUnread = target && !target.is_read;
        return {
          ...old,
          items: old.items.filter((it: any) => it.id !== notificationId),
          total: Math.max(0, (old.total ?? 1) - 1),
          unread_count: wasUnread
            ? Math.max(0, (old.unread_count ?? 1) - 1)
            : (old.unread_count ?? 0),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearAllNotificationsMutation = useMutation({
    mutationFn: () => notificationApi.clearAllNotifications(),
    onSuccess: () => {
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) return old;
        if (typeof old.unread_count === 'number' && old.items === undefined) {
          return { unread_count: 0 };
        }
        return {
          ...old,
          items: [],
          total: 0,
          unread_count: 0,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: notificationsQuery.data?.items ?? [],
    total: notificationsQuery.data?.total ?? 0,
    unreadCount: unreadCountQuery.data?.unread_count ?? notificationsQuery.data?.unread_count ?? 0,
    page: notificationsQuery.data?.page ?? 1,
    pageSize: notificationsQuery.data?.page_size ?? 20,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    error: notificationsQuery.error,
    refetch: () => {
      notificationsQuery.refetch();
      unreadCountQuery.refetch();
    },
    markAsRead: markAsReadMutation.mutate,
    markAsReadAsync: markAsReadMutation.mutateAsync,
    isMarkingRead: markAsReadMutation.isPending,
    markAllAsRead: markAllAsReadMutation.mutate,
    markAllAsReadAsync: markAllAsReadMutation.mutateAsync,
    isMarkingAllRead: markAllAsReadMutation.isPending,
    clearNotification: clearNotificationMutation.mutate,
    clearNotificationAsync: clearNotificationMutation.mutateAsync,
    isClearing: clearNotificationMutation.isPending,
    clearAllNotifications: clearAllNotificationsMutation.mutate,
    clearAllNotificationsAsync: clearAllNotificationsMutation.mutateAsync,
    isClearingAll: clearAllNotificationsMutation.isPending,
  };
}

export default useNotifications;
