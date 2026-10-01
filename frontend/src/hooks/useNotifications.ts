import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, NotificationFilterParams } from '../api/notificationApi';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export function useNotifications(params?: NotificationFilterParams) {
  const queryClient = useQueryClient();
  const { company } = useAuth();

  const notificationsQuery = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.getNotifications(params),
    staleTime: 10000,
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationApi.getUnreadCount(),
    staleTime: 10000,
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
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
  };
}

export default useNotifications;
