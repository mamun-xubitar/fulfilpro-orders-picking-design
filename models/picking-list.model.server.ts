import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma.server';
import { sendAppMail } from '@/lib/email.server';
import { resolvePickerRecipientOptions } from '@/lib/email-rules.server';
import { createNotification } from '@/lib/notifications.server';

export type PickingLineInput = {
  lineItemId: string;
  quantity: number;
  full: boolean;
};

type Actor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
} | null;

type NotifyRecipient = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type OrderItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  title: string;
  variantTitle: string;
  variantOptions: Array<{ name: string; value: string }>;
  imageUrl: string | null;
  sku: string;
  vendor: string;
  qty: number;
  position: number;
};

export class PickingListModel {
  async listRecipientOptions() {
    const [packingOptions, messageOptions] = await Promise.all([
      resolvePickerRecipientOptions('picking_packing'),
      resolvePickerRecipientOptions('direct_message'),
    ]);

    return {
      packingRecipients: packingOptions.allowedUsers,
      packingDefaultRecipientUserIds: packingOptions.defaultUserIds,
      messageRecipients: messageOptions.allowedUsers,
      messageDefaultRecipientUserIds: messageOptions.defaultUserIds,
    };
  }

  async confirmPacked(params: {
    orderId: string;
    lines: PickingLineInput[];
    notifyUserIds: string[];
    notifyMessage: string;
    actor: Actor;
    originUrl?: string;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: {
        store: { select: { name: true, storeDomain: true } },
        packingConfirmations: true,
      },
    });

    if (!order) throw new Error('Order not found');
    if (order.canceled) throw new Error('Canceled orders cannot be packed');
    if (order.closed) throw new Error('Closed orders cannot be packed');

    const items = toLineItems(order.lineItems);
    const normalizedLines = normalizePackingLines(params.lines, items, order.packingConfirmations);
    if (normalizedLines.length === 0) throw new Error('Select at least one item quantity to pack');

    const recipientOptions = await resolvePickerRecipientOptions('picking_packing');
    const recipients = toConfiguredRecipients(params.notifyUserIds, recipientOptions.allowedUsers);
    const saved = await prisma.orderPackingConfirmation.create({
      data: {
        orderId: order.id,
        orderNumber: String(order.number),
        lines: normalizedLines as Prisma.InputJsonValue,
        notifyRecipients: recipients as Prisma.InputJsonValue,
        notifyMessage: params.notifyMessage || null,
        pickerId: params.actor?.id ?? null,
        pickerName: params.actor?.name ?? null,
        pickerEmail: params.actor?.email ?? null,
      },
    });

    if (recipients.length > 0) {
      await sendPackingEmail({
        type: 'confirmed',
        order,
        lines: normalizedLines,
        items,
        recipients,
        message: params.notifyMessage,
        actor: params.actor,
        originUrl: params.originUrl,
      });
    }

