import prisma from '@/lib/prisma.server';
import { sendAppMail } from '@/lib/email.server';
import { normalizeUserIdList } from '@/lib/email-rules.server';
import {
  normalizeWorkComments,
  toOrderAttachments,
  type DecorationWorkComment,
  type OrderDecorationAttachments,
} from '@/models/decoration.model.server';
import { getRoleLabel } from '@/lib/roles';

export type DigestResult =
  | { sent: false; reason: 'no_work' | 'no_recipients' | 'send_failed'; error?: string }
  | { sent: true; workCount: number; workerCount: number; totalDone: number };

type WorkRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  lineItemId: string;
  workerId: string;
  workerName: string;
  workerRole: string;
  category: string;
  quantityDone: number;
  comments: DecorationWorkComment[];
  createdAt: Date;
};

/**
 * Gather all decoration work not yet included in a digest, group it per decorator,
 * email the configured admin recipients, and stamp digestSentAt on the included records.
 * Pass `workerId` to scope to a single decorator (per-user working-hour mode).
 * Never sends when there is no new work or no configured recipients.
 */
export async function runDecorationDigest(options: { workerId?: string; now?: Date } = {}): Promise<DigestResult> {
  const now = options.now ?? new Date();

  const works = await prisma.lineItemWork.findMany({
    where: {
      digestSentAt: null,
      ...(options.workerId ? { workerId: options.workerId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  if (works.length === 0) {
    return { sent: false, reason: 'no_work' };
  }

  const rows: WorkRow[] = works.map((w) => ({
    id: w.id,
    orderId: w.orderId,
    orderNumber: w.orderNumber,
    lineItemId: w.lineItemId,
    workerId: w.workerId,
    workerName: w.workerName,
    workerRole: w.workerRole,
    category: w.category,
    quantityDone: w.quantityDone,
    comments: normalizeWorkComments(w.comments),
    createdAt: w.createdAt,
  }));

  const recipients = await resolveRecipients();
  if (recipients.length === 0) {
    return { sent: false, reason: 'no_recipients' };
  }

  const orderContext = await loadOrderContext([...new Set(rows.map((r) => r.orderId))]);

  const groups = groupByWorker(rows);
  const totalDone = rows.reduce((sum, r) => sum + r.quantityDone, 0);
  const { html, text } = buildEmail(groups, orderContext, totalDone, now, rows);

  const subject = `Decoration work digest — ${formatDate(now)}${
    groups.length === 1 ? ` — ${groups[0].workerName}` : ''
  }`;

  try {
    await sendAppMail({ to: recipients, subject, html, text });
  } catch (error) {
    return { sent: false, reason: 'send_failed', error: error instanceof Error ? error.message : String(error) };
  }

  await prisma.lineItemWork.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { digestSentAt: now },
  });

  return { sent: true, workCount: rows.length, workerCount: groups.length, totalDone };
}

async function resolveRecipients(): Promise<string[]> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: { decorationDigestRecipientUserIds: true },
  });
  const ids = normalizeUserIdList(settings?.decorationDigestRecipientUserIds);
  if (ids.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ids }, active: true, role: 'admin' },
    select: { email: true },
  });
  return users.map((u) => u.email).filter(Boolean);
}

type OrderContext = Map<
  string,
  { customer: string; items: Map<string, { title: string; qty: number }>; attachments: OrderDecorationAttachments }
>;

async function loadOrderContext(orderIds: string[]): Promise<OrderContext> {
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, cusName: true, lineItems: true, decorationAttachment: true },
  });

  const context: OrderContext = new Map();
  for (const order of orders) {
    const items = new Map<string, { title: string; qty: number }>();
    if (Array.isArray(order.lineItems)) {
      for (const raw of order.lineItems) {
        if (!raw || typeof raw !== 'object') continue;
        const obj = raw as Record<string, unknown>;
        const id = String(obj.id ?? '');
        if (!id) continue;
        const title = typeof obj.title === 'string' && obj.title ? obj.title : typeof obj.name === 'string' ? obj.name : '';
        const qty = typeof obj.qty === 'number' ? obj.qty : Number(obj.qty ?? 0);
        items.set(id, { title, qty });
      }
    }
    context.set(order.id, {
      customer: order.cusName,
      items,
      attachments: toOrderAttachments(order.decorationAttachment),
    });
  }
  return context;
}

