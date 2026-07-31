import prisma from '@/lib/prisma.server';
import { sendAppMail } from '@/lib/email.server';
import { getRoleLabel } from '@/lib/roles';
import { createNotification } from '@/lib/notifications.server';

export type DecorationEditRequestRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  lineItemId: string;
  requestedById: string;
  requestedByName: string;
  requestedByEmail: string;
  requestedByRole: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

const REQUEST_EXPIRY_DAYS = 7;

export class DecorationEditRequestModel {
  async create(params: {
    orderId: string;
    orderNumber: string;
    lineItemId: string;
    productTitle: string;
    requestedBy: { id: string; name: string; email: string; role: string };
    reason: string;
    originUrl: string;
  }) {
    // Avoid duplicate pending requests for the same line by the same decorator.
    const existingPending = await prisma.decorationEditRequest.findFirst({
      where: {
        orderId: params.orderId,
        lineItemId: params.lineItemId,
        requestedById: params.requestedBy.id,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    });
    if (existingPending) return toRow(existingPending);

    const admins = await prisma.user.findMany({
      where: { active: true, role: 'admin' },
      select: { id: true, name: true, email: true },
    });

    const approveToken = crypto.randomUUID();
    const rejectToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const request = await prisma.decorationEditRequest.create({
      data: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        lineItemId: params.lineItemId,
        requestedById: params.requestedBy.id,
        requestedByName: params.requestedBy.name,
        requestedByEmail: params.requestedBy.email,
        requestedByRole: params.requestedBy.role,
        reason: params.reason,
        adminTargets: admins as object[],
        approveToken,
        rejectToken,
        expiresAt,
      },
    });

    if (admins.length > 0) {
      const base = process.env.APP_URL?.replace(/\/$/, '') || params.originUrl;
      const approvePath = `${base}/api/decoration/edit-requests/${request.id}/approve?token=${approveToken}`;
      const rejectPath = `${base}/api/decoration/edit-requests/${request.id}/reject?token=${rejectToken}`;
      try {
        await sendAppMail({
          to: admins.map((a) => a.email),
          subject: `Edit access request — Order #${params.orderNumber}`,
          text: buildEmailText({ request: toRow(request), productTitle: params.productTitle, approvePath, rejectPath }),
          html: buildEmailHtml({ request: toRow(request), productTitle: params.productTitle, approvePath, rejectPath }),
        });
      } catch (error) {
        console.error('Failed to send decoration edit-request email', { requestId: request.id, error });
      }

      await Promise.all(
        admins.map((a) =>
          createNotification({
            recipientId: a.id,
            type: 'decorator_edit_request',
            title: 'Edit access requested',
            body: `${params.requestedBy.name} is requesting edit access for Order #${params.orderNumber}${params.productTitle ? ` — ${params.productTitle}` : ''}`,
            orderId: params.orderId,
            orderNumber: params.orderNumber,
            lineItemId: params.lineItemId,
            relatedRequestId: request.id,
            actionable: true,
          })
        )
      );
    }

    return toRow(request);
  }

