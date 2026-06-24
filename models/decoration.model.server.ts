import prisma from '@/lib/prisma.server';
import { sendGoogleMail } from '@/lib/google-mail.server';
import {
  ADMIN_ROLE,
  DECORATOR_ROLES,
  getDecoratorCategory,
  getRoleLabel,
  isDecoratorRole,
  type DecorationCategory,
} from '@/lib/roles';
import { createNotification } from '@/lib/notifications.server';

export type DecoratorUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  category: DecorationCategory | null;
};

export type AssignmentRow = {
  id: string;
  lineItemId: string;
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  assigneeRole: string;
  category: string | null;
  dueDate: string | null;
  assignedByName: string | null;
  createdAt: string;
};

type AssignmentRecord = {
  id: string;
  lineItemId: string;
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  assigneeRole: string;
  category: string | null;
  dueDate: Date | null;
  assignedByName: string | null;
  createdAt: Date;
};

function toAssignmentRow(row: AssignmentRecord): AssignmentRow {
  return {
    id: row.id,
    lineItemId: row.lineItemId,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    assigneeEmail: row.assigneeEmail,
    assigneeRole: row.assigneeRole,
    category: row.category,
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    assignedByName: row.assignedByName,
    createdAt: row.createdAt.toISOString(),
  };
}

const ASSIGNMENT_SELECT = {
  id: true,
  lineItemId: true,
  assigneeId: true,
  assigneeName: true,
  assigneeEmail: true,
  assigneeRole: true,
  category: true,
  dueDate: true,
  assignedByName: true,
  createdAt: true,
} as const;

/** Batch-load assignments for a set of orders, keyed by orderId -> lineItemId -> rows. */
export async function getAssignmentsByOrder(orderIds: string[]) {
  const map = new Map<string, Map<string, AssignmentRow[]>>();
  if (orderIds.length === 0) return map;

  const rows = await prisma.lineItemAssignment.findMany({
    where: { orderId: { in: orderIds } },
    select: { ...ASSIGNMENT_SELECT, orderId: true },
    orderBy: { createdAt: 'asc' },
  });

  for (const row of rows) {
    let byLine = map.get(row.orderId);
    if (!byLine) {
      byLine = new Map();
      map.set(row.orderId, byLine);
    }
    const list = byLine.get(row.lineItemId) ?? [];
    list.push(toAssignmentRow(row));
    byLine.set(row.lineItemId, list);
  }

  return map;
}

export type DecorationFileRef = { name: string; url: string; size?: number; mimeType?: string };
export type DecorationWorkComment = {
  sizes?: string;
  colors?: string;
  remarks?: string;
  location?: string;
  files?: DecorationFileRef[];
};
export type DecorationWorkRecord = {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: string;
  category: string;
  quantityDone: number;
  comments: DecorationWorkComment[];
  createdAt: string;
};
export type LineDecorationSummary = {
  doneQty: number;
  works: DecorationWorkRecord[];
  hasPendingRequest: boolean;
  hasActiveGrant: boolean;
};

export function normalizeWorkComments(value: unknown): DecorationWorkComment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const obj = row as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
      const files = Array.isArray(obj.files)
        ? obj.files
            .map((f) => {
              if (!f || typeof f !== 'object') return null;
              const fo = f as Record<string, unknown>;
              const name = typeof fo.name === 'string' ? fo.name : '';
              const url = typeof fo.url === 'string' ? fo.url : '';
              if (!name || !url) return null;
              const ref: DecorationFileRef = { name, url };
              if (typeof fo.size === 'number') ref.size = fo.size;
              if (typeof fo.mimeType === 'string') ref.mimeType = fo.mimeType;
              return ref;
            })
            .filter((f): f is DecorationFileRef => Boolean(f))
        : [];
      const comment: DecorationWorkComment = {
        sizes: str(obj.sizes),
        colors: str(obj.colors),
        remarks: str(obj.remarks),
        location: str(obj.location),
        files: files.length > 0 ? files : undefined,
      };
      const hasContent = comment.sizes || comment.colors || comment.remarks || comment.location || comment.files;
      return hasContent ? comment : null;
    })
    .filter((c): c is DecorationWorkComment => Boolean(c));
}

