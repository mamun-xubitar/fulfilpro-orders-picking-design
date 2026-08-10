'use client';

import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useMessagesFilters } from './useMessagesFilters';
import { useMessagesData } from './useMessagesData';

export function useMessagesPage() {
  const { data: session } = useSession();
  const userIsAdmin = session?.user?.role === 'admin';
  const searchParams = useSearchParams();
  const openConversationId = searchParams.get('openConversation');
  const openHandledRef = useRef<string | null>(null);

  const filters = useMessagesFilters();
  const data = useMessagesData({ queryString: filters.buildQueryString() });
  const chat = useChat({ onConversationCreated: data.bumpRefresh });

  useEffect(() => {
    if (!openConversationId || openConversationId === openHandledRef.current) return;
    openHandledRef.current = openConversationId;
    void chat.openForConversationId(openConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openConversationId]);

  return {
    session,
    userIsAdmin,
    search: filters.search,
    setSearch: filters.setSearch,
    page: filters.page,
    setPage: filters.setPage,
    conversations: data.conversations,
    total: data.total,
    dataLoading: data.loading,
    bumpRefresh: data.bumpRefresh,
    markAllRead: data.markAllRead,
    markRead: data.markRead,
    chat,
  };
}
