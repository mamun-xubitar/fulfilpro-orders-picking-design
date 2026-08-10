import prisma from '@/lib/prisma.server';
import type { Conversation, ChatMessage } from '@prisma/client';

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

type ParticipantInput = { id: string; name: string; email: string };

export class ConversationModel {
  async findOrCreate(userA: ParticipantInput, userB: ParticipantInput): Promise<ConversationRow> {
    const [u1, u2] = sortPair(userA, userB);
    const row = await prisma.conversation.upsert({
      where: { user1Id_user2Id: { user1Id: u1.id, user2Id: u2.id } },
      update: {},
      create: {
        user1Id: u1.id,
        user1Name: u1.name,
        user1Email: u1.email,
        user2Id: u2.id,
        user2Name: u2.name,
        user2Email: u2.email,
      },
    });
    return toConversationRow(row, userA.id);
  }

  async findByPair(userAId: string, userBId: string): Promise<ConversationRow | null> {
    const [user1Id, user2Id] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
    const row = await prisma.conversation.findUnique({ where: { user1Id_user2Id: { user1Id, user2Id } } });
    return row ? toConversationRow(row, userAId) : null;
  }

  async findById(id: string, viewerId: string): Promise<ConversationRow | null> {
    const row = await prisma.conversation.findUnique({ where: { id } });
    return row ? toConversationRow(row, viewerId) : null;
  }

  async list(params: { userId: string; page: number; pageSize: number; search?: string }) {
    const rows = await prisma.conversation.findMany({
      where: { OR: [{ user1Id: params.userId }, { user2Id: params.userId }] },
      orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    });

    const filtered = params.search
      ? rows.filter((row) => {
          const isUser1 = row.user1Id === params.userId;
          const otherName = isUser1 ? row.user2Name : row.user1Name;
          const otherEmail = isUser1 ? row.user2Email : row.user1Email;
          const q = params.search!.toLowerCase();
          return otherName.toLowerCase().includes(q) || otherEmail.toLowerCase().includes(q);
        })
      : rows;

    const total = filtered.length;
    const page = filtered.slice((params.page - 1) * params.pageSize, params.page * params.pageSize);
    return { total, conversations: page.map((row) => toConversationRow(row, params.userId)) };
  }

  async listMessages(conversationId: string): Promise<ChatMessageRow[]> {
    const rows = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toMessageRow);
  }

  async addMessage(data: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    message: string;
  }): Promise<ChatMessageRow> {
    const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: data.conversationId } });
    const senderIsUser1 = conversation.user1Id === data.senderId;

    const [msg] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderEmail: data.senderEmail,
          message: data.message,
        },
      }),
      prisma.conversation.update({
        where: { id: data.conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessageText: data.message,
          ...(senderIsUser1 ? { unreadCountUser2: { increment: 1 } } : { unreadCountUser1: { increment: 1 } }),
        },
      }),
    ]);

    return toMessageRow(msg);
  }

  async touchRead(conversationId: string, isUser1: boolean) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: isUser1
        ? { lastReadByUser1At: new Date(), unreadCountUser1: 0 }
        : { lastReadByUser2At: new Date(), unreadCountUser2: 0 },
    });
  }

  async markAllRead(userId: string) {
    const now = new Date();
    await Promise.all([
      prisma.conversation.updateMany({
        where: { user1Id: userId, unreadCountUser1: { gt: 0 } },
        data: { unreadCountUser1: 0, lastReadByUser1At: now },
      }),
      prisma.conversation.updateMany({
        where: { user2Id: userId, unreadCountUser2: { gt: 0 } },
        data: { unreadCountUser2: 0, lastReadByUser2At: now },
      }),
    ]);
  }

  async unreadTotalForUser(userId: string): Promise<number> {
    const rows = await prisma.conversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { user1Id: true, user2Id: true, unreadCountUser1: true, unreadCountUser2: true },
    });
    return rows.reduce(
      (sum, row) => sum + (row.user1Id === userId ? row.unreadCountUser1 : row.unreadCountUser2),
      0,
    );
  }
}

function sortPair(a: ParticipantInput, b: ParticipantInput): [ParticipantInput, ParticipantInput] {
  return a.id < b.id ? [a, b] : [b, a];
}

function toConversationRow(row: Conversation, viewerId: string): ConversationRow {
  const isUser1 = row.user1Id === viewerId;
  return {
    id: row.id,
    otherUserId: isUser1 ? row.user2Id : row.user1Id,
    otherUserName: isUser1 ? row.user2Name : row.user1Name,
    otherUserEmail: isUser1 ? row.user2Email : row.user1Email,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    lastMessageText: row.lastMessageText,
    unreadCount: isUser1 ? row.unreadCountUser1 : row.unreadCountUser2,
    viewerIsUser1: isUser1,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessageRow(row: ChatMessage): ChatMessageRow {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    senderName: row.senderName,
    senderEmail: row.senderEmail,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}