function toWorkRecord(row: {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: string;
  category: string;
  quantityDone: number;
  comments: unknown;
  createdAt: Date;
}): DecorationWorkRecord {
  return {
    id: row.id,
    workerId: row.workerId,
    workerName: row.workerName,
    workerRole: row.workerRole,
    category: row.category,
    quantityDone: row.quantityDone,
    comments: normalizeWorkComments(row.comments),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Per-line decoration summary for a set of orders, keyed orderId -> lineItemId.
 * doneQty counts ALL decorators' work; detailed `works` (with comments/files) are
 * included only for admins and for the decorator who authored them.
 */
export async function getDecorationSummariesByOrder(
  orderIds: string[],
  viewer: { id?: string | null; role?: string | null }
) {
  const map = new Map<string, Map<string, LineDecorationSummary>>();
  if (orderIds.length === 0) return map;

  const isAdmin = viewer.role === 'admin';

  const [works, requests] = await Promise.all([
    prisma.lineItemWork.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, orderId: true, lineItemId: true, workerId: true, workerName: true,
        workerRole: true, category: true, quantityDone: true, comments: true, createdAt: true,
      },
    }),
    prisma.decorationEditRequest.findMany({
      where: { orderId: { in: orderIds }, status: { in: ['pending', 'approved'] }, expiresAt: { gt: new Date() } },
      select: { orderId: true, lineItemId: true, status: true },
    }),
  ]);

  const ensure = (orderId: string, lineItemId: string): LineDecorationSummary => {
    let byLine = map.get(orderId);
    if (!byLine) {
      byLine = new Map();
      map.set(orderId, byLine);
    }
    let summary = byLine.get(lineItemId);
    if (!summary) {
      summary = { doneQty: 0, works: [], hasPendingRequest: false, hasActiveGrant: false };
      byLine.set(lineItemId, summary);
    }
    return summary;
  };

  for (const work of works) {
    const summary = ensure(work.orderId, work.lineItemId);
    summary.doneQty += work.quantityDone;
    if (isAdmin || work.workerId === viewer.id) {
      summary.works.push(toWorkRecord(work));
    }
  }

  for (const request of requests) {
    const summary = ensure(request.orderId, request.lineItemId);
    if (request.status === 'pending') summary.hasPendingRequest = true;
    if (request.status === 'approved') summary.hasActiveGrant = true;
  }

  return map;
}

async function getLineItemContext(orderId: string, lineItemId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { number: true, lineItems: true },
  });
  if (!order) throw new Error('Order not found');

  let qty = 0;
  if (Array.isArray(order.lineItems)) {
    for (const item of order.lineItems) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      if (String(obj.id ?? '') === lineItemId) {
        qty = typeof obj.qty === 'number' ? obj.qty : Number(obj.qty ?? 0);
        break;
      }
    }
  }

  return { orderNumber: order.number, qty };
}

export class DecorationModel {
  async listDecoratorUsers(): Promise<DecoratorUser[]> {
    const users = await prisma.user.findMany({
      where: { active: true, role: { in: [...DECORATOR_ROLES] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });

    return users.map((user) => ({ ...user, category: getDecoratorCategory(user.role) }));
  }

  async listLineItemAssignments(orderId: string, lineItemId: string): Promise<AssignmentRow[]> {
    const rows = await prisma.lineItemAssignment.findMany({
      where: { orderId, lineItemId },
      select: ASSIGNMENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toAssignmentRow);
  }

  async createAssignment(params: {
    orderId: string;
    lineItemId: string;
    assigneeId: string;
    dueDate: string | null;
    assignedBy: { id?: string | null; name?: string | null };
  }): Promise<AssignmentRow[]> {
    const { orderId, lineItemId, assigneeId, dueDate, assignedBy } = params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { number: true, lineItems: true },
    });
    if (!order) throw new Error('Order not found');

    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!assignee || !assignee.active) throw new Error('Assignee not found');
    if (!isDecoratorRole(assignee.role)) throw new Error('Assignee must be a decorator');

    const dueDateValue = dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null;
    const category = getDecoratorCategory(assignee.role);

    await prisma.lineItemAssignment.upsert({
      where: { orderId_lineItemId_assigneeId: { orderId, lineItemId, assigneeId } },
      create: {
        orderId,
        orderNumber: order.number,
        lineItemId,
        assigneeId: assignee.id,
        assigneeName: assignee.name,
        assigneeEmail: assignee.email,
        assigneeRole: assignee.role,
        category,
        dueDate: dueDateValue,
        assignedById: assignedBy.id ?? null,
        assignedByName: assignedBy.name ?? null,
      },
      update: {
        dueDate: dueDateValue,
        assignedById: assignedBy.id ?? null,
        assignedByName: assignedBy.name ?? null,
        assigneeName: assignee.name,
        assigneeEmail: assignee.email,
        assigneeRole: assignee.role,
        category,
      },
    });

    const productTitle = findLineItemTitle(order.lineItems, lineItemId);
    await sendAssignmentEmail({
      to: assignee.email,
      assigneeName: assignee.name,
      role: assignee.role,
      orderNumber: order.number,
      productTitle,
      dueDate,
    });

    await createNotification({
      recipientId: assignee.id,
      type: 'assignment',
      title: 'New assignment',
      body: `You've been assigned to Order #${order.number}${productTitle ? ` — ${productTitle}` : ''}${dueDate ? ` (due ${dueDate})` : ''}`,
      orderId,
      orderNumber: order.number,
      lineItemId,
    });

    return this.listLineItemAssignments(orderId, lineItemId);
  }

