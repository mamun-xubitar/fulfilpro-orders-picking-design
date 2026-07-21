'use client';

import React, { useState, useCallback } from 'react';
import useRequest from '@/hooks/useRequest';
import type { TaskMessageRow, TaskRow } from '../types';

export function useTaskMessages(setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>) {
  const { request, loading } = useRequest<TaskMessageRow>();

  const [messagesTask, setMessagesTask] = useState<TaskRow | null>(null);
  const [messages, setMessages] = useState<TaskMessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');

  const openMessages = useCallback((task: TaskRow) => {
    setMessagesTask(task);
    setMessages([]);
    setMessageText('');
    setMessagesLoading(true);
    fetch(`/api/tasks/${task.id}/messages`)
      .then((r) => r.json() as Promise<{ success: boolean; data: { messages: TaskMessageRow[] } }>)
      .then((r) => { if (r.success) setMessages(r.data.messages); })
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, unreadCount: 0 } : t)));
  }, [setTasks]);

  const closeMessages = useCallback(() => {
    setMessagesTask(null);
    setMessages([]);
  }, []);

  function sendMessage() {
    if (!messagesTask || !messageText.trim()) return;
    void request({
      url: `/api/tasks/${messagesTask.id}/messages`,
      method: 'POST',
      data: { message: messageText.trim() },
      showToast: false,
      onSuccess: () => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === messagesTask.id
              ? { ...t, messageCount: t.messageCount + 1, unreadCount: 0 }
              : t,
          ),
        );
        closeMessages();
      },
    });
  }

  return {
    messagesTask,
    messages,
    messagesLoading,
    messageText,
    setMessageText,
    openMessages,
    closeMessages,
    sendMessage,
    messageSending: loading,
  };
}
