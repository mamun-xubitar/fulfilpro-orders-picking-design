import prisma from '@/lib/prisma.server';
import { sendGoogleMail } from '@/lib/google-mail.server';
import { createNotification } from '@/lib/notifications.server';
import { refreshTrackingAndApply } from '@/lib/background-jobs.server';
import { normalizeUserIdList } from '@/lib/email-rules.server';

export async function runPendingShipmentCheck(now: Date) {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: { trackingPendingAlertDays: true, trackingPendingAlertUserIds: true },
  });

  const alertDays = settings?.trackingPendingAlertDays ?? 7;
  const recipientUserIds = normalizeUserIdList(settings?.trackingPendingAlertUserIds);
  if (recipientUserIds.length === 0) return;

  const thresholdDate = new Date(now.getTime() - alertDays * 24 * 60 * 60 * 1000);

  const candidates = await prisma.shipmentTracking.findMany({
    where: {
      registrationStatus: 'registered',
      pendingAlertSentAt: null,
      shippedAt: { lte: thresholdDate },
      status: { notIn: ['Delivered', 'AvailableForPickup', 'Exception', 'DeliveryFailure'] },
    },
    include: { order: { select: { cusEmail: true, number: true } } },
  });

  if (candidates.length === 0) return;

  const refreshed = await refreshTrackingAndApply(candidates.map((c) => c.id));

  const stillPending = candidates.filter((c) => {
    const updated = refreshed.find((r) => r.number === c.trackingNumber);
    const newStatus = updated?.track_info?.latest_status?.status?.toLowerCase();
    if (!newStatus) return true;
    // TODO: check more about status of 17track
    return !['Delivered', 'AvailableForPickup', 'Exception', 'DeliveryFailure'].map(a => a.toLowerCase()).includes(newStatus);
  });

  if (stillPending.length === 0) return;

  const recipients = await prisma.user.findMany({
    where: { id: { in: recipientUserIds }, active: true },
    select: { id: true, email: true },
  });

  if (recipients.length === 0) return;

  const trackingList = stillPending
    .map((t) => `  Order #${t.order.number} — Tracking: ${t.trackingNumber} (shipped ${t.shippedAt?.toDateString() ?? 'unknown'})`)
    .join('\n');

  const subject = `Pending shipment alert — ${stillPending.length} order(s) not yet in transit`;
  const html = buildPendingAlertEmail(stillPending.map((t) => ({
    orderNumber: t.order.number,
    trackingNumber: t.trackingNumber,
    shippedAt: t.shippedAt,
    status: t.status,
    alertDays,
  })));
  const text = `${stillPending.length} shipment(s) have been pending for more than ${alertDays} days:\n\n${trackingList}`;

  try {
    await sendGoogleMail({ to: recipients.map((r) => r.email), subject, html, text });
  } catch (error) {
    console.error('Failed to send pending shipment alert email', error);
  }

  for (const recipient of recipients) {
    for (const tracking of stillPending) {
      await createNotification({
        recipientId: recipient.id,
        type: 'pending_shipment_alert',
        title: 'Pending Shipment Alert',
        body: `Order #${tracking.order.number} tracking ${tracking.trackingNumber} has been pending for over ${alertDays} days.`,
        orderId: tracking.orderId,
        orderNumber: tracking.order.number,
      });
    }
  }

  for (const tracking of stillPending) {
    await prisma.shipmentTracking.update({
      where: { id: tracking.id },
      data: { pendingAlertSentAt: now },
    });
  }
}

