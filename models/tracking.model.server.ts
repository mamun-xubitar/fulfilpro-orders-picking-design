import prisma from '@/lib/prisma.server';
import { Prisma } from '@prisma/client';

export type TrackingRow = {
  id: string;
  orderId: string;
  storeId: string;
  storeName: string | null;
  orderNumber: string;
  customerName: string | null;
  trackingNumber: string;
  trackingUrl: string | null;
  carrier: number | null;
  registrationStatus: string;
  status: string | null;
  subStatus: string | null;
  lastEventAt: string | null;
  lastEventDesc: string | null;
  lastEventLocation: string | null;
  events: unknown[] | null;
  shippedAt: string | null;
  registeredAt: string | null;
  availableForPickupAt: string | null;
  deliveredAt: string | null;
  pendingAlertSentAt: string | null;
  pickupRemindersSent: number[];
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrackingSummary = {
  id: string;
  trackingNumber: string;
  registrationStatus: string;
  status: string | null;
};

export type UpsertTrackingData = {
  orderId: string;
  storeId: string;
  orderNumber: string;
  trackingNumber: string;
  carrier?: number | null;
  registrationStatus?: string;
  registeredAt?: Date | null;
  shippedAt?: Date | null;
};

export class TrackingModel {
  async list(params: {
    search?: string;
    storeIds?: string[] | null;
    page: number;
    pageSize: number;
    statuses?: string[];
    period?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ rows: TrackingRow[]; total: number; totalPages: number }> {
    const { search, storeIds, page, pageSize, statuses, period, dateFrom, dateTo } = params;
    const where: Prisma.ShipmentTrackingWhereInput = {};

    if (storeIds && storeIds.length > 0) {
      where.storeId = { in: storeIds };
    }

    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    } else if (period && period !== 'all') {
      const start = getPeriodStartDate(period as 'week' | 'month' | 'year');
      if (start) where.createdAt = { gte: start };
    }

    if (search?.trim()) {
      const token = search.trim();
      where.OR = [
        { trackingNumber: { contains: token, mode: 'insensitive' } },
        { orderNumber: { contains: token, mode: 'insensitive' } },
        { order: { cusName: { contains: token, mode: 'insensitive' } } },
        { order: { address: { contains: token, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.shipmentTracking.findMany({
        where,
        include: { store: { select: { name: true } }, order: { select: { fulfillmentItems: true, cusName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.shipmentTracking.count({ where }),
    ]);

    return {
      rows: rows.map((r) => toTrackingRow(r)),
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getByOrderId(orderId: string): Promise<TrackingRow[]> {
    const rows = await prisma.shipmentTracking.findMany({
      where: { orderId },
      include: { store: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toTrackingRow);
  }

  async getByTrackingNumber(trackingNumber: string): Promise<TrackingRow | null> {
    const row = await prisma.shipmentTracking.findFirst({
      where: { trackingNumber },
      include: { store: { select: { name: true } } },
    });
    return row ? toTrackingRow(row) : null;
  }

  async upsertFromOrder(data: UpsertTrackingData) {
    return prisma.shipmentTracking.upsert({
      where: { orderId_trackingNumber: { orderId: data.orderId, trackingNumber: data.trackingNumber } },
      update: {
        carrier: data.carrier,
        registrationStatus: data.registrationStatus ?? 'registered',
        registeredAt: data.registeredAt,
        shippedAt: data.shippedAt,
      },
      create: {
        orderId: data.orderId,
        storeId: data.storeId,
        orderNumber: data.orderNumber,
        trackingNumber: data.trackingNumber,
        carrier: data.carrier,
        registrationStatus: data.registrationStatus ?? 'registered',
        registeredAt: data.registeredAt,
        shippedAt: data.shippedAt,
      },
    });
  }

  async setRegistrationStatus(orderId: string, trackingNumber: string, status: string) {
    return prisma.shipmentTracking.update({
      where: { orderId_trackingNumber: { orderId, trackingNumber } },
      data: { registrationStatus: status },
    });
  }

  async applyTrackInfo(
    trackingNumber: string,
    data: {
      carrier?: number | null;
      status?: string | null;
      subStatus?: string | null;
      lastEventAt?: Date | null;
      lastEventDesc?: string | null;
      lastEventLocation?: string | null;
      events?: unknown;
      lastSyncedAt?: Date;
      availableForPickupAt?: Date | null;
      deliveredAt?: Date | null;
    },
  ) {
    const existing = await prisma.shipmentTracking.findFirst({ where: { trackingNumber } });
    if (!existing) return null;

    const updateData: Prisma.ShipmentTrackingUpdateInput = {
      ...(data.carrier !== undefined ? { carrier: data.carrier } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.subStatus !== undefined ? { subStatus: data.subStatus } : {}),
      ...(data.lastEventAt !== undefined ? { lastEventAt: data.lastEventAt } : {}),
      ...(data.lastEventDesc !== undefined ? { lastEventDesc: data.lastEventDesc } : {}),
      ...(data.lastEventLocation !== undefined ? { lastEventLocation: data.lastEventLocation } : {}),
      ...(data.events !== undefined ? { events: data.events as Prisma.InputJsonValue } : {}),
      ...(data.lastSyncedAt !== undefined ? { lastSyncedAt: data.lastSyncedAt } : {}),
    };

    if (data.status === 'AvailableForPickup' && !existing.availableForPickupAt) {
      updateData.availableForPickupAt = data.availableForPickupAt ?? data.lastEventAt ?? new Date();
    }
    if (data.status === 'Delivered' && !existing.deliveredAt) {
      updateData.deliveredAt = data.deliveredAt ?? new Date();
    }

    return prisma.shipmentTracking.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  async getSummariesByOrderIds(orderIds: string[]): Promise<Map<string, TrackingSummary[]>> {
    if (orderIds.length === 0) return new Map();
    const rows = await prisma.shipmentTracking.findMany({
      where: { orderId: { in: orderIds } },
      select: { id: true, orderId: true, trackingNumber: true, registrationStatus: true, status: true },
    });
    const map = new Map<string, TrackingSummary[]>();
    for (const row of rows) {
      const existing = map.get(row.orderId) ?? [];
      existing.push({ id: row.id, trackingNumber: row.trackingNumber, registrationStatus: row.registrationStatus, status: row.status });
      map.set(row.orderId, existing);
    }
    return map;
  }

  async findUnregisteredOrdersWithTracking(params: {
    dateFrom?: string;
    dateTo?: string;
    storeIds?: string[];
  }) {
    const where: Prisma.OrderWhereInput = {
      store: { is: { status: 'connected' } },
    };

    if (params.storeIds && params.storeIds.length > 0) {
      where.storeId = { in: params.storeIds };
    }

    if (params.dateFrom || params.dateTo) {
      where.orderedAt = {
        ...(params.dateFrom ? { gte: new Date(`${params.dateFrom}T00:00:00.000Z`) } : {}),
        ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    const orders = await prisma.order.findMany({
      where,
      select: { id: true, number: true, storeId: true, fulfillmentItems: true },
    });

    const ordersWithTracking = orders.filter((o) => {
      const nums = extractTrackingNumbersFromFulfillmentItems(o.fulfillmentItems);
      return nums.length > 0;
    });

    const orderIds = ordersWithTracking.map((o) => o.id);
    const existingTrackings = await prisma.shipmentTracking.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, trackingNumber: true },
    });

    const registeredSet = new Set(existingTrackings.map((t) => `${t.orderId}::${t.trackingNumber}`));

    return ordersWithTracking.filter((o) => {
      const nums = extractTrackingNumbersFromFulfillmentItems(o.fulfillmentItems);
      return nums.some((num) => !registeredSet.has(`${o.id}::${num}`));
    });
  }

  async countUnregistered(params: { dateFrom?: string; dateTo?: string; storeIds?: string[] }) {
    const unregistered = await this.findUnregisteredOrdersWithTracking(params);
    return unregistered.length;
  }

  async findRegisteredTrackingIdsSince(params: { days: number; storeIds?: string[] }): Promise<string[]> {
    const since = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);
    const where: Prisma.ShipmentTrackingWhereInput = {
      registrationStatus: 'registered',
      createdAt: { gte: since },
    };
    if (params.storeIds && params.storeIds.length > 0) where.storeId = { in: params.storeIds };
    const rows = await prisma.shipmentTracking.findMany({ where, select: { id: true } });
    return rows.map((r) => r.id);
  }

  async findPendingAlertCandidates(thresholdDate: Date) {
    return prisma.shipmentTracking.findMany({
      where: {
        registrationStatus: 'registered',
        pendingAlertSentAt: null,
        shippedAt: { lte: thresholdDate },
        status: { notIn: ['Delivered', 'AvailableForPickup', 'Exception', 'DeliveryFailure'] },
      },
      include: { order: { select: { cusEmail: true, number: true } } },
    });
  }

  async findPickupReminderCandidates() {
    return prisma.shipmentTracking.findMany({
      where: {
        registrationStatus: 'registered',
        status: 'AvailableForPickup',
        availableForPickupAt: { not: null },
      },
      include: { order: { select: { cusEmail: true, number: true } } },
    });
  }

  async stampPendingAlert(id: string) {
    return prisma.shipmentTracking.update({
      where: { id },
      data: { pendingAlertSentAt: new Date() },
    });
  }

  async appendPickupReminderSent(id: string, dayOffset: number) {
    const row = await prisma.shipmentTracking.findUnique({ where: { id }, select: { pickupRemindersSent: true } });
    if (!row) return;
    const current = Array.isArray(row.pickupRemindersSent) ? (row.pickupRemindersSent as number[]) : [];
    if (!current.includes(dayOffset)) {
      await prisma.shipmentTracking.update({
        where: { id },
        data: { pickupRemindersSent: [...current, dayOffset] },
      });
    }
  }
}

function toTrackingRow(row: {
  id: string;
  orderId: string;
  storeId: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: number | null;
  registrationStatus: string;
  status: string | null;
  subStatus: string | null;
  lastEventAt: Date | null;
  lastEventDesc: string | null;
  lastEventLocation: string | null;
  events: unknown;
  shippedAt: Date | null;
  registeredAt: Date | null;
  availableForPickupAt: Date | null;
  deliveredAt: Date | null;
  pendingAlertSentAt: Date | null;
  pickupRemindersSent: unknown;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  store?: { name: string | null };
  order?: { fulfillmentItems: unknown; cusName?: string | null } | null;
}): TrackingRow {
  const events = Array.isArray(row.events) ? (row.events as unknown[]) : null;
  const reminders = Array.isArray(row.pickupRemindersSent) ? (row.pickupRemindersSent as number[]) : [];

  return {
    id: row.id,
    orderId: row.orderId,
    storeId: row.storeId,
    storeName: row.store?.name ?? null,
    orderNumber: row.orderNumber,
    customerName: row.order?.cusName ?? null,
    trackingNumber: row.trackingNumber,
    trackingUrl: extractTrackingUrlForNumber(row.order?.fulfillmentItems, row.trackingNumber),
    carrier: row.carrier,
    registrationStatus: row.registrationStatus,
    status: row.status,
    subStatus: row.subStatus,
    lastEventAt: row.lastEventAt?.toISOString() ?? null,
    lastEventDesc: row.lastEventDesc,
    lastEventLocation: row.lastEventLocation,
    events,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    registeredAt: row.registeredAt?.toISOString() ?? null,
    availableForPickupAt: row.availableForPickupAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    pendingAlertSentAt: row.pendingAlertSentAt?.toISOString() ?? null,
    pickupRemindersSent: reminders,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getPeriodStartDate(period: 'week' | 'month' | 'year'): Date | null {
  const now = new Date();
  if (period === 'year') return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function extractTrackingUrlForNumber(fulfillmentItems: unknown, trackingNumber: string): string | null {
  if (!fulfillmentItems || typeof fulfillmentItems !== 'object') return null;
  const items = fulfillmentItems as Record<string, unknown>;
  const confirmations = Array.isArray(items.confirmations) ? items.confirmations : [];
  for (const conf of confirmations) {
    if (!conf || typeof conf !== 'object') continue;
    const c = conf as Record<string, unknown>;
    const trackingInfo = c.trackingInfo as Record<string, unknown> | null | undefined;
    if (!trackingInfo) continue;
    const num = typeof trackingInfo.number === 'string' ? trackingInfo.number.trim() : '';
    if (num === trackingNumber) {
      const url = typeof trackingInfo.url === 'string' ? trackingInfo.url.trim() : '';
      return url || null;
    }
  }
  return null;
}

function extractTrackingNumbersFromFulfillmentItems(fulfillmentItems: unknown): string[] {
  if (!fulfillmentItems || typeof fulfillmentItems !== 'object') return [];
  const items = fulfillmentItems as Record<string, unknown>;
  const confirmations = Array.isArray(items.confirmations) ? items.confirmations : [];
  const numbers: string[] = [];

  for (const conf of confirmations) {
    if (!conf || typeof conf !== 'object') continue;
    const c = conf as Record<string, unknown>;
    const trackingInfo = c.trackingInfo as Record<string, unknown> | null | undefined;
    if (!trackingInfo) continue;
    const num = typeof trackingInfo.number === 'string' ? trackingInfo.number.trim() : '';
    if (num) numbers.push(num);
  }

  return [...new Set(numbers)];
}
