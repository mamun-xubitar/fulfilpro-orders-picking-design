'use client';

import { Suspense } from 'react';
import { useMessagesPage } from './hooks/useMessagesPage';
import MessagesToolbar from './MessagesToolbar';
import MessagesTable from './MessagesTable';
import ChatModal from '@/components/ChatModal';
import { DEFAULT_PAGE_SIZE } from './constants';

function MessagesPageInner() {
  const p = useMessagesPage();
  const userId = p.session?.user?.id ?? '';

  return (
    <main className="flex-1 p-4 md:p-6 space-y-4">
      <MessagesToolbar search={p.search} setSearch={p.setSearch} onChat={p.chat.openPicker} />

      <MessagesTable
        conversations={p.conversations}
        loading={p.dataLoading}
        total={p.total}
        page={p.page}
        pageSize={DEFAULT_PAGE_SIZE}
        onPageChange={p.setPage}
        onOpenConversation={(row) => p.chat.openForUser(row.otherUserId)}
        onStartChat={p.chat.openPicker}
        onMarkAllRead={() => void p.markAllRead()}
        onMarkRead={(row) => void p.markRead(row.id)}
      />

      <ChatModal
        {...p.chat}
        currentUserId={userId}
        onSelectUser={p.chat.selectUser}
        onSend={p.chat.sendMessage}
        onClose={p.chat.close}
      />
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesPageInner />
    </Suspense>
  );
}