  async deleteAssignment(orderId: string, lineItemId: string, assignmentId: string): Promise<AssignmentRow[]> {
    await prisma.lineItemAssignment.deleteMany({
      where: { id: assignmentId, orderId, lineItemId },
    });
    return this.listLineItemAssignments(orderId, lineItemId);
  }

  async getLineItemMeta(orderId: string, lineItemId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { number: true, lineItems: true },
    });
    if (!order) throw new Error('Order not found');
    return { orderNumber: order.number, productTitle: findLineItemTitle(order.lineItems, lineItemId) };
  }

  async createWork(params: {
    orderId: string;
    lineItemId: string;
    worker: { id: string; name: string; email: string; role: string };
    quantityDone: number;
    comments: DecorationWorkComment[];
  }) {
    const { orderId, lineItemId, worker } = params;
    const isAdmin = worker.role === ADMIN_ROLE;
    if (!isAdmin && !isDecoratorRole(worker.role)) throw new Error('Only decorators can mark work as done');

    const { orderNumber, qty } = await getLineItemContext(orderId, lineItemId);

    const [doneAgg, activeGrant] = await Promise.all([
      prisma.lineItemWork.aggregate({ where: { orderId, lineItemId }, _sum: { quantityDone: true } }),
      prisma.decorationEditRequest.findFirst({
        where: { orderId, lineItemId, status: 'approved', expiresAt: { gt: new Date() } },
        orderBy: { approvedAt: 'desc' },
      }),
    ]);

    const doneQty = doneAgg._sum.quantityDone ?? 0;
    const remaining = Math.max(0, qty - doneQty);
    const fullyDone = qty > 0 && doneQty >= qty;

    if (fullyDone && !activeGrant && !isAdmin) {
      throw new Error('This item is locked. Request edit access from an admin.');
    }

    const quantity = Math.floor(params.quantityDone);
    if (!Number.isFinite(quantity) || quantity < 1) throw new Error('Quantity must be at least 1');
    if (quantity > remaining) throw new Error(`Only ${remaining} left to mark as done`);

    let category: string;
    if (isAdmin) {
      const flags = await prisma.lineItemDecoration.findUnique({
        where: { orderId_lineItemId: { orderId, lineItemId } },
        select: { isEmbroidery: true, isPrint: true },
      });
      category = flags?.isEmbroidery ? 'embroidery' : flags?.isPrint ? 'print' : 'sewing';
    } else {
      category = getDecoratorCategory(worker.role) ?? 'sewing';
    }

    await prisma.lineItemWork.create({
      data: {
        orderId,
        orderNumber,
        lineItemId,
        workerId: worker.id,
        workerName: worker.name,
        workerEmail: worker.email,
        workerRole: worker.role,
        category,
        quantityDone: quantity,
        comments: params.comments as object[],
      },
    });

    // Re-lock: if the item is now fully done and a grant was consumed, mark it completed.
    if (activeGrant && doneQty + quantity >= qty) {
      await prisma.decorationEditRequest.update({
        where: { id: activeGrant.id },
        data: { status: 'completed', completedAt: new Date() },
      });
    }

    const admins = await prisma.user.findMany({ where: { active: true, role: 'admin' }, select: { id: true } });
    await Promise.all(
      admins.map((a) =>
        createNotification({
          recipientId: a.id,
          type: 'work_done',
          title: 'Decoration work logged',
          body: `${worker.name} marked ${quantity} item(s) done on Order #${orderNumber}`,
          orderId,
          orderNumber,
          lineItemId,
        })
      )
    );

    return { orderId, lineItemId };
  }

  async deleteWork(params: {
    orderId: string;
    lineItemId: string;
    workId: string;
    viewer: { id: string; role: string };
  }) {
    const { orderId, lineItemId, workId, viewer } = params;
    const work = await prisma.lineItemWork.findUnique({ where: { id: workId } });
    if (!work || work.orderId !== orderId || work.lineItemId !== lineItemId) {
      throw new Error('Work record not found');
    }

    const isAdmin = viewer.role === 'admin';
    if (!isAdmin && work.workerId !== viewer.id) {
      throw new Error('You can only remove your own work');
    }

    if (!isAdmin) {
      const { qty } = await getLineItemContext(orderId, lineItemId);
      const doneAgg = await prisma.lineItemWork.aggregate({ where: { orderId, lineItemId }, _sum: { quantityDone: true } });
      const doneQty = doneAgg._sum.quantityDone ?? 0;
      const fullyDone = qty > 0 && doneQty >= qty;
      if (fullyDone) {
        const grant = await prisma.decorationEditRequest.findFirst({
          where: { orderId, lineItemId, status: 'approved', expiresAt: { gt: new Date() } },
        });
        if (!grant) throw new Error('This item is locked. Request edit access from an admin.');
      }
    }

    await prisma.lineItemWork.delete({ where: { id: workId } });
    return { orderId, lineItemId };
  }
}

