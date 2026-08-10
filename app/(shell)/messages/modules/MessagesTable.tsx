'use client';

import type { ConversationRow } from '@/hooks/useChat';
import { truncate } from '@/lib/utils/common';
import { formatAge } from './utils';

type Props = {
  conversations: ConversationRow[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onOpenConversation: (row: ConversationRow) => void;
  onStartChat: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (row: ConversationRow) => void;
};

const SKELETON_ROWS = Array.from({ length: 5 });

export default function MessagesTable({
  conversations, loading, total, page, pageSize, onPageChange, onOpenConversation, onStartChat, onMarkAllRead, onMarkRead,
}: Props) {
  const totalPages = Math.ceil(total / pageSize);
  const hasUnread = conversations.some((row) => row.unreadCount > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Conversation</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Message</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                <div className="flex items-center gap-1.5">
                  Unread
                  <button
                    onClick={onMarkAllRead}
                    disabled={!hasUnread}
                    title="Mark all as read"
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-gray-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? SKELETON_ROWS.map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-40" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-56" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-10" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16 ml-auto" /></td>
                  </tr>
                ))
              : conversations.length === 0
              ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <p className="text-sm text-gray-400 mb-3">No conversations yet — start one</p>
                      <button
                        onClick={onStartChat}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        + Chat
                      </button>
                    </td>
                  </tr>
                )
              : conversations.map((row) => (
                  <tr key={row.id} className="border-b border-gray-200 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 leading-snug">{row.otherUserName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{row.otherUserEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800">{row.lastMessageText ? truncate(row.lastMessageText, 50) : '—'}</p>
                      {row.lastMessageAt && <p className="text-xs text-gray-500 mt-0.5">{formatAge(row.lastMessageAt)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {row.unreadCount > 0 && (
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          {row.unreadCount > 99 ? '99+' : row.unreadCount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {row.unreadCount > 0 && (
                          <button
                            onClick={() => onMarkRead(row)}
                            title="Mark as read"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 cursor-pointer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => onOpenConversation(row)}
                          title="Chat"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