  async listForOrder(orderId: string) {
    const rows = await prisma.decorationEditRequest.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRow);
  }

  async listPending() {
    const rows = await prisma.decorationEditRequest.findMany({
      where: { status: 'pending', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRow);
  }

  async approveById(requestId: string, adminId: string, adminName: string) {
    const existing = await prisma.decorationEditRequest.findUnique({ where: { id: requestId } });
    if (!existing) throw new Error('Request not found');
    if (existing.status !== 'pending') throw new Error('Request is no longer pending');
    if (existing.expiresAt.getTime() <= Date.now()) throw new Error('Request has expired');

    const updated = await prisma.decorationEditRequest.update({
      where: { id: requestId },
      data: { status: 'approved', approvedById: adminId, approvedByName: adminName, approvedAt: new Date() },
    });

    await Promise.all([
      prisma.notification.updateMany({
        where: { relatedRequestId: requestId, actionable: true },
        data: { actionStatus: 'accepted' },
      }),
      createNotification({
        recipientId: existing.requestedById,
        type: 'request_decision',
        title: 'Edit access approved',
        body: `${adminName} approved your edit access request for Order #${existing.orderNumber}`,
        orderId: existing.orderId,
        orderNumber: existing.orderNumber,
        lineItemId: existing.lineItemId,
        relatedRequestId: requestId,
      }),
    ]);

    return toRow(updated);
  }

  async rejectById(requestId: string, adminId: string, adminName: string) {
    const existing = await prisma.decorationEditRequest.findUnique({ where: { id: requestId } });
    if (!existing) throw new Error('Request not found');
    if (existing.status !== 'pending') throw new Error('Request is no longer pending');

    const updated = await prisma.decorationEditRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', rejectedById: adminId, rejectedByName: adminName, rejectedAt: new Date() },
    });

    await Promise.all([
      prisma.notification.updateMany({
        where: { relatedRequestId: requestId, actionable: true },
        data: { actionStatus: 'rejected' },
      }),
      createNotification({
        recipientId: existing.requestedById,
        type: 'request_decision',
        title: 'Edit access rejected',
        body: `${adminName} rejected your edit access request for Order #${existing.orderNumber}`,
        orderId: existing.orderId,
        orderNumber: existing.orderNumber,
        lineItemId: existing.lineItemId,
        relatedRequestId: requestId,
      }),
    ]);

    return toRow(updated);
  }

  async approveByToken(requestId: string, token: string) {
    const existing = await prisma.decorationEditRequest.findUnique({ where: { id: requestId } });
    if (!existing) throw new Error('Request not found');
    if (existing.approveToken !== token) throw new Error('Invalid token');
    if (existing.status !== 'pending') return toRow(existing);
    if (existing.expiresAt.getTime() <= Date.now()) throw new Error('Request has expired');

    const updated = await prisma.decorationEditRequest.update({
      where: { id: requestId },
      data: { status: 'approved', approvedAt: new Date() },
    });

    await Promise.all([
      prisma.notification.updateMany({
        where: { relatedRequestId: requestId, actionable: true },
        data: { actionStatus: 'accepted' },
      }),
      createNotification({
        recipientId: existing.requestedById,
        type: 'request_decision',
        title: 'Edit access approved',
        body: `Your edit access request for Order #${existing.orderNumber} was approved.`,
        orderId: existing.orderId,
        orderNumber: existing.orderNumber,
        lineItemId: existing.lineItemId,
        relatedRequestId: requestId,
      }),
    ]);

    return toRow(updated);
  }

  async rejectByToken(requestId: string, token: string) {
    const existing = await prisma.decorationEditRequest.findUnique({ where: { id: requestId } });
    if (!existing) throw new Error('Request not found');
    if (existing.rejectToken !== token) throw new Error('Invalid token');
    if (existing.status !== 'pending') return toRow(existing);

    const updated = await prisma.decorationEditRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', rejectedAt: new Date() },
    });

    await Promise.all([
      prisma.notification.updateMany({
        where: { relatedRequestId: requestId, actionable: true },
        data: { actionStatus: 'rejected' },
      }),
      createNotification({
        recipientId: existing.requestedById,
        type: 'request_decision',
        title: 'Edit access rejected',
        body: `Your edit access request for Order #${existing.orderNumber} was rejected.`,
        orderId: existing.orderId,
        orderNumber: existing.orderNumber,
        lineItemId: existing.lineItemId,
        relatedRequestId: requestId,
      }),
    ]);

    return toRow(updated);
  }
}

function toRow(row: {
  id: string;
  orderId: string;
  orderNumber: string;
  lineItemId: string;
  requestedById: string;
  requestedByName: string;
  requestedByEmail: string;
  requestedByRole: string;
  reason: string;
  status: string;
  approvedByName: string | null;
  approvedAt: Date | null;
  rejectedByName: string | null;
  rejectedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}): DecorationEditRequestRow {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    lineItemId: row.lineItemId,
    requestedById: row.requestedById,
    requestedByName: row.requestedByName,
    requestedByEmail: row.requestedByEmail,
    requestedByRole: row.requestedByRole,
    reason: row.reason,
    status: row.status as DecorationEditRequestRow['status'],
    approvedByName: row.approvedByName,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectedByName: row.rejectedByName,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function escapeHtml(v: string | null | undefined) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function buildEmailText({ request, productTitle, approvePath, rejectPath }: {
  request: DecorationEditRequestRow;
  productTitle: string;
  approvePath: string;
  rejectPath: string;
}) {
  return [
    `Decoration Edit Access Request`,
    ``,
    `Decorator: ${request.requestedByName} (${getRoleLabel(request.requestedByRole)})`,
    `Order: #${request.orderNumber}`,
    `Product: ${productTitle || '—'}`,
    ``,
    `Reason:`,
    request.reason || '—',
    ``,
    `Approve: ${approvePath}`,
    `Reject: ${rejectPath}`,
    ``,
    `This request expires on ${new Date(request.expiresAt).toLocaleString()}.`,
  ].join('\n');
}

function buildEmailHtml({ request, productTitle, approvePath, rejectPath }: {
  request: DecorationEditRequestRow;
  productTitle: string;
  approvePath: string;
  rejectPath: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px">
      <h2 style="margin:0 0 12px">Decoration Edit Access Request</h2>
      <table style="border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280;white-space:nowrap">Decorator</td><td style="padding:3px 0">${escapeHtml(request.requestedByName)} (${escapeHtml(getRoleLabel(request.requestedByRole))})</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Order</td><td style="padding:3px 0">#${escapeHtml(request.orderNumber)}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Product</td><td style="padding:3px 0">${escapeHtml(productTitle)}</td></tr>
      </table>
      <p style="font-size:13px;color:#374151;font-weight:600;margin:0 0 4px">Reason</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:20px;white-space:pre-wrap;font-size:14px">${escapeHtml(request.reason || '—')}</div>
      <div style="display:flex;gap:12px">
        <a href="${approvePath}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">Approve</a>
        <a href="${rejectPath}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">Reject</a>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Expires ${escapeHtml(new Date(request.expiresAt).toLocaleString())}</p>
    </div>
  `;
}
