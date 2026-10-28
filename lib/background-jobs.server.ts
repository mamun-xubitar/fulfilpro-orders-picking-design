import prisma from '@/lib/prisma.server';
import { Prisma } from '@prisma/client';
import { registerTracking, getTrackInfo, type TrackInfoResult } from '@/lib/seventrack.server';
import { TrackingModel } from '@/models/tracking.model.server';
import { resolveCarrierCode } from '@/lib/carrier-resolver.server';
import { OrderModel } from '@/models/order.model.server';
import { linkOrderLineItems, refreshProductSales } from '@/lib/product-order-link.server';
import { syncAllStoreCustomers } from '@/lib/shopify-customer-sync.server';

const trackingModel = new TrackingModel();

export const SYNC_CUSTOMERS_JOB = 'sync_shopify_customers';
const CUSTOMER_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Queues a Shopify customer sync unless one is already waiting or running. Returns whether it queued. */
export async function enqueueCustomerSync(storeId?: string) {
  const pending = await prisma.backgroundJob.findFirst({
    where: { type: SYNC_CUSTOMERS_JOB, status: { in: ['queued', 'running'] } },
    select: { id: true },
  });
  if (pending) return false;
  await enqueueJob(SYNC_CUSTOMERS_JOB, storeId ? { storeId } : undefined);
  return true;
}

/** Called by the worker on every tick: queues the daily sync once the last one that did not fail
 * is over a day old, so a failed sync is retried on the next tick. */
export async function enqueueCustomerSyncIfDue(now = new Date()) {
  const recent = await prisma.backgroundJob.findFirst({
    where: {
      type: SYNC_CUSTOMERS_JOB,
      status: { not: 'failed' },
      createdAt: { gt: new Date(now.getTime() - CUSTOMER_SYNC_INTERVAL_MS) },
    },
    select: { id: true },
  });
  if (!recent) await enqueueCustomerSync();
}

export async function enqueueJob(
  type: string,
  payload?: Record<string, unknown>,
  runAfter?: Date,
) {
  return prisma.backgroundJob.create({
    data: { type, payload: payload as Prisma.InputJsonValue | undefined, runAfter },
  });
}

export async function acquireNextJob() {
  const queued = await prisma.backgroundJob.findFirst({
    where: {
      status: 'queued',
      OR: [{ runAfter: null }, { runAfter: { lte: new Date() } }],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!queued) return null;

  const result = await prisma.backgroundJob.updateMany({
    where: { id: queued.id, status: 'queued' },
    data: { status: 'running', startedAt: new Date(), attempts: { increment: 1 } },
  });

  if (result.count === 0) return null;
  return prisma.backgroundJob.findUnique({ where: { id: queued.id } });
}

export async function markJobFailed(jobId: string, error: string) {
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: { status: 'failed', error, finishedAt: new Date() },
  });
}

async function markJobCompleted(jobId: string) {
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: { status: 'completed', finishedAt: new Date() },
  });
}

