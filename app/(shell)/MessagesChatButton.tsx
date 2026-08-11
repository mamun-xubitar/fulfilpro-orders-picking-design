'use client';

import { useChat } from '@/hooks/useChat';
import ChatModal from '@/components/ChatModal';

export default function MessagesChatButton({ unreadCount, currentUserId }: { unreadCount: number; currentUserId: string }) {
  const chat = useChat();

  return (
    <div className="relative">
      <button
        onClick={() => chat.openPicker()}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150 cursor-pointer"
        aria-label="Messages"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <ChatModal
        {...chat}
        currentUserId={currentUserId}
        onSelectUser={chat.selectUser}
        onSend={chat.sendMessage}
        onClose={chat.close}
      />
    </div>
  );
}
