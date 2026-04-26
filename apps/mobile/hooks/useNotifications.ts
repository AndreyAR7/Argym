import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  getNotificationsForUser,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '@/services/notifications.service';

export const NOTIF_KEYS = {
  list: (userId: string) => ['notifications', userId] as const,
  unread: (userId: string) => ['notifications', 'unread', userId] as const,
};

const PAGE_SIZE = 20;

export function useNotifications(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: NOTIF_KEYS.list(userId ?? ''),
    queryFn: ({ pageParam = 0 }) => getNotificationsForUser(userId!, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: NOTIF_KEYS.unread(userId ?? ''),
    queryFn: () => getUnreadCount(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // poll every 60s
  });
}

export function useMarkRead(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id: string) => {
      if (!userId) return;
      await qc.cancelQueries({ queryKey: NOTIF_KEYS.list(userId) });
      const prev = qc.getQueryData(NOTIF_KEYS.list(userId));
      qc.setQueryData<any>(NOTIF_KEYS.list(userId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: AppNotification[]) =>
            page.map((n) => n.id === id ? { ...n, is_read: true } : n)
          ),
        };
      });
      qc.setQueryData<number>(NOTIF_KEYS.unread(userId), (old = 0) => Math.max(0, old - 1));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (userId && ctx?.prev) {
        qc.setQueryData(NOTIF_KEYS.list(userId), ctx.prev);
        qc.invalidateQueries({ queryKey: NOTIF_KEYS.unread(userId) });
      }
    },
    onSettled: () => {
      if (userId) {
        qc.invalidateQueries({ queryKey: NOTIF_KEYS.list(userId) });
        qc.invalidateQueries({ queryKey: NOTIF_KEYS.unread(userId) });
      }
    },
  });
}

export function useMarkAllRead(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(userId!),
    onSuccess: () => {
      if (userId) {
        qc.invalidateQueries({ queryKey: NOTIF_KEYS.list(userId) });
        qc.invalidateQueries({ queryKey: NOTIF_KEYS.unread(userId) });
      }
    },
  });
}