function groupByWorker(rows: WorkRow[]) {
  const byWorker = new Map<string, { workerName: string; workerRole: string; rows: WorkRow[] }>();
  for (const row of rows) {
    const existing = byWorker.get(row.workerId);
    if (existing) {
      existing.rows.push(row);
    } else {
      byWorker.set(row.workerId, { workerName: row.workerName, workerRole: row.workerRole, rows: [row] });
    }
  }
  return [...byWorker.values()].sort((a, b) => a.workerName.localeCompare(b.workerName));
}

function buildEmail(
  groups: ReturnType<typeof groupByWorker>,
  context: OrderContext,
  totalDone: number,
  now: Date,
  rows: WorkRow[]
) {
  const sections = groups.map((group) => {
    const groupTotal = group.rows.reduce((sum, r) => sum + r.quantityDone, 0);
    const bodyRows = group.rows
      .map((row) => {
        const order = context.get(row.orderId);
        const item = order?.items.get(row.lineItemId);
        const total = item?.qty ?? 0;
        const sizes = joinComments(row.comments, 'sizes');
        const colors = joinComments(row.comments, 'colors');
        const remarks = joinComments(row.comments, 'remarks');
        const location = joinComments(row.comments, 'location');
        return `
          <tr>
            <td style="${TD}">${escapeHtml(row.orderNumber)}</td>
            <td style="${TD}">${escapeHtml(order?.customer ?? '—')}</td>
            <td style="${TD}">${escapeHtml(item?.title || '—')}</td>
            <td style="${TD}">${row.quantityDone} / ${total}</td>
            <td style="${TD}">${sizes || '—'}</td>
            <td style="${TD}">${colors || '—'}</td>
            <td style="${TD}">${remarks || '—'}</td>
            <td style="${TD}">${location || '—'}</td>
          </tr>`;
      })
      .join('');

    return `
      <h3 style="margin:20px 0 6px;font-size:15px;color:#111;">
        ${escapeHtml(group.workerName)}
        <span style="font-weight:400;color:#666;">· ${escapeHtml(getRoleLabel(group.workerRole))} · ${groupTotal} done</span>
      </h3>
      <table style="border-collapse:collapse;width:100%;font-size:12px;">
        <thead>
          <tr>
            ${['Order', 'Customer', 'Product', 'Qty (done/total)', 'Sizes', 'Colors', 'Remarks', 'Location']
              .map((h) => `<th style="${TH}">${h}</th>`)
              .join('')}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>`;
  });

  const attachmentsHtml = buildAttachmentsSection(rows, context);

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;">
      <h2 style="font-size:18px;margin-bottom:4px;">Decoration Work Digest</h2>
      <p style="color:#666;margin-top:0;">${escapeHtml(formatDate(now))} · ${totalDone} item(s) completed</p>
      ${sections.join('')}
      ${attachmentsHtml}
    </div>`;

  const text = groups
    .map((group) => {
      const lines = group.rows.map((row) => {
        const order = context.get(row.orderId);
        const item = order?.items.get(row.lineItemId);
        return `  ${row.orderNumber} | ${order?.customer ?? '—'} | ${item?.title || '—'} | ${row.quantityDone}/${item?.qty ?? 0}`;
      });
      return `${group.workerName} (${getRoleLabel(group.workerRole)}):\n${lines.join('\n')}`;
    })
    .join('\n\n');

  const attachmentsText = buildAttachmentsText(rows, context);

  return {
    html,
    text: `Decoration Work Digest — ${formatDate(now)}\nTotal done: ${totalDone}\n\n${text}${attachmentsText}`,
  };
}

function dedupeOrders(rows: WorkRow[]): Map<string, string> {
  const orders = new Map<string, string>();
  for (const row of rows) {
    if (!orders.has(row.orderId)) orders.set(row.orderId, row.orderNumber);
  }
  return orders;
}

function hasAttachments(attachments: OrderDecorationAttachments) {
  return (
    attachments.files.length > 0 ||
    attachments.customerDesign.length > 0 ||
    attachments.photos.length > 0 ||
    Boolean(attachments.customerRemarks)
  );
}

function buildAttachmentsSection(rows: WorkRow[], context: OrderContext): string {
  const orders = dedupeOrders(rows);
  const blocks = [...orders.entries()]
    .map(([orderId, orderNumber]) => {
      const order = context.get(orderId);
      if (!order || !hasAttachments(order.attachments)) return '';

      const fields: Array<[string, string]> = [
        ['Files', renderFileLinks(order.attachments.files)],
        ['Customer design', renderFileLinks(order.attachments.customerDesign)],
        ['Photo', renderFileLinks(order.attachments.photos)],
        ['Customer remarks', order.attachments.customerRemarks ? escapeHtml(order.attachments.customerRemarks) : ''],
      ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;

      const fieldRows = fields
        .map(
          ([label, value]) => `
            <tr>
              <td style="${TD}font-weight:600;width:140px;">${escapeHtml(label)}</td>
              <td style="${TD}">${value}</td>
            </tr>`
        )
        .join('');

      return `
        <h3 style="margin:20px 0 6px;font-size:15px;color:#111;">
          ${escapeHtml(orderNumber)}
          <span style="font-weight:400;color:#666;">· ${escapeHtml(order.customer)}</span>
        </h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;">
          <tbody>${fieldRows}</tbody>
        </table>`;
    })
    .filter(Boolean);

  if (blocks.length === 0) return '';

  return `<h2 style="font-size:18px;margin:28px 0 4px;">Order attachments</h2>${blocks.join('')}`;
}

function buildAttachmentsText(rows: WorkRow[], context: OrderContext): string {
  const orders = dedupeOrders(rows);
  const blocks = [...orders.entries()]
    .map(([orderId, orderNumber]) => {
      const order = context.get(orderId);
      if (!order || !hasAttachments(order.attachments)) return '';

      const lines: string[] = [`${orderNumber} (${order.customer}):`];
      if (order.attachments.files.length) lines.push(`  Files: ${order.attachments.files.map((f) => f.name).join(', ')}`);
      if (order.attachments.customerDesign.length)
        lines.push(`  Customer design: ${order.attachments.customerDesign.map((f) => f.name).join(', ')}`);
      if (order.attachments.photos.length) lines.push(`  Photo: ${order.attachments.photos.map((f) => f.name).join(', ')}`);
      if (order.attachments.customerRemarks) lines.push(`  Customer remarks: ${order.attachments.customerRemarks}`);
      return lines.join('\n');
    })
    .filter(Boolean);

  if (blocks.length === 0) return '';

  return `\n\nOrder attachments:\n\n${blocks.join('\n\n')}`;
}

function renderFileLinks(files: Array<{ name: string; url: string }>) {
  return files.map((f) => `<a href="${escapeHtml(absoluteUrl(f.url))}">${escapeHtml(f.name)}</a>`).join('<br>');
}

function absoluteUrl(url: string) {
  const appUrl = (process.env.APP_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');
  return /^https?:\/\//.test(url) ? url : `${appUrl}${url}`;
}

const TH = 'border:1px solid #ddd;padding:6px 8px;background:#f5f5f5;text-align:left;font-size:11px;text-transform:uppercase;color:#555;';
const TD = 'border:1px solid #ddd;padding:6px 8px;vertical-align:top;';

function joinComments(comments: DecorationWorkComment[], key: 'sizes' | 'colors' | 'remarks' | 'location') {
  return comments
    .map((c) => c[key])
    .filter((v): v is string => Boolean(v))
    .map((v) => escapeHtml(v))
    .join('<br>');
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
