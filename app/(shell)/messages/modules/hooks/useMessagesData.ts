'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConversationRow } from '@/hooks/useChat';

type ListResponse = { conversations: ConversationRow[]; total: number };
type ApiListResponse = { success: boolean; data: ListResponse };

const LIST_POLL_MS = 15_000;

export function useMessagesData(params: { queryString: string }) {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resolvedFetchKey, setResolvedFetchKey] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchKey = `${params.queryString}|${refreshKey}`;
  const loading = fetchKey !== resolvedFetchKey;

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const markAllRead = useCallback(async () => {
    await fetch('/api/conversations/mark-all-read', { method: 'POST' });
    bumpRefresh();
  }, [bumpRefresh]);

  const markRead = useCallback(async (conversationId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
    await fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {});
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const currentFetchKey = `${params.queryString}|${refreshKey}`;

    fetch(`/api/conversations?${params.queryString}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<ApiListResponse>)
      .then((r) => {
        if (r.success) {
          setConversations(r.data.conversations);
          setTotal(r.data.total);
        }
        setResolvedFetchKey(currentFetchKey);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== 'AbortError') setResolvedFetchKey(currentFetchKey);
      });

    return () => ctrl.abort();
  }, [params.queryString, refreshKey]);

  // Silent background poll so unread counts / last-message text reflect new
  // incoming messages without a full reload — mirrors NotificationBell's poll.
  useEffect(() => {
    const interval = window.setInterval(() => {
      fetch(`/api/conversations?${params.queryString}`)
        .then((r) => r.json() as Promise<ApiListResponse>)
        .then((r) => {
          if (r.success) {
            setConversations(r.data.conversations);
            setTotal(r.data.total);
          }
        })
        .catch(() => {});
    }, LIST_POLL_MS);

    return () => window.clearInterval(interval);
  }, [params.queryString]);

  return { conversations, total, loading, bumpRefresh, markAllRead, markRead };
}
