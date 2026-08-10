'use client';

import { useEffect, useRef } from 'react';
import type { ChatOption, ConversationRow, ChatMessageRow } from '@/hooks/useChat';

type Props = {
  open: boolean;
  options: ChatOption[];
  optionsLoading: boolean;
  selectedUserId: string;
  conversation: ConversationRow | null;
  messages: ChatMessageRow[];
  loadingThread: boolean;
  messageText: string;
  setMessageText: (v: string) => void;
  sending: boolean;
  error: string;
  canReply: boolean;
  currentUserId: string;
  onSelectUser: (userId: string) => void;
  onSend: () => void;
  onClose: () => void;
};

export default function ChatModal({
  open, options, optionsLoading, selectedUserId, messages, loadingThread,
  messageText, setMessageText, sending, error, canReply, currentUserId,
  onSelectUser, onSend, onClose,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    prevCountRef.current = 0;
  }, [selectedUserId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || loadingThread) return;
    const grew = messages.length > prevCountRef.current;
    if (grew) el.scrollTop = el.scrollHeight;
    prevCountRef.current = messages.length;
  }, [messages, loadingThread]);

  if (!open) return null;

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh] overflow-hidden">
        <div className="border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between gap-3 px-6 pt-4">
            <h2 className="text-base font-semibold text-gray-900">Chat</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 pt-2 pb-4">
            <select
              value={selectedUserId}
              onChange={(e) => onSelectUser(e.target.value)}
              disabled={optionsLoading || options.length === 0}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
            >
              <option value="">{optionsLoading ? 'Loading users...' : 'Select a user'}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.name} - {o.email}</option>
              ))}
            </select>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {!selectedUserId && (
            <p className="text-center text-sm text-gray-400 py-8">Pick a user to start messaging.</p>
          )}

          {selectedUserId && loadingThread && (
            <div className="flex justify-center py-8">
              <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          )}

          {selectedUserId && !loadingThread && messages.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No messages yet. Start the conversation.</p>
          )}

          {selectedUserId && !loadingThread && messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  {msg.message}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{msg.senderName} · {formatAge(msg.createdAt)}</p>
              </div>
            );
          })}
        </div>

        {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}

        {selectedUserId && (
          <div className="border-t border-gray-100 px-4 py-3 shrink-0">
            {!canReply ? (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                You don&apos;t have permission to message this user.
              </p>
            ) : (
              <div className="flex gap-2 items-end">
                <textarea
                  rows={2}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message… (Enter to send)"
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={onSend}
                  disabled={sending || !messageText.trim()}
                  title={messages.length === 0 ? 'Start Messaging' : 'Send'}
                  className="flex items-center justify-center w-10 h-10 shrink-0 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-default cursor-pointer transition-colors duration-150"
                >
                  {sending ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatAge(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
