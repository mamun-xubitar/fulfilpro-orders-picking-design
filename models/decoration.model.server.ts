import prisma from '@/lib/prisma.server';
import { sendGoogleMail } from '@/lib/google-mail.server';
import {
  DECORATOR_ROLES,
  getDecoratorCategory,
  getRoleLabel,
  isDecoratorRole,
  type DecorationCategory,
} from '@/lib/roles';

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

    return this.listLineItemAssignments(orderId, lineItemId);
  }

  async deleteAssignment(orderId: string, lineItemId: string, assignmentId: string): Promise<AssignmentRow[]> {
    await prisma.lineItemAssignment.deleteMany({
      where: { id: assignmentId, orderId, lineItemId },
    });
    return this.listLineItemAssignments(orderId, lineItemId);
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