export async function runPickupReminderCheck(now: Date) {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: { trackingPickupReminderDays: true },
  });

  const reminderDays = Array.isArray(settings?.trackingPickupReminderDays)
    ? (settings!.trackingPickupReminderDays as unknown[]).filter((d): d is number => typeof d === 'number')
    : [];

  if (reminderDays.length === 0) return;

  const candidates = await prisma.shipmentTracking.findMany({
    where: {
      registrationStatus: 'registered',
      status: 'AvailableForPickup',
      availableForPickupAt: { not: null },
    },
    include: { order: { select: { cusEmail: true, number: true } } },
  });

  if (candidates.length === 0) return;

  const refreshed = await refreshTrackingAndApply(candidates.map((c) => c.id));

  for (const tracking of candidates) {
    if (!tracking.availableForPickupAt || !tracking.order.cusEmail) continue;

    const updatedStatus = refreshed.find((r) => r.number === tracking.trackingNumber)
      ?.track_info?.latest_status?.status;

    if (updatedStatus && updatedStatus !== 'AvailableForPickup') continue;

    const sentOffsets = Array.isArray(tracking.pickupRemindersSent)
      ? (tracking.pickupRemindersSent as number[])
      : [];

    const pickupDate = new Date(tracking.availableForPickupAt);

    for (const offset of reminderDays) {
      if (sentOffsets.includes(offset)) continue;

      const sendAfter = new Date(pickupDate.getTime() + offset * 24 * 60 * 60 * 1000);
      if (now < sendAfter) continue;

      const subject = `Reminder: Your parcel is ready for pickup — Day ${offset}`;
      const html = buildPickupReminderEmail({
        orderNumber: tracking.order.number,
        trackingNumber: tracking.trackingNumber,
        availableSince: pickupDate,
        dayOffset: offset,
      });
      const text = `Your parcel for order #${tracking.order.number} (tracking: ${tracking.trackingNumber}) has been available for pickup since ${pickupDate.toDateString()}. Please collect it at your earliest convenience.`;

      try {
        await sendGoogleMail({ to: [tracking.order.cusEmail], subject, html, text });
        await prisma.shipmentTracking.update({
          where: { id: tracking.id },
          data: {
            pickupRemindersSent: [...sentOffsets, offset],
          },
        });
      } catch (error) {
        console.error(`Failed to send pickup reminder for tracking ${tracking.id}`, error);
      }
    }
  }
}

function buildPendingAlertEmail(items: Array<{
  orderNumber: string;
  trackingNumber: string;
  shippedAt: Date | null;
  status: string | null;
  alertDays: number;
}>) {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="${TD}">#${escapeHtml(item.orderNumber)}</td>
        <td style="${TD}">${escapeHtml(item.trackingNumber)}</td>
        <td style="${TD}">${item.shippedAt ? item.shippedAt.toDateString() : '—'}</td>
        <td style="${TD}">${escapeHtml(item.status ?? 'Unknown')}</td>
      </tr>`,
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#111;">
      <h2 style="font-size:18px;margin-bottom:4px;">Pending Shipment Alert</h2>
      <p style="color:#666;margin-top:0;">${items.length} shipment(s) have been pending for more than ${items[0]?.alertDays ?? 7} days without movement.</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr>
            ${['Order #', 'Tracking Number', 'Shipped Date', 'Status'].map((h) => `<th style="${TH}">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildPickupReminderEmail(params: {
  orderNumber: string;
  trackingNumber: string;
  availableSince: Date;
  dayOffset: number;
}) {
  return `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:600px;">
      <h2 style="font-size:18px;margin-bottom:4px;">Your parcel is ready for pickup</h2>
      <p style="color:#555;">This is a reminder that your parcel has been available for pickup for ${params.dayOffset} day(s).</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:12px;">
        <tbody>
          <tr><td style="${TD}font-weight:600;">Order</td><td style="${TD}">#${escapeHtml(params.orderNumber)}</td></tr>
          <tr><td style="${TD}font-weight:600;">Tracking Number</td><td style="${TD}">${escapeHtml(params.trackingNumber)}</td></tr>
          <tr><td style="${TD}font-weight:600;">Available Since</td><td style="${TD}">${params.availableSince.toDateString()}</td></tr>
        </tbody>
      </table>
      <p style="color:#555;margin-top:16px;">Please collect your parcel at your earliest convenience.</p>
    </div>`;
}

const TH = 'border:1px solid #ddd;padding:6px 8px;background:#f5f5f5;text-align:left;font-size:11px;text-transform:uppercase;color:#555;';
const TD = 'border:1px solid #ddd;padding:6px 8px;vertical-align:top;';

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