export async function runJob(jobId: string) {
  const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Background job ${jobId} not found`);
  if (job.status !== 'running') throw new Error(`Background job ${jobId} is not running`);

  const payload = (job.payload ?? {}) as Record<string, unknown>;

  try {
    if (job.type === 'register_tracking') {
      await runRegisterTracking(payload);
    } else if (job.type === 'bulk_register_tracking') {
      await runBulkRegisterTracking(payload);
    } else if (job.type === 'sync_tracking_status') {
      await runSyncTrackingStatus(payload);
    } else if (job.type === 'rescan_decorations') {
      await runRescanDecorations(jobId);
    } else if (job.type === 'backfill_order_line_items') {
      await runBackfillOrderLineItems(jobId);
    } else if (job.type === SYNC_CUSTOMERS_JOB) {
      await syncAllStoreCustomers(typeof payload.storeId === 'string' ? payload.storeId : undefined);
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }
    await markJobCompleted(jobId);
  } catch (error) {
    await markJobFailed(jobId, error instanceof Error ? error.message : String(error));
  }
}

async function runRegisterTracking(payload: Record<string, unknown>) {
  const orderId = typeof payload.orderId === 'string' ? payload.orderId : null;
  if (!orderId) throw new Error('register_tracking job missing orderId');

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, number: true, storeId: true, fulfillmentItems: true, cusEmail: true },
  });
  if (!order) throw new Error(`Order ${orderId} not found`);

  const trackingNumbers = extractTrackingNumbers(order.fulfillmentItems);
  if (trackingNumbers.length === 0) return;

  const items = trackingNumbers.map(({ number, company }) => {
    const carrier = resolveCarrierCode(company);
    return { number, tag: orderId, auto_detection: true, ...(carrier !== undefined ? { carrier } : {}) };
  });
  const results = await registerTracking(items);

  const now = new Date();
  const registeredIds: string[] = [];
  for (const res of results) {
    for (const accepted of res.data?.accepted ?? []) {
      const row = await trackingModel.upsertFromOrder({
        orderId: order.id,
        storeId: order.storeId,
        orderNumber: String(order.number),
        trackingNumber: accepted.number,
        carrier: accepted.carrier ?? null,
        registrationStatus: 'registered',
        registeredAt: now,
        shippedAt: now,
      });
      registeredIds.push(row.id);
    }
  }

  try {
    if (registeredIds.length > 0) await refreshTrackingAndApply(registeredIds);
  } catch (error) {
    console.error('register_tracking: failed to fetch track info', error);
  }
}

async function runBulkRegisterTracking(payload: Record<string, unknown>) {
  const dateFrom = typeof payload.dateFrom === 'string' ? payload.dateFrom : undefined;
  const dateTo = typeof payload.dateTo === 'string' ? payload.dateTo : undefined;
  const storeIds = Array.isArray(payload.storeIds)
    ? (payload.storeIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];

  const orders = await trackingModel.findUnregisteredOrdersWithTracking({ dateFrom, dateTo, storeIds });

  for (const order of orders) {
    const trackingNumbers = extractTrackingNumbers(order.fulfillmentItems);
    if (trackingNumbers.length === 0) continue;

    try {
      const items = trackingNumbers.map(({ number, company }) => {
        const carrier = resolveCarrierCode(company);
        return { number, tag: order.id, auto_detection: true, ...(carrier !== undefined ? { carrier } : {}) };
      });
      const results = await registerTracking(items);
      const now = new Date();

      const registeredIds: string[] = [];
      for (const res of results) {
        for (const accepted of res.data?.accepted ?? []) {
          const row = await trackingModel.upsertFromOrder({
            orderId: order.id,
            storeId: order.storeId,
            orderNumber: String(order.number),
            trackingNumber: accepted.number,
            carrier: accepted.carrier ?? null,
            registrationStatus: 'registered',
            registeredAt: now,
            shippedAt: now,
          });
          registeredIds.push(row.id);
        }
      }

      try {
        if (registeredIds.length > 0) await refreshTrackingAndApply(registeredIds);
      } catch (error) {
        console.error(`bulk_register_tracking: failed to fetch track info for order ${order.id}`, error);
      }
    } catch (error) {
      console.error(`bulk_register_tracking: failed for order ${order.id}`, error);
    }
  }
}

async function runRescanDecorations(jobId: string) {
  const model = new OrderModel();
  await model.reclassifyDecorations(async (p) => {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { progress: p as Prisma.InputJsonValue },
    });
  });
}

const BACKFILL_BATCH_SIZE = 200;
const BACKFILL_REFRESH_THRESHOLD = 500;

async function runBackfillOrderLineItems(jobId: string) {
  const total = await prisma.order.count();
  let cursor: string | undefined;
  let processed = 0;
  let affectedProductIds = new Set<string>();

  while (true) {
    const orders = await prisma.order.findMany({
      take: BACKFILL_BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    if (orders.length === 0) break;

    for (const order of orders) {
      const affected = await linkOrderLineItems(order.id, { skipRefresh: true });
      affected.forEach((id) => affectedProductIds.add(id));
      processed += 1;
    }

    cursor = orders[orders.length - 1].id;

    if (affectedProductIds.size >= BACKFILL_REFRESH_THRESHOLD) {
      await refreshProductSales([...affectedProductIds]);
      affectedProductIds = new Set();
    }

    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { progress: { processed, total } as Prisma.InputJsonValue },
    });

    if (orders.length < BACKFILL_BATCH_SIZE) break;
  }

  if (affectedProductIds.size > 0) {
    await refreshProductSales([...affectedProductIds]);
  }
}

async function runSyncTrackingStatus(payload: Record<string, unknown>) {
  const days = typeof payload.days === 'number' ? payload.days : null;
  if (!days || ![7, 15, 30, 90].includes(days)) throw new Error('sync_tracking_status job missing or invalid days');

  const storeIds = Array.isArray(payload.storeIds)
    ? (payload.storeIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];

  const ids = await trackingModel.findRegisteredTrackingIdsSince({ days, storeIds: storeIds.length > 0 ? storeIds : undefined });

  if (ids.length === 0) return;
  await refreshTrackingAndApply(ids);
}

export function applyTrackInfoToRow(result: TrackInfoResult) {
  const trackInfo = result.track_info;
  const latestStatus = trackInfo?.latest_status;
  const latestEvent = trackInfo?.latest_event;
  const providers = trackInfo?.tracking?.providers ?? [];
  const events = providers.flatMap((p) => p.events ?? []);

  return {
    carrier: result.carrier ?? null,
    status: latestStatus?.status ?? null,
    subStatus: latestStatus?.sub_status ?? null,
    lastEventAt: latestEvent?.time_utc ? new Date(latestEvent.time_utc) : null,
    lastEventDesc: latestEvent?.description ?? null,
    lastEventLocation: latestEvent?.location ?? null,
    events: events.length > 0 ? (events as Prisma.InputJsonValue) : Prisma.DbNull,
    lastSyncedAt: new Date(),
  };
}

export function extractTrackingNumbers(fulfillmentItems: unknown): Array<{ number: string; company: string }> {
  if (!fulfillmentItems || typeof fulfillmentItems !== 'object') return [];
  const items = fulfillmentItems as Record<string, unknown>;
  const confirmations = Array.isArray(items.confirmations) ? items.confirmations : [];
  const seen = new Set<string>();
  const results: Array<{ number: string; company: string }> = [];

  for (const conf of confirmations) {
    if (!conf || typeof conf !== 'object') continue;
    const c = conf as Record<string, unknown>;
    const trackingInfo = c.trackingInfo as Record<string, unknown> | null | undefined;
    if (!trackingInfo) continue;
    const num = typeof trackingInfo.number === 'string' ? trackingInfo.number.trim() : '';
    if (!num || seen.has(num)) continue;
    seen.add(num);
    const company = typeof trackingInfo.company === 'string' ? trackingInfo.company.trim() : '';
    results.push({ number: num, company });
  }

  return results;
}

export async function refreshTrackingAndApply(trackingIds: string[]): Promise<TrackInfoResult[]> {
  if (trackingIds.length === 0) return [];

  const rows = await prisma.shipmentTracking.findMany({
    where: { id: { in: trackingIds } },
    select: { id: true, trackingNumber: true, carrier: true },
  });

  if (rows.length === 0) return [];

  const items = rows.map((r) => ({ number: r.trackingNumber, ...(r.carrier ? { carrier: r.carrier } : {}) }));
  const responses = await getTrackInfo(items);

  // console.log("My trackings", JSON.stringify(responses, null, 2))

  const accepted: TrackInfoResult[] = responses.flatMap((r) => r.data?.accepted ?? []);

  for (const result of accepted) {
    const row = rows.find((r) => r.trackingNumber === result.number);
    if (!row) continue;

    const patch = applyTrackInfoToRow(result);
    const latestStatus = result.track_info?.latest_status?.status;

    console.log("my patch", JSON.stringify(patch, null, 2))

    await prisma.shipmentTracking.update({
      where: { id: row.id },
      data: {
        ...patch,
        ...(latestStatus === 'AvailableForPickup'
          ? { availableForPickupAt: patch.lastEventAt ?? new Date() }
          : {}),
        ...(latestStatus === 'Delivered' ? { deliveredAt: new Date() } : {}),
      },
    });
  }

  return accepted;
}
