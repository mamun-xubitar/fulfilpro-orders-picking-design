import { sendAppMail } from '@/lib/email.server';
import { canSendMessage, getMessageableUsers } from '@/lib/message-visibility.server';
import prisma from '@/lib/prisma.server';
import { ConversationModel } from '@/models/conversation.model.server';

const conversationModel = new ConversationModel();

type Session = { user: { id: string; name?: string | null; email?: string | null; role?: string | null } };

function isAdmin(session: Session) {
  return session.user.role === 'admin';
}

function userName(session: Session) {
  return session.user.name ?? session.user.email ?? 'Unknown';
}

export class ConversationController {
  async list(searchParams: URLSearchParams, session: Session) {
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));
    const search = searchParams.get('search') ?? undefined;

    const result = await conversationModel.list({ userId: session.user.id, page, pageSize, search });
    return { data: result, message: 'Conversations retrieved' };
  }

  async messageableUsers(session: Session) {
    const users = await getMessageableUsers(session.user.id, isAdmin(session));
    return { data: users, message: 'Messageable users retrieved' };
  }

  async getOrCreate(body: unknown, session: Session) {
    const b = body as Record<string, unknown>;
    const otherUserId = String(b.otherUserId ?? '').trim();
    const uid = session.user.id;

    if (!otherUserId) return { error: { message: 'Validation failed', errors: ['otherUserId: User is required'], status: 400 } };
    if (otherUserId === uid) return { error: { message: 'Cannot message yourself', status: 400 } };

    const other = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true, email: true, active: true },
    });
    if (!other || !other.active) return { error: { message: 'User not found', status: 404 } };

    const existing = await conversationModel.findByPair(uid, otherUserId);
    if (existing) {
      const messages = await conversationModel.listMessages(existing.id);
      void conversationModel.touchRead(existing.id, existing.viewerIsUser1).catch(() => {});
      return { data: { conversation: existing, messages, isNew: false }, message: 'Conversation retrieved' };
    }

    const allowed = await canSendMessage({
      senderId: uid,
      senderIsAdmin: isAdmin(session),
      recipientId: other.id,
    });
    if (!allowed) return { error: { message: 'You do not have permission to message this user', status: 403 } };

    const conversation = await conversationModel.findOrCreate(
      { id: uid, name: userName(session), email: session.user.email ?? '' },
      { id: other.id, name: other.name ?? other.email ?? '', email: other.email ?? '' },
    );
    return { data: { conversation, messages: [], isNew: true }, message: 'Conversation created' };
  }

  async getMessages(id: string, session: Session) {
    const uid = session.user.id;
    const conversation = await conversationModel.findById(id, uid);
    if (!conversation) return { error: { message: 'Conversation not found', status: 404 } };

    const isParticipant = await isConversationParticipant(id, uid);
    if (!isParticipant && !isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    if (isParticipant) {
      void conversationModel.touchRead(id, conversation.viewerIsUser1).catch(() => {});
    }

    const messages = await conversationModel.listMessages(id);
    return { data: { conversation, messages }, message: 'Messages retrieved' };
  }

  async sendMessage(id: string, body: unknown, session: Session) {
    const uid = session.user.id;
    const conversation = await conversationModel.findById(id, uid);
    if (!conversation) return { error: { message: 'Conversation not found', status: 404 } };

    const isParticipant = await isConversationParticipant(id, uid);
    if (!isParticipant && !isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const b = body as Record<string, unknown>;
    const message = String(b.message ?? '').trim();
    if (!message) return { error: { message: 'Validation failed', errors: ['message: Message is required'], status: 400 } };

    const allowed = await canSendMessage({
      senderId: uid,
      senderIsAdmin: isAdmin(session),
      recipientId: conversation.otherUserId,
    });
    if (!allowed) {
      return { error: { message: 'You do not have permission to message this user', status: 403 } };
    }

    const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, name: true, email: true } });
    if (!user) return { error: { message: 'Session user not found', status: 400 } };

    const senderName = user.name ?? user.email ?? '';

    const msg = await conversationModel.addMessage({
      conversationId: id,
      senderId: uid,
      senderName,
      senderEmail: user.email ?? '',
      message,
    });

    void fireConversationMessageEvent(id, message, conversation.otherUserEmail, conversation.otherUserName, senderName, user.email ?? '').catch(() => {});

    return { data: msg, message: 'Message sent' };
  }

  async unreadCount(session: Session) {
    const unreadCount = await conversationModel.unreadTotalForUser(session.user.id);
    return { data: { unreadCount }, message: 'Unread count retrieved' };
  }

  async markAllRead(session: Session) {
    await conversationModel.markAllRead(session.user.id);
    return { data: null, message: 'All conversations marked as read' };
  }

  async markRead(id: string, session: Session) {
    const uid = session.user.id;
    const conversation = await conversationModel.findById(id, uid);
    if (!conversation) return { error: { message: 'Conversation not found', status: 404 } };

    const isParticipant = await isConversationParticipant(id, uid);
    if (!isParticipant && !isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    if (isParticipant) {
      await conversationModel.touchRead(id, conversation.viewerIsUser1);
    }

    return { data: null, message: 'Conversation marked as read' };
  }
}