    return { confirmationId: saved.id };
  }

  async cancelPacked(params: {
    orderId: string;
    confirmationId: string;
    notifyUserIds: string[];
    notifyMessage: string;
    actor: Actor;
    originUrl?: string;
  }) {
    const confirmation = await prisma.orderPackingConfirmation.findFirst({
      where: { id: params.confirmationId, orderId: params.orderId },
      include: {
        order: {
          include: {
            store: { select: { name: true, storeDomain: true } },
          },
        },
      },
    });

    if (!confirmation) throw new Error('Packing confirmation not found');
    if (confirmation.canceledAt) throw new Error('Packing confirmation is already canceled');

    const recipientOptions = await resolvePickerRecipientOptions('picking_packing');
    const recipients = toConfiguredRecipients(params.notifyUserIds, recipientOptions.allowedUsers);
    await prisma.orderPackingConfirmation.update({
      where: { id: confirmation.id },
      data: {
        canceledAt: new Date(),
        canceledById: params.actor?.id ?? null,
        canceledByName: params.actor?.name ?? null,
        canceledByEmail: params.actor?.email ?? null,
        cancelNotifyRecipients: recipients as Prisma.InputJsonValue,
        cancelNotifyMessage: params.notifyMessage || null,
      },
    });

    if (recipients.length > 0) {
      await sendPackingEmail({
        type: 'canceled',
        order: confirmation.order,
        lines: normalizeStoredLines(confirmation.lines),
        items: toLineItems(confirmation.order.lineItems),
        recipients,
        message: params.notifyMessage,
        actor: params.actor,
        originUrl: params.originUrl,
      });
    }

    return { orderId: params.orderId };
  }

  async recordPrints(params: {
    orders: Array<{ orderId: string; items: unknown[] }>;
    actor: Actor;
  }) {
    if (params.orders.length === 0) throw new Error('Select at least one order to print');

    const orderIds = params.orders.map((order) => order.orderId);
    const existing = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, number: true },
    });
    const orderNumberById = new Map(existing.map((order) => [order.id, order.number]));

    await prisma.orderPickingSlipPrint.createMany({
      data: params.orders.map((order) => ({
        orderId: order.orderId,
        orderNumber: String(orderNumberById.get(order.orderId) ?? ''),
        items: order.items as Prisma.InputJsonValue,
        pickerId: params.actor?.id ?? null,
        pickerName: params.actor?.name ?? null,
        pickerEmail: params.actor?.email ?? null,
      })),
    });

    return { printedOrderIds: orderIds };
  }

}

function toLineItems(value: Prisma.JsonValue): OrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const obj = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      id: typeof obj.id === 'string' ? obj.id : String(obj.id ?? ''),
      productId: typeof obj.productId === 'string' ? obj.productId : (obj.productId ? String(obj.productId) : null),
      variantId: typeof obj.variantId === 'string' ? obj.variantId : (obj.variantId ? String(obj.variantId) : null),
      name: typeof obj.name === 'string' ? obj.name : '',
      title: typeof obj.title === 'string' ? obj.title : (typeof obj.name === 'string' ? obj.name : ''),
      variantTitle: typeof obj.variantTitle === 'string' ? obj.variantTitle : '',
      variantOptions: normalizeVariantOptions(obj.variantOptions),
      imageUrl: typeof obj.imageUrl === 'string' && obj.imageUrl.trim() ? obj.imageUrl : null,
      sku: typeof obj.sku === 'string' ? obj.sku : '',
      vendor: typeof obj.vendor === 'string' ? obj.vendor : '',
      qty: typeof obj.qty === 'number' ? obj.qty : Number(obj.qty ?? 0),
      position: typeof obj.position === 'number' ? obj.position : index,
    };
  });
}

function normalizeVariantOptions(value: unknown): Array<{ name: string; value: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => {
      if (!option || typeof option !== 'object') return null;
      const obj = option as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      const optionValue = typeof obj.value === 'string' ? obj.value.trim() : '';
      return name && optionValue ? { name, value: optionValue } : null;
    })
    .filter((option): option is { name: string; value: string } => Boolean(option));
}

function normalizeStoredLines(value: Prisma.JsonValue): PickingLineInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((line) => {
      if (!line || typeof line !== 'object') return null;
      const obj = line as Record<string, unknown>;
      const lineItemId = typeof obj.lineItemId === 'string' ? obj.lineItemId : '';
      const quantity = typeof obj.quantity === 'number' ? obj.quantity : Number(obj.quantity ?? 0);
      const full = Boolean(obj.full);
      return lineItemId && quantity > 0 ? { lineItemId, quantity, full } : null;
    })
    .filter((line): line is PickingLineInput => Boolean(line));
}

