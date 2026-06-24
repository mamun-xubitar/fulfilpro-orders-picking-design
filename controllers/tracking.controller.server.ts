import { TrackingModel } from '@/models/tracking.model.server';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';
import { registerTracking, stopTracking, retrack } from '@/lib/seventrack.server';
import { enqueueJob, refreshTrackingAndApply } from '@/lib/background-jobs.server';
import { resolveCarrierCode } from '@/lib/carrier-resolver.server';
import prisma from '@/lib/prisma.server';

const model = new TrackingModel();

export class TrackingController {
  async list(searchParams: URLSearchParams, session: { userId: string; role: string }) {
    const allowedStoreIds = await getUserAllowedStoreIds(session.userId, session.role);
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '50')));
    const search = searchParams.get('search') ?? undefined;
    const selectedStoreIds = searchParams.getAll('storeId');
    const statuses = searchParams.getAll('status');
    const period = searchParams.get('period') ?? undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;
    // console.log("all ids", selectedStoreIds)
    const effectiveStoreIds = selectedStoreIds;

    const [result, stores] = await Promise.all([
      model.list({
        search,
        storeIds: effectiveStoreIds,
        page,
        pageSize,
        statuses: statuses.length > 0 ? statuses : undefined,
        period,
        dateFrom,
        dateTo,
      }),
      prisma.store.findMany({
        where: allowedStoreIds !== null ? { id: { in: allowedStoreIds }, status: "connected" } : {status: "connected"},
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { data: { ...result, stores } };
  }

  async register(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, number: true, storeId: true, fulfillmentItems: true },
    });
    if (!order) return { error: { message: 'Order not found', status: 404 } };

    const trackingNumbers = extractTrackingNumbers(order.fulfillmentItems);
    if (trackingNumbers.length === 0) {
      return { error: { message: 'Order has no tracking number', status: 400 } };
    }

    const items = trackingNumbers.map(({ number, company }) => {
      const carrier = resolveCarrierCode(company);
      return { number, tag: orderId, auto_detection: true, ...(carrier !== undefined ? { carrier } : {}) };
    });
    try {
      const results = await registerTracking(items);
      const now = new Date();

      const accepted: Array<{ number: string; carrier?: number }> = [];
      const rejected: Array<{ number: string; message: string }> = [];
      // console.log("results", JSON.stringify(results, null, 2))
      for (const res of results) {
        for (const a of res.data?.accepted ?? []) accepted.push(a);
        for (const r of res.data?.rejected ?? []) {
          rejected.push({ number: r.number, message: r.error?.message ?? 'Rejected by 17track' });
        }
      }

      const registeredIds: string[] = [];
      for (const a of accepted) {
        const row = await model.upsertFromOrder({
          orderId: order.id,
          storeId: order.storeId,
          orderNumber: order.number,
          trackingNumber: a.number,
          carrier: a.carrier ?? null,
          registrationStatus: 'registered',
          registeredAt: now,
          shippedAt: now,
        });
        registeredIds.push(row.id);
      }

      try {
        if (registeredIds.length > 0) await refreshTrackingAndApply(registeredIds);
      } catch (error) {
        console.error('Failed to fetch track info after registration', error);
      }

      if (rejected.length > 0) {
        const reasons = rejected.map((r) => `${r.number}: ${r.message}`).join('; ');
        if (accepted.length === 0) {
          return { error: { message: `Tracking registration failed — ${reasons}`, status: 400 } };
        }
        return {
          error: {
            message: `Partially registered — ${accepted.length} succeeded, ${rejected.length} failed (${reasons})`,
            status: 400,
          },
        };
      }

      return { data: { registered: true }, message: 'Tracking registered' };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Registration failed', status: 500 } };
    }
  }

  async pause(orderId: string, trackingNumber: string) {
    const existing = await prisma.shipmentTracking.findUnique({
      where: { orderId_trackingNumber: { orderId, trackingNumber } },
    });
    if (!existing) return { error: { message: 'Tracking not found', status: 404 } };

    try {
      await stopTracking([{ number: trackingNumber }]);
      await model.setRegistrationStatus(orderId, trackingNumber, 'paused');
      return { data: { paused: true }, message: 'Tracking paused' };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Pause failed', status: 500 } };
    }
  }

  async restart(orderId: string, trackingNumber: string) {
    const existing = await prisma.shipmentTracking.findUnique({
      where: { orderId_trackingNumber: { orderId, trackingNumber } },
    });
    if (!existing) return { error: { message: 'Tracking not found', status: 404 } };

    try {
      await retrack([{ number: trackingNumber }]);
      await model.setRegistrationStatus(orderId, trackingNumber, 'registered');
      return { data: { restarted: true }, message: 'Tracking restarted' };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Restart failed', status: 500 } };
    }
  }

  async countUnregistered(params: { dateFrom?: string; dateTo?: string; storeIds?: string[] }) {
    const count = await model.countUnregistered(params);
    return { data: { count } };
  }

  async enqueueBulkRegister(params: { dateFrom?: string; dateTo?: string; storeIds?: string[] }) {
    await enqueueJob('bulk_register_tracking', {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      storeIds: params.storeIds ?? [],
    });
    return { data: { enqueued: true }, message: 'Bulk registration queued' };
  }
}

function extractTrackingNumbers(fulfillmentItems: unknown): Array<{ number: string; company: string }> {
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
