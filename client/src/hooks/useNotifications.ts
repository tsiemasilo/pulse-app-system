import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

export function useNotifications(limit = 50, offset = 0) {
  return useQuery<Notification[]>({
    queryKey: ["/api/notifications", { limit, offset }],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) return { count: 0 };
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useMarkAsRead() {
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}

export function useMarkAllAsRead() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/notifications/read-all");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}
