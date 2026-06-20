import prisma from '@/lib/prisma.server';
import { sendGoogleMail } from '@/lib/google-mail.server';
import { resolvePickerRecipientOptions } from '@/lib/email-rules.server';
import { createNotification } from '@/lib/notifications.server';

export type AdminTarget = { id: string; name: string; email: string };

export type FulfillmentEditRequestRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  fulfillmentId: string;
  requestType: 'edit' | 'cancel';
  requestedById: string;
  requestedByName: string;
  requestedByEmail: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminTargets: AdminTarget[];
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedById: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

const REQUEST_EXPIRY_DAYS = 7;

export class FulfillmentEditRequestModel {
  async create(params: {
    orderId: string;
    orderNumber: string;
    fulfillmentId: string;
    requestType: 'edit' | 'cancel';
    requestedBy: { id: string; name: string; email: string };
    adminIds: string[];
    reason: string;
    originUrl: string;
  }) {
    const recipientOptions = await resolvePickerRecipientOptions('fulfillment_request');
    const selectedIds = new Set(params.adminIds.map((id) => id.trim()).filter(Boolean));
    const admins = recipientOptions.allowedUsers.filter((user) => selectedIds.has(user.id));

    if (admins.length === 0) {
      throw new Error('No valid active admins selected');
    }

    const approveToken = crypto.randomUUID();
    const rejectToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const adminTargets: AdminTarget[] = admins.map((a) => ({ id: a.id, name: a.name, email: a.email }));

    const request = await prisma.fulfillmentEditRequest.create({
      data: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        fulfillmentId: params.fulfillmentId,
        requestType: params.requestType,
        requestedById: params.requestedBy.id,
        requestedByName: params.requestedBy.name,
        requestedByEmail: params.requestedBy.email,
        reason: params.reason,
        adminTargets: adminTargets as object[],
        approveToken,
        rejectToken,
        expiresAt,
      },
    });

    const approvePath = `${process.env.APP_URL?.replace(/\/$/, '') || params.originUrl}/api/fulfillment-requests/${request.id}/approve?token=${approveToken}`;
    const rejectPath = `${process.env.APP_URL?.replace(/\/$/, '') || params.originUrl}/api/fulfillment-requests/${request.id}/reject?token=${rejectToken}`;

    try {
      await sendGoogleMail({
        to: admins.map((a) => a.email),
        subject: `Permission request: ${params.requestType === 'edit' ? 'Edit' : 'Cancel'} fulfillment for Order #${params.orderNumber}`,
        text: buildRequestEmailText({ request: toRow(request), approvePath, rejectPath }),
        html: buildRequestEmailHtml({ request: toRow(request), approvePath, rejectPath }),
      });
    } catch {
      // Don't fail the request creation if email fails; admin can still approve from dashboard
    }

    void Promise.all(admins.map((admin) =>
      createNotification({
        recipientId: admin.id,
        type: 'fulfillment_request',
        title: 'Fulfillment permission request',
        body: `${params.requestedBy.name} requested ${params.requestType} on Order #${params.orderNumber}`,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        relatedRequestId: request.id,
        actionable: true,
      })
    )).catch(() => undefined);

