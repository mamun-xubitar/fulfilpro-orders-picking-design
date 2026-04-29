import crypto from 'crypto';
import prisma from '@/lib/prisma.server';
import { sendGoogleMail } from '@/lib/google-mail.server';

export async function createStaffLoginApproval(user: {
  id: string;
  name: string;
  email: string;
}) {
  await prisma.staffLoginApproval.updateMany({
    where: {
      userId: user.id,
      status: 'pending',
    },
    data: {
      status: 'expired',
    },
  });

  const approval = await prisma.staffLoginApproval.create({
    data: {
      userId: user.id,
      email: user.email,
      approveToken: crypto.randomBytes(32).toString('hex'),
      rejectToken: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  await sendApprovalEmail({
    approvalId: approval.id,
    staffName: user.name,
    staffEmail: user.email,
    approveToken: approval.approveToken,
    rejectToken: approval.rejectToken,
  });

  return approval;
}

export async function getApprovalStatus(id: string) {
  const approval = await prisma.staffLoginApproval.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (!approval) return null;

  if (approval.status === 'pending' && approval.expiresAt.getTime() <= Date.now()) {
    return prisma.staffLoginApproval.update({
      where: { id },
      data: { status: 'expired' },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        consumedAt: true,
      },
    });
  }

  return approval;
}

export async function resolveApproval(token: string, action: 'approved' | 'rejected') {
  const where = action === 'approved' ? { approveToken: token } : { rejectToken: token };
  const approval = await prisma.staffLoginApproval.findUnique({ where });

  if (!approval) return null;

  if (approval.status !== 'pending' || approval.expiresAt.getTime() <= Date.now()) {
    if (approval.status === 'pending') {
      await prisma.staffLoginApproval.update({
        where: { id: approval.id },
        data: { status: 'expired' },
      });
    }
    return { ...approval, status: approval.status === 'pending' ? 'expired' : approval.status };
  }

  return prisma.staffLoginApproval.update({
    where: { id: approval.id },
    data: {
      status: action,
      ...(action === 'approved' ? { approvedAt: new Date() } : { rejectedAt: new Date() }),
    },
  });
}

async function sendApprovalEmail({
  approvalId,
  staffName,
  staffEmail,
  approveToken,
  rejectToken,
}: {
  approvalId: string;
  staffName: string;
  staffEmail: string;
  approveToken: string;
  rejectToken: string;
}) {
  const admins = await prisma.user.findMany({
    where: {
      role: 'admin',
      active: true,
    },
    select: { email: true },
  });
  const recipients = admins.map((admin) => admin.email).filter(Boolean);

  if (recipients.length === 0) {
    throw new Error('No active admin email addresses are configured.');
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const approveUrl = `${appUrl}/api/auth/staff-login-approvals/${approvalId}/approve?token=${approveToken}`;
  const rejectUrl = `${appUrl}/api/auth/staff-login-approvals/${approvalId}/reject?token=${rejectToken}`;
  const subject = `Staff login approval requested: ${staffName}`;
  const text = [
    `${staffName} (${staffEmail}) is trying to log in to FulfilPro.`,
    '',
    `Approve: ${approveUrl}`,
    `Reject: ${rejectUrl}`,
    '',
    'This request expires in 15 minutes.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 12px">Staff login approval requested</h2>
      <p><strong>${escapeHtml(staffName)}</strong> (${escapeHtml(staffEmail)}) is trying to log in to FulfilPro.</p>
      <p style="margin:24px 0">
        <a href="${approveUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Yes, approve</a>
        <a href="${rejectUrl}" style="background:#fff;color:#b91c1c;padding:10px 16px;border:1px solid #fecaca;border-radius:8px;text-decoration:none;font-weight:600;margin-left:8px">No, reject</a>
      </p>
      <p style="color:#6b7280;font-size:12px">This request expires in 15 minutes.</p>
    </div>
  `;

  await sendGoogleMail({
    to: recipients,
    subject,
    text,
    html,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