function normalizePackingLines(
  lines: PickingLineInput[],
  items: OrderItem[],
  confirmations: Array<{ lines: Prisma.JsonValue; canceledAt: Date | null }>
) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const packedByLine = getPackedByLine(confirmations.filter((confirmation) => !confirmation.canceledAt));
  return lines
    .map((line) => {
      const item = itemById.get(line.lineItemId);
      if (!item) return null;
      const alreadyPacked = packedByLine.get(item.id) ?? 0;
      const remaining = Math.max(0, item.qty - alreadyPacked);
      const requestedQuantity = Number.isFinite(line.quantity) ? Math.floor(line.quantity) : 0;
      const quantity = Math.min(remaining, Math.max(0, requestedQuantity));
      if (quantity < 1) return null;
      return { lineItemId: item.id, quantity, full: Boolean(line.full) || quantity === remaining };
    })
    .filter((line): line is PickingLineInput => Boolean(line));
}

function getPackedByLine(confirmations: Array<{ lines: Prisma.JsonValue }>) {
  const packed = new Map<string, number>();
  confirmations.forEach((confirmation) => {
    normalizeStoredLines(confirmation.lines).forEach((line) => {
      packed.set(line.lineItemId, (packed.get(line.lineItemId) ?? 0) + line.quantity);
    });
  });
  return packed;
}

function toConfiguredRecipients(userIds: string[], allowedUsers: NotifyRecipient[]): NotifyRecipient[] {
  const ids = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) return [];
  const allowedById = new Map(allowedUsers.map((user) => [user.id, user]));
  return ids
    .map((id) => allowedById.get(id))
    .filter((user): user is NotifyRecipient => Boolean(user));
}

async function sendPackingEmail(params: {
  type: 'confirmed' | 'canceled';
  order: { id: string; number: number; cusName: string; store: { name: string | null; storeDomain: string } };
  lines: PickingLineInput[];
  items: OrderItem[];
  recipients: NotifyRecipient[];
  message: string;
  actor: Actor;
  originUrl?: string;
}) {
  const itemById = new Map(params.items.map((item) => [item.id, item]));
  const verb = params.type === 'confirmed' ? 'confirmed packed' : 'canceled packed';
  const lines = params.lines.map((line) => {
    const item = itemById.get(line.lineItemId);
    return `- ${item?.name ?? line.lineItemId} (${item?.sku || 'no SKU'}): x${line.quantity}`;
  }).join('\n');
  const actor = params.actor?.name || params.actor?.email || 'Order picker';
  const url = params.originUrl ? `${params.originUrl}/orders?search=${encodeURIComponent(params.order.number)}` : '';
  const note = params.message ? `\n\nMessage:\n${params.message}` : '';
  try {
    await sendAppMail({
      to: params.recipients.map((recipient) => recipient.email),
      subject: `Order ${params.order.number} packing ${params.type}`,
      text: `${actor} ${verb} items for order ${params.order.number} (${params.order.cusName}).\n\n${lines}${note}${url ? `\n\n${url}` : ''}`,
      html: `<p><strong>${escapeHtml(actor)}</strong> ${escapeHtml(verb)} items for order <strong>${escapeHtml(params.order.number)}</strong> (${escapeHtml(params.order.cusName)}).</p><pre>${escapeHtml(lines)}</pre>${params.message ? `<p><strong>Message:</strong><br>${escapeHtml(params.message).replace(/\n/g, '<br>')}</p>` : ''}${url ? `<p><a href="${escapeHtml(url)}">Open order</a></p>` : ''}`,
    });
  } catch (error) {
    // The packing change is already saved: a broken mail connection must not report it as failed.
    console.error('Failed to send packing email:', error);
  }

  await Promise.all(params.recipients.map((r) =>
    createNotification({
      recipientId: r.id,
      type: 'packing_notification',
      title: `Packing ${params.type}`,
      body: `Order #${params.order.number} packing ${params.type} by ${params.actor?.name || 'picker'}`,
      orderId: params.order.id,
      orderNumber: String(params.order.number),
    })
  ));
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