function findLineItemTitle(lineItems: unknown, lineItemId: string): string {
  if (!Array.isArray(lineItems)) return '';
  for (const item of lineItems) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    if (String(obj.id ?? '') === lineItemId) {
      const title = typeof obj.title === 'string' ? obj.title : '';
      const name = typeof obj.name === 'string' ? obj.name : '';
      return title || name;
    }
  }
  return '';
}

async function sendAssignmentEmail(params: {
  to: string;
  assigneeName: string;
  role: string;
  orderNumber: string;
  productTitle: string;
  dueDate: string | null;
}) {
  const appUrl = (process.env.APP_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');
  const ordersLink = appUrl ? `${appUrl}/orders` : '';
  const roleLabel = getRoleLabel(params.role);
  const dueLine = params.dueDate ? `<p><strong>Complete by:</strong> ${escapeHtml(params.dueDate)}</p>` : '';
  const linkLine = ordersLink ? `<p><a href="${ordersLink}">Open the orders page</a></p>` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #111;">
      <p>Hi ${escapeHtml(params.assigneeName)},</p>
      <p>You have been assigned a new ${escapeHtml(roleLabel)} task.</p>
      <p><strong>Order:</strong> ${escapeHtml(params.orderNumber)}</p>
      <p><strong>Product:</strong> ${escapeHtml(params.productTitle || '—')}</p>
      ${dueLine}
      ${linkLine}
    </div>
  `;

  const textParts = [
    `Hi ${params.assigneeName},`,
    `You have been assigned a new ${roleLabel} task.`,
    `Order: ${params.orderNumber}`,
    `Product: ${params.productTitle || '—'}`,
  ];
  if (params.dueDate) textParts.push(`Complete by: ${params.dueDate}`);
  if (ordersLink) textParts.push(`Open: ${ordersLink}`);

  try {
    await sendGoogleMail({
      to: [params.to],
      subject: `New ${roleLabel} task — Order ${params.orderNumber}`,
      html,
      text: textParts.join('\n'),
    });
  } catch (error) {
    console.error('Failed to send assignment email', { to: params.to, orderNumber: params.orderNumber, error });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
