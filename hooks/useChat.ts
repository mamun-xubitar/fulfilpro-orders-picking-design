'use client';

import { getApiErrorMessage } from '@/lib/utils/api';
import { useCallback, useRef, useState } from 'react';

export type ChatMessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
};

export type ConversationRow = {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserEmail: string;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  unreadCount: number;
  viewerIsUser1: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MessageableUser = { id: string; name: string; email: string; role: string };

export type ChatOption = { id: string; name: string; email: string; canSend: boolean };

type ApiResponse<T> = { success: boolean; message: string; errors?: string[]; data: T };
type ThreadResponse = { conversation: ConversationRow; messages: ChatMessageRow[]; isNew?: boolean };

const THREAD_POLL_MS = 5000;

export function useChat({ onConversationCreated }: { onConversationCreated?: () => void } = {}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ChatOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((conversationId: string) => {
    stopPolling();
    pollRef.current = window.setInterval(() => {
      fetch(`/api/conversations/${conversationId}/messages`)
        .then((r) => r.json() as Promise<ApiResponse<ThreadResponse>>)
        .then((r) => {
          if (r.success) {
            setMessages(r.data.messages);
            setConversation(r.data.conversation);
          }
        })
        .catch(() => {});
    }, THREAD_POLL_MS);
  }, [stopPolling]);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const [usersRes, convosRes] = await Promise.all([
        fetch('/api/conversations/messageable-users'),
        fetch('/api/conversations?pageSize=200'),
      ]);
      const usersJson = (await usersRes.json()) as ApiResponse<MessageableUser[]>;
      const convosJson = (await convosRes.json()) as ApiResponse<{ conversations: ConversationRow[] }>;

      const merged = new Map<string, ChatOption>();
      if (usersJson.success) {
        for (const u of usersJson.data) merged.set(u.id, { id: u.id, name: u.name, email: u.email, canSend: true });
      }
      if (convosJson.success) {
        for (const c of convosJson.data.conversations) {
          const existing = merged.get(c.otherUserId);
          merged.set(c.otherUserId, {
            id: c.otherUserId,
            name: c.otherUserName,
            email: c.otherUserEmail,
            canSend: existing?.canSend ?? false,
          });
        }
      }
      setOptions(Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      // Leaving the picker empty on failure is acceptable; the modal itself still opens.
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  const selectUser = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    setConversation(null);
    setMessages([]);
    setError('');
    if (!userId) return;
    setLoadingThread(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: userId }),
      });
      const json = (await res.json()) as ApiResponse<ThreadResponse>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to open conversation'));
      setConversation(json.data.conversation);
      setMessages(json.data.messages);
      startPolling(json.data.conversation.id);
      if (json.data.isNew) onConversationCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open conversation.');
    } finally {
      setLoadingThread(false);
    }
  }, [startPolling, onConversationCreated]);

  const openPicker = useCallback(() => {
    setOpen(true);
    setSelectedUserId('');
    setConversation(null);
    setMessages([]);
    setError('');
    void loadOptions();
  }, [loadOptions]);

  const openForUser = useCallback((userId: string) => {
    setOpen(true);
    setError('');
    void loadOptions();
    void selectUser(userId);
  }, [loadOptions, selectUser]);

  const openForConversationId = useCallback(async (conversationId: string) => {
    setOpen(true);
    setError('');
    setConversation(null);
    setMessages([]);
    setLoadingThread(true);
    void loadOptions();
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const json = (await res.json()) as ApiResponse<ThreadResponse>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to open conversation'));
      setSelectedUserId(json.data.conversation.otherUserId);
      setConversation(json.data.conversation);
      setMessages(json.data.messages);
      startPolling(json.data.conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open conversation.');
    } finally {
      setLoadingThread(false);
    }
  }, [loadOptions, startPolling]);

  const sendMessage = useCallback(async () => {
    if (!conversation || sending) return;
    const message = messageText.trim();
    if (!message) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const json = (await res.json()) as ApiResponse<ChatMessageRow>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to send message'));
      setMessages((prev) => [...prev, json.data]);
      setMessageText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }, [conversation, messageText, sending]);

  const close = useCallback(() => {
    stopPolling();
    setOpen(false);
    setSelectedUserId('');
    setConversation(null);
    setMessages([]);
    setMessageText('');
    setError('');
  }, [stopPolling]);

  const selectedOption = options.find((o) => o.id === selectedUserId) ?? null;
  const canReply = selectedOption ? selectedOption.canSend : true;

  return {
    open, options, optionsLoading, selectedUserId, conversation, messages, loadingThread,
    messageText, setMessageText, sending, error, canReply,
    openPicker, openForUser, openForConversationId, selectUser, sendMessage, close,
  };
}

export type UseChatReturn = ReturnType<typeof useChat>;