async function isConversationParticipant(conversationId: string, userId: string) {
  const row = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { user1Id: true, user2Id: true },
  });
  return row ? row.user1Id === userId || row.user2Id === userId : false;
}

async function fireConversationMessageEvent(
  conversationId: string,
  messageText: string,
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  senderEmail: string,
) {
  if (!recipientEmail) return;

  const appUrl = process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const link = `${appUrl}/messages?openConversation=${conversationId}`;
  const subject = `You have a new message from ${senderName}`;
  const html = buildConversationEmail({ senderName, senderEmail, recipientName, messageText, link });
  const text = `You have a new message from ${senderName} <${senderEmail}>:\n\n${messageText}\n\nView & reply: ${link}`;

  await sendAppMail({ to: [recipientEmail], subject, html, text });
}

function buildConversationEmail(params: { senderName: string; senderEmail: string; recipientName: string; messageText: string; link: string }) {
  return `
  <div style="margin:0;padding:24px 0;background-color:#f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background-color:#2563eb;padding:24px 28px;">
                <div style="display:inline-block;background-color:#ffffff;color:#2563eb;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:999px;">New message</div>
                <h1 style="margin:12px 0 0;color:#ffffff;font-family:Arial,sans-serif;font-size:22px;line-height:1.3;">You have a new message</h1>
              </td>
            </tr>
            <!-- Greeting -->
            <tr>
              <td style="padding:24px 28px 4px;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;color:#374151;">Hi ${escapeHtml(params.recipientName || 'there')},</p>
              </td>
            </tr>
            <!-- From / sender -->
            <tr>
              <td style="padding:12px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-right:12px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:44px;height:44px;">
                        <tr>
                          <td width="44" height="44" align="center" valign="middle" bgcolor="#dbeafe" style="width:44px;height:44px;border-radius:50%;background-color:#dbeafe;color:#2563eb;font-family:Arial,sans-serif;font-size:18px;font-weight:700;text-align:center;vertical-align:middle;">${escapeHtml(initials(params.senderName))}</td>
                        </tr>
                      </table>
                    </td>
                    <td>
                      <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#111827;">${escapeHtml(params.senderName)}</p>
                      <p style="margin:2px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;">${escapeHtml(params.senderEmail)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Message body -->
            <tr>
              <td style="padding:4px 28px 20px;">
                <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 18px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;white-space:pre-wrap;">${escapeHtml(params.messageText)}</div>
              </td>
            </tr>
            <!-- Footer / CTA -->
            <tr>
              <td style="padding:8px 28px 28px;">
                <a href="${escapeHtml(params.link)}" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px;">View conversation &amp; reply</a>
              </td>
            </tr>
            <!-- Footer note -->
            <tr>
              <td style="padding:0 28px 24px;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#6b7280;line-height:1.5;">
                  You&#39;re receiving this because you&#39;re part of a conversation on
                  <a href="${escapeHtml((process.env.APP_URL || '').replace(/\/$/, '') || '#')}" style="color:#2563eb;text-decoration:underline;">${escapeHtml((process.env.SHOPIFY_APP_NAME || 'FulfilPro').trim())}</a>.
                  You can reply directly in the app.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function escapeHtml(v: string) {
  return v
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