    return toRow(request);
  }

  async listForOrder(orderId: string) {
    const rows = await prisma.fulfillmentEditRequest.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRow);
  }

  async listPending() {
    const rows = await prisma.fulfillmentEditRequest.findMany({
      where: { status: 'pending', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRow);
  }

  async listForStaff(staffId: string) {
    const rows = await prisma.fulfillmentEditRequest.findMany({
      where: { requestedById: staffId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRow);
  }

  async approveById(requestId: string, adminId: string, adminName: string) {
    const existing = await prisma.fulfillmentEditRequest.findUnique({ where: { id: requestId } });
    if (!existing) throw new Error('Request not found');
    if (existing.status !== 'pending') throw new Error('Request is no longer pending');
    if (existing.expiresAt.getTime() <= Date.now()) throw new Error('Request has expired');

    const updated = await prisma.fulfillmentEditRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approvedById: adminId,
        approvedByName: adminName,
        approvedAt: new Date(),
      },
    });

    await Promise.all([
      prisma.notification.updateMany({
        where: { relatedRequestId: requestId, actionable: true },
        data: { actionStatus: 'accepted' },
      }),
      createNotification({
        recipientId: existing.requestedById,
        type: 'fulfillment_request_decision',
        title: 'Fulfillment request approved',
        body: `Your ${existing.requestType} request for Order #${existing.orderNumber} was approved`,
        orderId: existing.orderId,
        orderNumber: existing.orderNumber,
        relatedRequestId: requestId,
      }),
    ]);

    return toRow(updated);
  }

  async rejectById(requestId: string, adminId: string, adminName: string) {
    const existing = await prisma.fulfillmentEditRequest.findUnique({ where: { id: requestId } });
    if (!existing) throw new Error('Request not found');
    if (existing.status !== 'pending') throw new Error('Request is no longer pending');

    const updated = await prisma.fulfillmentEditRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        rejectedById: adminId,
        rejectedByName: adminName,
        rejectedAt: new Date(),
      },
    });

    await Promise.all([
      prisma.notification.updateMany({
        where: { relatedRequestId: requestId, actionable: true },
        data: { actionStatus: 'rejected' },
      }),
      createNotification({
        recipientId: existing.requestedById,
        type: 'fulfillment_request_decision',
        title: 'Fulfillment request rejected',
        body: `Your ${existing.requestType} request for Order #${existing.orderNumber} was rejected`,
        orderId: existing.orderId,
        orderNumber: existing.orderNumber,
        relatedRequestId: requestId,
      }),
    ]);

    return toRow(updated);
  }

  async approveByToken(requestId: string, token: string) {
    const existing = await prisma.fulfillmentEditRequest.findUnique({ where: { id: requestId } });
    if (!existing) throw new Error('Request not found');
    if (existing.approveToken !== token) throw new Error('Invalid token');
    if (existing.status !== 'pending') return toRow(existing);
    if (existing.expiresAt.getTime() <= Date.now()) throw new Error('Request has expired');

    const updated = await prisma.fulfillmentEditRequest.update({
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
        type: 'fulfillment_request_decision',
        title: 'Fulfillment request approved',
        body: `Your ${existing.requestType} request for Order #${existing.orderNumber} was approved`,
        orderId: existing.orderId,
        orderNumber: existing.orderNumber,
        relatedRequestId: requestId,
      }),
    ]);

    return toRow(updated);
  }

  async rejectByToken(requestId: string, token: string) {
    const existing = await prisma.fulfillmentEditRequest.findUnique({ where: { id: requestId } });
    if (!existing) throw new Error('Request not found');
    if (existing.rejectToken !== token) throw new Error('Invalid token');
    if (existing.status !== 'pending') return toRow(existing);

    const updated = await prisma.fulfillmentEditRequest.update({
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
        type: 'fulfillment_request_decision',
        title: 'Fulfillment request rejected',
        body: `Your ${existing.requestType} request for Order #${existing.orderNumber} was rejected`,
        orderId: existing.orderId,
        orderNumber: existing.orderNumber,
        relatedRequestId: requestId,
      }),
    ]);

    return toRow(updated);
  }

  async markCompleted(requestId: string) {
    const updated = await prisma.fulfillmentEditRequest.update({
      where: { id: requestId },
      data: { status: 'completed', completedAt: new Date() },
    });
    return toRow(updated);
  }

  async getActiveApprovedRequest(fulfillmentId: string, requestType: string, staffId: string) {
    const row = await prisma.fulfillmentEditRequest.findFirst({
      where: {
        fulfillmentId,
        requestType,
        requestedById: staffId,
        status: 'approved',
        expiresAt: { gt: new Date() },
      },
      orderBy: { approvedAt: 'desc' },
    });
    return row ? toRow(row) : null;
  }
}

function toAdminTargets(value: unknown): AdminTarget[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AdminTarget => {
    return Boolean(item) && typeof item === 'object' &&
      typeof (item as AdminTarget).id === 'string' &&
      typeof (item as AdminTarget).name === 'string' &&
      typeof (item as AdminTarget).email === 'string';
  });
}

function toRow(row: {
  id: string;
  orderId: string;
  orderNumber: string;
  fulfillmentId: string;
  requestType: string;
  requestedById: string;
  requestedByName: string;
  requestedByEmail: string;
  reason: string;
  status: string;
  adminTargets: unknown;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: Date | null;
  rejectedById: string | null;
  rejectedByName: string | null;
  rejectedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}): FulfillmentEditRequestRow {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    fulfillmentId: row.fulfillmentId,
    requestType: row.requestType as 'edit' | 'cancel',
    requestedById: row.requestedById,
    requestedByName: row.requestedByName,
    requestedByEmail: row.requestedByEmail,
    reason: row.reason,
    status: row.status as FulfillmentEditRequestRow['status'],
    adminTargets: toAdminTargets(row.adminTargets),
    approvedById: row.approvedById,
    approvedByName: row.approvedByName,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectedById: row.rejectedById,
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

function buildRequestEmailText({ request, approvePath, rejectPath }: {
  request: FulfillmentEditRequestRow;
  approvePath: string;
  rejectPath: string;
}) {
  return [
    `Fulfillment Permission Request`,
    ``,
    `Staff: ${request.requestedByName} (${request.requestedByEmail})`,
    `Order: #${request.orderNumber}`,
    `Action: ${request.requestType === 'edit' ? 'Edit' : 'Cancel'} fulfillment`,
    ``,
    `Reason:`,
    request.reason,
    ``,
    `Approve: ${approvePath}`,
    `Reject: ${rejectPath}`,
    ``,
    `This request expires on ${new Date(request.expiresAt).toLocaleString()}.`,
  ].join('\n');
}

function buildRequestEmailHtml({ request, approvePath, rejectPath }: {
  request: FulfillmentEditRequestRow;
  approvePath: string;
  rejectPath: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px">
      <h2 style="margin:0 0 12px">Fulfillment Permission Request</h2>
      <table style="border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280;white-space:nowrap">Staff</td><td style="padding:3px 0">${escapeHtml(request.requestedByName)} &lt;${escapeHtml(request.requestedByEmail)}&gt;</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Order</td><td style="padding:3px 0">#${escapeHtml(request.orderNumber)}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Action</td><td style="padding:3px 0"><strong>${request.requestType === 'edit' ? 'Edit' : 'Cancel'} fulfillment</strong></td></tr>
      </table>
      <p style="font-size:13px;color:#374151;font-weight:600;margin:0 0 4px">Reason</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:20px;white-space:pre-wrap;font-size:14px">${escapeHtml(request.reason)}</div>
      <div style="display:flex;gap:12px">
        <a href="${approvePath}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">Approve</a>
        <a href="${rejectPath}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">Reject</a>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Expires ${escapeHtml(new Date(request.expiresAt).toLocaleString())}</p>
    </div>
  `;
}
