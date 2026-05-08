import prisma from '@/lib/prisma.server';
import {
  createShopifyFulfillment,
  updateShopifyFulfillmentTracking,
  cancelShopifyFulfillment,
  type FulfillmentRequestLine,
  type FulfillmentTrackingInput,
} from '@/lib/shopify-fulfillment.server';
import { fetchShopifyOrderById } from '@/lib/shopify-order-fetch.server';
import { sendGoogleMail } from '@/lib/google-mail.server';
import { Prisma } from '@prisma/client';

export type ShopifyOrderPayload = {
  id?: string | number;
  name?: string;
  order_number: string | number;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  total_price?: string | number | null;
  current_total_price?: string | number | null;
  fulfillment_status?: string | null;
  created_at: string;
  closed_at?: string | null;
  cancelled_at?: string | null;
  canceled_at?: string | null;
  total_price_set?: {
    shop_money?: {
      amount?: string | number | null;
      currency_code?: string | null;
    };
  };
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  shipping_address?: {
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    country?: string | null;
    phone?: string | null;
    name?: string | null;
  } | null;
  line_items?: Array<{
    id: string | number;
    product_id?: string | number | null;
    name?: string | null;
    sku?: string | null;
    vendor?: string | null;
    quantity?: number | null;
    fulfillable_quantity?: number | null;
    price?: string | number | null;
    price_set?: {
      shop_money?: {
        amount?: string | number | null;
        currency_code?: string | null;
      };
    };
  }> | null;
  fulfillments?: Array<{
    id?: string | number;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    tracking_number?: string | null;
    tracking_company?: string | null;
    tracking_url?: string | null;
    line_items?: Array<{
      id?: string | number | null;
      quantity?: number | null;
    }> | null;
  }> | null;
};

export type FulfillmentLineInput = {
  lineItemId: string;
  quantity: number;
  full: boolean;
};

export class OrderModel {
  async createIfMissingFromOrderCreateWebhook(params: {
    payload: ShopifyOrderPayload;
    storeId: string;
    storeDomain: string;
  }) {
    const { payload, storeId } = params;
    // console.log('Processing order webhook', JSON.stringify(payload, null, 2));
    const exists = await prisma.order.findUnique({
      where: { storeId_number: {number: payload.order_number.toString(), storeId} },
      select: { id: true },
    });

    if (exists) {
      return { created: false };
    }

    await prisma.order.create({
      data: buildOrderCreateData(payload, storeId),
    });

    return { created: true };
  }

  async upsertFromShopifyOrder(params: {
    payload: ShopifyOrderPayload;
    storeId: string;
  }) {
    const { payload, storeId } = params;
    const number = `${payload.order_number}`;
    const existing = await prisma.order.findUnique({
      where: {
        storeId_number: {
          storeId,
          number
        }
      },
      select: {
        id: true,
        fulfillmentItems: true,
      },
    });

    console.log("exisint", !!existing, storeId)
    if (!existing) {
      await prisma.order.create({
        data: buildOrderCreateData(payload, storeId),
      });
      return { created: true, updated: false };
    }
    await prisma.order.update({
      where: { id: existing.id },
      data: buildOrderUpdateData(payload, storeId, existing.fulfillmentItems),
    });

    return { created: false, updated: true };
  }

  async listForConnectedStores(params: {
    search?: string;
    storeIds?: string[];
    period?: 'all' | 'week' | 'month' | 'year';
    dateFrom?: string;
    dateTo?: string;
    fulfillmentStatuses?: string[];
    viewerId?: string;
    page: number;
    pageSize: number;
  }) {
    const { search, storeIds = [], period = 'all', dateFrom, dateTo, fulfillmentStatuses = [], page, pageSize } = params;
    const where: Prisma.OrderWhereInput = {
      store: {
        is: {
          status: 'connected',
          ...(storeIds.length > 0 ? { id: { in: storeIds } } : {}),
        },
      },
    };

    const tokens = (search?.trim() ?? '').split(/\s+/).filter(Boolean);
    const andConditions: Prisma.OrderWhereInput[] = [];

    if (tokens.length > 0) {
      const tokenLineItemIds = await Promise.all(
        tokens.map(async (token) => {
          const raw = await prisma.$queryRaw<{ id: string }[]>(
            Prisma.sql`SELECT id FROM "Order" WHERE "lineItems"::text ILIKE ${`%${token}%`}`
          );
          return raw.map((r) => r.id);
        })
      );

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const lineItemIds = tokenLineItemIds[i];
        andConditions.push({
          OR: [
            { number: { contains: token, mode: 'insensitive' } },
            { cusName: { contains: token, mode: 'insensitive' } },
            { cusEmail: { contains: token, mode: 'insensitive' } },
            { boarcode: { contains: token, mode: 'insensitive' } },
            { address: { contains: token, mode: 'insensitive' } },
            { address2: { contains: token, mode: 'insensitive' } },
            { city: { contains: token, mode: 'insensitive' } },
            { state: { contains: token, mode: 'insensitive' } },
            { country: { contains: token, mode: 'insensitive' } },
            { store: { is: { name: { contains: token, mode: 'insensitive' } } } },
            { store: { is: { storeDomain: { contains: token, mode: 'insensitive' } } } },
            ...(lineItemIds.length > 0 ? [{ id: { in: lineItemIds } }] : []),
            ...getStatusConditionsForToken(token),
          ],
        });
      }
    }

    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : undefined;
      const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : undefined;
      where.orderedAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    } else {
      const periodDate = getPeriodStartDate(period);
      if (periodDate) {
        where.orderedAt = { gte: periodDate };
      }
    }

    if (fulfillmentStatuses.length > 0) {
      const statusConditions = buildFulfillmentStatusConditions(fulfillmentStatuses);
      if (statusConditions.length > 0) {
        andConditions.push({ OR: statusConditions });
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              storeDomain: true,
            },
          },
          _count: {
            select: {
              messages: true,
              notes: true,
              backInStockRequests: true,
            },
          },
          backInStockRequests: {
            select: {
              status: true,
              requesterId: true,
              requesterViewedAt: true,
              messages: {
                select: {
                  senderRole: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: { orderedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const orders = rows.map(toOrderRow);

    return { total, orders };
  }

  async getConnectedStoreOptions() {
    const stores = await prisma.store.findMany({
      where: { status: 'connected' },
      select: {
        id: true,
        name: true,
        storeDomain: true,
      },
      orderBy: [{ name: 'asc' }, { storeDomain: 'asc' }],
    });

    return stores.map((store) => ({
      id: store.id,
      name: store.name ?? store.storeDomain,
      storeDomain: store.storeDomain,
    }));
  }

  async refreshFromShopify(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            id: true,
            storeDomain: true,
            accessToken: true,
          },
        },
        backInStockRequests: {
          select: {
            status: true,
            requesterId: true,
            requesterViewedAt: true,
            messages: {
              select: {
                senderRole: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.store.accessToken) {
      throw new Error('Store is missing a Shopify access token');
    }

    const shopifyOrderId = toFulfillmentItems(order.fulfillmentItems).shopifyOrderId;
    if (!shopifyOrderId) {
      throw new Error('Order is missing a Shopify order id');
    }

    const payload = await fetchShopifyOrderById({
      shop: order.store.storeDomain,
      accessToken: order.store.accessToken,
      orderId: shopifyOrderId,
    });

    await this.upsertFromShopifyOrder({
      payload,
      storeId: order.store.id,
    });

    return this.getOrderRow(orderId);
  }

  async getOrderRow(orderId: string) {
    const row = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            storeDomain: true,
          },
        },
        _count: {
          select: {
            messages: true,
            notes: true,
            backInStockRequests: true,
          },
        },
        backInStockRequests: {
          select: {
            status: true,
            requesterId: true,
            requesterViewedAt: true,
            messages: {
              select: {
                senderRole: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      throw new Error('Order not found');
    }

    return toOrderRow(row);
  }

  async confirmFulfillment(
    orderId: string,
    lines: FulfillmentLineInput[],
    notifyCustomer: boolean,
    trackingInfo: FulfillmentTrackingInput | null,
    barcodes: string[] = [],
    fulfillmentDate: string | null = null
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            storeDomain: true,
            accessToken: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.store.accessToken) {
      throw new Error('Store is missing a Shopify access token');
    }

    if (order.canceled) {
      throw new Error('Canceled orders cannot be fulfilled');
    }

    if (order.closed) {
      throw new Error('Closed orders cannot be fulfilled');
    }

    const lineItems = toLineItems(order.lineItems);
    const fulfillableLines = normalizeFulfillmentLines(lines, lineItems);
    const fulfillmentBarcodes = normalizeBarcodes(barcodes);
    const currentFulfillmentItems = toFulfillmentItems(order.fulfillmentItems);
    const shopifyResult = await createShopifyFulfillment({
      shop: order.store.storeDomain,
      accessToken: order.store.accessToken,
      orderNumber: order.number,
      shopifyOrderId: currentFulfillmentItems.shopifyOrderId,
      notifyCustomer,
      trackingInfo,
      lines: fulfillableLines.map((line) => ({
        lineItemId: line.lineItemId,
        quantity: line.quantity,
      })),
    });

    const fulfillment = shopifyResult.fulfillments[0];
    const fulfillmentDate2 = (new Date(fulfillment?.estimatedDeliveryAt || fulfillment?.deliveredAt || new Date().toISOString()).toISOString()).split("T")[0];
    const confirmation = {
      id: crypto.randomUUID(),
      confirmedAt: new Date().toISOString(),
      shopifyFulfillmentId: shopifyResult.fulfillmentId,
      shopifyFulfillmentStatus: shopifyResult.fulfillmentStatus,
      notifyCustomer,
      barcodes: fulfillmentBarcodes,
      fulfillmentDate: fulfillmentDate2,
      trackingInfo: fulfillment?.trackingInfo?.[0] || trackingInfo,
      lines: fulfillableLines,
    };

    const nextFulfillmentItems = {
      shopifyOrderId: currentFulfillmentItems.shopifyOrderId ?? shopifyResult.orderId,
      confirmations: [...currentFulfillmentItems.confirmations, confirmation],
    };

    const totalQuantity = lineItems.reduce((sum, item) => sum + Math.max(0, item.qty), 0);
    const fulfilledQuantity = nextFulfillmentItems.confirmations.reduce((sum, item) => {
      return sum + item.lines.reduce((lineSum, line) => lineSum + line.quantity, 0);
    }, 0);
    const fulfillmentStatus = fulfilledQuantity >= totalQuantity ? 'fulfilled' : fulfilledQuantity > 0 ? 'partial' : 'unfulfilled';

    await prisma.order.update({
      where: { id: order.id },
      data: {
        fulfillmentItems: nextFulfillmentItems,
        fulfillmentStatus,
      },
    });

    return {
      orderId: order.id,
      status: fulfillmentStatus,
      fulfillmentItems: nextFulfillmentItems,
    };
  }

  async editFulfillmentConfirmation(
    orderId: string,
    fulfillmentId: string,
    editData: {
      barcodes?: string[];
      fulfillmentDate?: string | null;
      trackingInfo?: FulfillmentTrackingInput | null;
    }
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { storeDomain: true, accessToken: true } } },
    });

    if (!order) throw new Error('Order not found');

    const currentFulfillmentItems = toFulfillmentItems(order.fulfillmentItems);
    const confIndex = currentFulfillmentItems.confirmations.findIndex((c) => {
      const conf = c as Record<string, unknown>;
      return conf.id === fulfillmentId;
    });

    if (confIndex === -1) throw new Error('Fulfillment confirmation not found');

    const existing = currentFulfillmentItems.confirmations[confIndex] as Record<string, unknown>;
    const shopifyFulfillmentId = typeof existing.shopifyFulfillmentId === 'string' ? existing.shopifyFulfillmentId : null;

    if (shopifyFulfillmentId && editData.trackingInfo && order.store.accessToken) {
      const hasNewTracking = editData.trackingInfo.number || editData.trackingInfo.url || editData.trackingInfo.company;
      if (hasNewTracking) {
        await updateShopifyFulfillmentTracking({
          shop: order.store.storeDomain,
          accessToken: order.store.accessToken,
          shopifyFulfillmentId,
          trackingInfo: editData.trackingInfo,
          notifyCustomer: false,
        });
      }
    }

    const updatedConf = {
      ...existing,
      ...(editData.barcodes !== undefined ? { barcodes: normalizeBarcodes(editData.barcodes) } : {}),
      ...(editData.fulfillmentDate !== undefined ? { fulfillmentDate: editData.fulfillmentDate } : {}),
      ...(editData.trackingInfo !== undefined ? { trackingInfo: editData.trackingInfo } : {}),
    };

    const updatedConfirmations = [...currentFulfillmentItems.confirmations];
    updatedConfirmations[confIndex] = updatedConf as typeof updatedConfirmations[number];

    const nextFulfillmentItems = {
      shopifyOrderId: currentFulfillmentItems.shopifyOrderId,
      confirmations: updatedConfirmations,
    };

    await prisma.order.update({
      where: { id: order.id },
      data: { fulfillmentItems: nextFulfillmentItems as Prisma.InputJsonValue },
    });

    return { orderId: order.id, fulfillmentItems: nextFulfillmentItems };
  }

  async cancelFulfillmentConfirmation(orderId: string, fulfillmentId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { storeDomain: true, accessToken: true } } },
    });

    if (!order) throw new Error('Order not found');

    const currentFulfillmentItems = toFulfillmentItems(order.fulfillmentItems);
    const conf = currentFulfillmentItems.confirmations.find((c) => {
      return (c as Record<string, unknown>).id === fulfillmentId;
    }) as Record<string, unknown> | undefined;

    if (!conf) throw new Error('Fulfillment confirmation not found');

    const shopifyFulfillmentId = typeof conf.shopifyFulfillmentId === 'string' ? conf.shopifyFulfillmentId : null;

    if (shopifyFulfillmentId && order.store.accessToken) {
      await cancelShopifyFulfillment({
        shop: order.store.storeDomain,
        accessToken: order.store.accessToken,
        shopifyFulfillmentId,
      });
    }

    const remainingConfirmations = currentFulfillmentItems.confirmations.filter((c) => {
      return (c as Record<string, unknown>).id !== fulfillmentId;
    });

    const lineItems = toLineItems(order.lineItems);
    const totalQuantity = lineItems.reduce((sum, item) => sum + Math.max(0, item.qty), 0);
    const fulfilledQuantity = remainingConfirmations.reduce((sum, c) => {
      return sum + (c as { lines: FulfillmentRequestLine[] }).lines.reduce((ls, l) => ls + l.quantity, 0);
    }, 0);
    const fulfillmentStatus = fulfilledQuantity >= totalQuantity ? 'fulfilled' : fulfilledQuantity > 0 ? 'partial' : 'unfulfilled';

    const nextFulfillmentItems = {
      shopifyOrderId: currentFulfillmentItems.shopifyOrderId,
      confirmations: remainingConfirmations,
    };

    await prisma.order.update({
      where: { id: order.id },
      data: {
        fulfillmentItems: nextFulfillmentItems as Prisma.InputJsonValue,
        fulfillmentStatus,
      },
    });

    return { orderId: order.id, status: fulfillmentStatus, fulfillmentItems: nextFulfillmentItems };
  }

  async getPackingSlipLabel(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            name: true,
            storeDomain: true,
            url: true,
            logoPath: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return {
      id: order.id,
      number: order.number,
      customer: order.cusName,
      address: order.address,
      address2: order.address2,
      city: order.city,
      state: order.state,
      zip: order.zip,
      country: order.country,
      phone: order.phone,
      note: order.note,
      storeName: order.store.name ?? order.store.storeDomain,
      storeDomain: order.store.storeDomain,
      storeUrl: order.store.url,
      storeLogoPath: order.store.logoPath,
    };
  }

  async saveBarcodes(orderId: string, barcodes: string[]) {
    const uniqueBarcodes = normalizeBarcodes(barcodes);
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        boarcode: uniqueBarcodes.join(' '),
      },
      select: {
        id: true,
        boarcode: true,
      },
    });

    return {
      orderId: order.id,
      barcodes: parseBarcodeList(order.boarcode),
    };
  }

  async getOrderMessageCenter(orderId: string) {
    const [order, admins, messages] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true },
      }),
      prisma.user.findMany({
        where: {
          role: 'admin',
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
      }),
      prisma.orderMessage.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!order) {
      throw new Error('Order not found');
    }

    return {
      admins,
      messages: messages.map(toOrderMessageRow),
    };
  }

  async sendAdminOrderMessage(params: {
    orderId: string;
    adminId: string;
    message: string;
    sender?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
    } | null;
  }) {
    const [order, admin] = await Promise.all([
      prisma.order.findUnique({
        where: { id: params.orderId },
        include: {
          store: {
            select: {
              name: true,
              storeDomain: true,
            },
          },
        },
      }),
      prisma.user.findFirst({
        where: {
          id: params.adminId,
          role: 'admin',
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
    ]);

    if (!order) {
      throw new Error('Order not found');
    }

    if (!admin) {
      throw new Error('Selected admin was not found');
    }

    const senderName = params.sender?.name?.trim() || null;
    const senderEmail = params.sender?.email?.trim() || null;
    await sendGoogleMail({
      to: [admin.email],
      subject: `Order ${order.number} message`,
      text: buildOrderMessageEmailText({ order, message: params.message, senderName, senderEmail }),
      html: buildOrderMessageEmailHtml({ order, message: params.message, senderName, senderEmail }),
    });

    const savedMessage = await prisma.orderMessage.create({
      data: {
        orderId: order.id,
        adminId: admin.id,
        adminName: admin.name,
        adminEmail: admin.email,
        senderId: params.sender?.id ?? null,
        senderName,
        senderEmail,
        message: params.message,
      },
    });

    return toOrderMessageRow(savedMessage);
  }

  async listOrderNotes(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const notes = await prisma.orderNote.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return notes.map(toOrderNoteRow);
  }

  async createOrderNote(params: {
    orderId: string;
    note: string;
    user?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
    } | null;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const savedNote = await prisma.orderNote.create({
      data: {
        orderId: order.id,
        note: params.note,
        authorId: params.user?.id ?? null,
        authorName: params.user?.name?.trim() || null,
        authorEmail: params.user?.email?.trim() || null,
      },
    });

    return toOrderNoteRow(savedNote);
  }

  async updateOrderNote(params: {
    orderId: string;
    noteId: string;
    note: string;
    user?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
    } | null;
  }) {
    const existing = await prisma.orderNote.findFirst({
      where: {
        id: params.noteId,
        orderId: params.orderId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new Error('Note not found');
    }

    const savedNote = await prisma.orderNote.update({
      where: { id: existing.id },
      data: {
        note: params.note,
        editorId: params.user?.id ?? null,
        editorName: params.user?.name?.trim() || null,
        editorEmail: params.user?.email?.trim() || null,
      },
    });

    return toOrderNoteRow(savedNote);
  }

  async deleteOrderNote(orderId: string, noteId: string) {
    const existing = await prisma.orderNote.findFirst({
      where: {
        id: noteId,
        orderId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new Error('Note not found');
    }

    await prisma.orderNote.delete({
      where: { id: existing.id },
    });

    return { id: existing.id };
  }
}

function toOrderNoteRow(note: {
  id: string;
  note: string;
  authorName: string | null;
  authorEmail: string | null;
  editorName: string | null;
  editorEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: note.id,
    note: note.note,
    authorName: note.authorName,
    authorEmail: note.authorEmail,
    editorName: note.editorName,
    editorEmail: note.editorEmail,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function toOrderRow(row: {
  id: string;
  number: string;
  cusName: string;
  note: string | null;
  boarcode: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  closed: boolean;
  closedAt: Date | null;
  canceled: boolean;
  canceledAt: Date | null;
  orderedAt: Date | null;
  lineItems: Prisma.JsonValue;
  fulfillmentItems: Prisma.JsonValue | null;
  fulfillmentStatus: string | null;
  store: {
    id: string;
    name: string | null;
    storeDomain: string;
  };
  _count: {
    messages: number;
    notes: number;
    backInStockRequests: number;
  };
  backInStockRequests?: Array<{
    status: string;
    requesterId: string;
    requesterViewedAt: Date | null;
    messages: Array<{ senderRole: string; createdAt: Date }>;
  }>;
}) {
  const lineItems = toLineItems(row.lineItems);
  const itemCount = lineItems.reduce((sum, item) => sum + Math.max(0, item.qty), 0);

  return {
    id: row.id,
    number: row.number,
    customer: row.cusName,
    note: row.note,
    barcodes: parseBarcodeList(row.boarcode),
    address: row.address,
    address2: row.address2,
    city: row.city,
    state: row.state,
    country: row.country,
    closed: row.closed,
    closedAt: row.closedAt?.toISOString() ?? null,
    canceled: row.canceled,
    canceledAt: row.canceledAt?.toISOString() ?? null,
    status: getDisplayStatus(row),
    orderedAt: row.orderedAt?.toISOString(),
    storeId: row.store.id,
    storeName: row.store.name ?? row.store.storeDomain,
    storeDomain: row.store.storeDomain,
    items: lineItems,
    fulfillmentItems: toFulfillmentItems(row.fulfillmentItems),
    itemsCount: itemCount,
    messageCount: row._count.messages,
    noteCount: row._count.notes,
    stockRequestCount: getStockRequestBadgeCount(row),
    backInStockStatus: getBackInStockStatus(row.backInStockRequests ?? []),
  };
}

function getStockRequestBadgeCount(row: {
  _count: { backInStockRequests: number };
}) {
  return row._count.backInStockRequests;
}

function getBackInStockStatus(requests: Array<{ status: string }>) {
  if (requests.length === 0) return null;
  if (requests.some((request) => request.status === 'pending')) return 'pending';
  if (requests.some((request) => request.status === 'partially_back_in_stock')) return 'partially_back_in_stock';
  if (requests.some((request) => request.status === 'back_in_stock')) return 'back_in_stock';
  return null;
}

function toOrderMessageRow(message: {
  id: string;
  adminName: string;
  adminEmail: string;
  senderName: string | null;
  senderEmail: string | null;
  message: string;
  createdAt: Date;
}) {
  return {
    id: message.id,
    adminName: message.adminName,
    adminEmail: message.adminEmail,
    senderName: message.senderName,
    senderEmail: message.senderEmail,
    message: message.message,
    createdAt: message.createdAt.toISOString(),
  };
}

function buildOrderCreateData(payload: ShopifyOrderPayload, storeId: string): Prisma.OrderUncheckedCreateInput {
  const data = buildOrderWriteData(payload, storeId, null);
  return {
    number: `${payload.order_number}`,
    ...data,
  };
}

function buildOrderUpdateData(
  payload: ShopifyOrderPayload,
  storeId: string,
  existingFulfillmentItems: Prisma.JsonValue | null
): Prisma.OrderUncheckedUpdateInput {
  return buildOrderWriteData(payload, storeId, existingFulfillmentItems);
}

function buildOrderWriteData(
  payload: ShopifyOrderPayload,
  storeId: string,
  existingFulfillmentItems: Prisma.JsonValue | null
) {
  const currentFulfillmentItems = toFulfillmentItems(existingFulfillmentItems);
  const syncedFulfillmentConfirmations = toShopifyFulfillmentConfirmations(payload);
  const fulfilledQuantityByLineItem = getFulfilledQuantityByLineItem(syncedFulfillmentConfirmations);
  const lineItems = (payload.line_items ?? []).map((item) => ({
    id: item.id,
    productId: item.product_id ? String(item.product_id) : null,
    name: item.name ?? '',
    sku: item.sku ?? '',
    vendor: item.vendor ?? '',
    qty: resolveLineItemQuantity(item, fulfilledQuantityByLineItem),
    price: Number(item.price_set?.shop_money?.amount ?? item.price ?? 0),
    currencyCode: item.price_set?.shop_money?.currency_code ?? null,
  }));

  const shippingAddress = payload.shipping_address;
  const customerName =
    `${payload.customer?.first_name ?? ''} ${payload.customer?.last_name ?? ''}`.trim() ||
    shippingAddress?.name?.trim() ||
    'Unknown Customer';
  const customerEmail = payload.customer?.email ?? payload.email ?? null;
  const customerPhone = payload.customer?.phone ?? payload.phone ?? shippingAddress?.phone ?? null;
  const fulfillmentStatus = resolveFulfillmentStatus(payload.fulfillment_status);
  const canceledAt = parseOptionalDate(payload.cancelled_at ?? payload.canceled_at ?? null);
  const closedAt = parseOptionalDate(payload.closed_at ?? null);
  const priceRaw = payload.total_price_set?.shop_money?.amount ?? payload.total_price ?? payload.current_total_price ?? 0;
  const price = Number(priceRaw);
  const currencyCode = payload.total_price_set?.shop_money?.currency_code ?? null;
  // console.log("payload", JSON.stringify(payload, null, 2));
  const shopifyOrderId = payload.id ? `gid://shopify/Order/${payload.id}` : currentFulfillmentItems.shopifyOrderId;
  const fulfillmentItems = {
    shopifyOrderId,
    confirmations: mergeFulfillmentConfirmations(
      currentFulfillmentItems.confirmations,
      syncedFulfillmentConfirmations
    ),
  } as Prisma.InputJsonValue;
  return {
    cusName: customerName,
    cusEmail: customerEmail,
    note: payload.note ?? null,
    address: shippingAddress?.address1 ?? null,
    address2: shippingAddress?.address2 ?? null,
    phone: customerPhone,
    city: shippingAddress?.city ?? null,
    state: shippingAddress?.province ?? null,
    zip: shippingAddress?.zip ?? null,
    country: shippingAddress?.country ?? null,
    fulfillmentStatus,
    canceled: Boolean(canceledAt),
    canceledAt,
    closed: Boolean(closedAt),
    closedAt,
    boarcode: extractBarcode(lineItems),
    lineItems,
    fulfillmentItems,
    price: Number.isFinite(price) ? price : 0,
    currencyCode,
    storeId,
    orderedAt: new Date(payload.created_at),
  };
}

function resolveFulfillmentStatus(payloadStatus?: string | null) {
  const normalized = (payloadStatus ?? '').toLowerCase();
  if (normalized.includes('partial')) return 'partial';
  if (normalized.includes('unfulfill')) return 'unfulfilled';
  if (normalized.includes('fulfill')) return 'fulfilled';
  return normalized || 'unfulfilled';
}

function getDisplayStatus(order: { canceled: boolean; closed: boolean; fulfillmentStatus: string | null }) {
  if (order.canceled) return 'canceled';
  if (order.closed && isFulfilledStatus(order.fulfillmentStatus)) return 'fulfilled';
  if (order.closed) return 'closed';
  return order.fulfillmentStatus ?? 'unfulfilled';
}

function isFulfilledStatus(status: string | null) {
  const normalized = (status ?? '').toLowerCase();
  return normalized === 'fulfilled' || normalized === 'shipped' || normalized.includes('fulfill');
}

function parseOptionalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toShopifyFulfillmentConfirmations(payload: ShopifyOrderPayload) {
  return (payload.fulfillments ?? [])
    .filter((fulfillment) => {
      const status = (fulfillment.status ?? '').toLowerCase();
      return status !== 'cancelled' && status !== 'canceled';
    })
    .map((fulfillment) => {
      const shopifyFulfillmentId = fulfillment.id ? `gid://shopify/Fulfillment/${fulfillment.id}` : null;
      const lines = (fulfillment.line_items ?? [])
        .map((lineItem) => ({
          lineItemId: String(lineItem.id ?? ''),
          quantity: Math.max(0, Number(lineItem.quantity ?? 0)),
        }))
        .filter((line) => line.lineItemId && line.quantity > 0);

      const createdAt = fulfillment.created_at ?? fulfillment.updated_at ?? null;
      const fulfillmentDate = createdAt ? createdAt.split('T')[0] : null;

      return {
        id: shopifyFulfillmentId ?? crypto.randomUUID(),
        confirmedAt: createdAt,
        shopifyFulfillmentId,
        shopifyFulfillmentStatus: fulfillment.status ?? null,
        fulfillmentDate,
        trackingInfo: {
          number: fulfillment.tracking_number ?? '',
          company: fulfillment.tracking_company ?? '',
          url: fulfillment.tracking_url ?? '',
        },
        source: 'shopify_sync',
        lines,
      };
    })
    .filter((fulfillment) => fulfillment.lines.length > 0);
}

function mergeFulfillmentConfirmations(
  currentConfirmations: Array<{ lines: FulfillmentRequestLine[]; shopifyFulfillmentId?: unknown }>,
  syncedConfirmations: Array<{ lines: FulfillmentRequestLine[]; shopifyFulfillmentId: string | null }>
) {
  const currentByShopifyId = new Map(
    currentConfirmations
      .filter((confirmation): confirmation is { lines: FulfillmentRequestLine[]; shopifyFulfillmentId: string } => {
        return typeof confirmation.shopifyFulfillmentId === 'string';
      })
      .map((confirmation) => [confirmation.shopifyFulfillmentId, confirmation])
  );
  const currentWithoutSyncedDuplicates = currentConfirmations.filter((confirmation) => {
    return typeof confirmation.shopifyFulfillmentId !== 'string';
  });

  const mergedSyncedConfirmations = syncedConfirmations.map((confirmation) => {
    if (typeof confirmation.shopifyFulfillmentId !== 'string') return confirmation;

    const existing = currentByShopifyId.get(confirmation.shopifyFulfillmentId);
    return existing ? { ...existing, ...confirmation } : confirmation;
  });

  return [...currentWithoutSyncedDuplicates, ...mergedSyncedConfirmations];
}

function getFulfilledQuantityByLineItem(
  confirmations: Array<{ lines: FulfillmentRequestLine[] }>
) {
  const quantities = new Map<string, number>();
  for (const confirmation of confirmations) {
    for (const line of confirmation.lines) {
      quantities.set(line.lineItemId, (quantities.get(line.lineItemId) ?? 0) + line.quantity);
    }
  }
  return quantities;
}

function resolveLineItemQuantity(
  item: { id: string | number; quantity?: number | null; fulfillable_quantity?: number | null },
  fulfilledQuantityByLineItem: Map<string, number>
) {
  const originalQuantity = Math.max(0, Number(item.quantity ?? 0));
  if (typeof item.fulfillable_quantity !== 'number') return originalQuantity;

  const fulfilledQuantity = fulfilledQuantityByLineItem.get(String(item.id)) ?? 0;
  return Math.min(originalQuantity, Math.max(0, item.fulfillable_quantity) + fulfilledQuantity);
}

function extractBarcode(lineItems: Array<{ sku: string }>) {
  const firstSku = lineItems.find((item) => item.sku.trim() !== '')?.sku ?? '';
  return firstSku || null;
}

function parseBarcodeList(value: string | null) {
  return normalizeBarcodes(value?.split(/\s+/) ?? []);
}

function normalizeBarcodes(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildOrderMessageEmailText({
  order,
  message,
  senderName,
  senderEmail,
}: {
  order: OrderEmailDetails;
  message: string;
  senderName: string | null;
  senderEmail: string | null;
}) {
  const items = toLineItems(order.lineItems);
  return [
    `Order ${order.number}`,
    `Store: ${order.store.name ?? order.store.storeDomain}`,
    `Customer: ${order.cusName}`,
    order.cusEmail ? `Customer email: ${order.cusEmail}` : null,
    order.phone ? `Phone: ${order.phone}` : null,
    order.address ? `Address: ${[order.address, order.address2, order.city, order.state, order.zip, order.country].filter(Boolean).join(', ')}` : null,
    `Status: ${getDisplayStatus(order)}`,
    senderName || senderEmail ? `Sent by: ${[senderName, senderEmail].filter(Boolean).join(' - ')}` : null,
    '',
    'Message:',
    message,
    '',
    'Items:',
    ...items.map((item) => `- ${item.name}${item.sku ? ` (${item.sku})` : ''} x${item.qty}`),
  ].filter((line): line is string => line !== null).join('\n');
}

function buildOrderMessageEmailHtml({
  order,
  message,
  senderName,
  senderEmail,
}: {
  order: OrderEmailDetails;
  message: string;
  senderName: string | null;
  senderEmail: string | null;
}) {
  const items = toLineItems(order.lineItems);
  const address = [order.address, order.address2, order.city, order.state, order.zip, order.country].filter(Boolean).join(', ');
  const sender = [senderName, senderEmail].filter(Boolean).join(' - ');

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 12px">Order ${escapeHtml(order.number)} message</h2>
      <table style="border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Store</td><td style="padding:3px 0">${escapeHtml(order.store.name ?? order.store.storeDomain)}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Customer</td><td style="padding:3px 0">${escapeHtml(order.cusName)}</td></tr>
        ${order.cusEmail ? `<tr><td style="padding:3px 12px 3px 0;color:#6b7280">Customer email</td><td style="padding:3px 0">${escapeHtml(order.cusEmail)}</td></tr>` : ''}
        ${order.phone ? `<tr><td style="padding:3px 12px 3px 0;color:#6b7280">Phone</td><td style="padding:3px 0">${escapeHtml(order.phone)}</td></tr>` : ''}
        ${address ? `<tr><td style="padding:3px 12px 3px 0;color:#6b7280">Address</td><td style="padding:3px 0">${escapeHtml(address)}</td></tr>` : ''}
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Status</td><td style="padding:3px 0">${escapeHtml(getDisplayStatus(order))}</td></tr>
        ${sender ? `<tr><td style="padding:3px 12px 3px 0;color:#6b7280">Sent by</td><td style="padding:3px 0">${escapeHtml(sender)}</td></tr>` : ''}
      </table>
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:16px;white-space:pre-wrap">${escapeHtml(message)}</div>
      <h3 style="font-size:14px;margin:0 0 8px">Items</h3>
      <ul style="margin:0;padding-left:20px">
        ${items.map((item) => `<li>${escapeHtml(item.name)}${item.sku ? ` (${escapeHtml(item.sku)})` : ''} x${item.qty}</li>`).join('')}
      </ul>
    </div>
  `;
}

type OrderEmailDetails = {
  number: string;
  cusName: string;
  cusEmail: string | null;
  phone: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  canceled: boolean;
  closed: boolean;
  fulfillmentStatus: string | null;
  lineItems: Prisma.JsonValue;
  store: {
    name: string | null;
    storeDomain: string;
  };
};

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const STATUS_SEARCH_KEYWORDS: { keywords: string[]; condition: Prisma.OrderWhereInput }[] = [
  {
    keywords: ['unfulfilled', 'pending'],
    condition: {
      canceled: false,
      closed: false,
      OR: [
        { fulfillmentStatus: null },
        { fulfillmentStatus: 'unfulfilled' },
        { fulfillmentStatus: 'pending' },
        { fulfillmentStatus: '' },
      ],
    },
  },
  {
    keywords: ['partial', 'partially'],
    condition: {
      canceled: false,
      closed: false,
      OR: [{ fulfillmentStatus: 'partial' }, { fulfillmentStatus: 'partially_fulfilled' }],
    },
  },
  {
    keywords: ['fulfilled'],
    condition: {
      canceled: false,
      OR: [
        { closed: false, fulfillmentStatus: { in: ['fulfilled', 'shipped'] } },
        { closed: true, fulfillmentStatus: { in: ['fulfilled', 'shipped', 'partially_fulfilled'] } },
      ],
    },
  },
  {
    keywords: ['closed'],
    condition: {
      canceled: false,
      closed: true,
      AND: [{ OR: [{ fulfillmentStatus: null }, { fulfillmentStatus: { notIn: ['fulfilled', 'shipped', 'partially_fulfilled'] } }] }],
    },
  },
  {
    keywords: ['canceled', 'cancelled'],
    condition: { canceled: true },
  },
];

function getStatusConditionsForToken(token: string): Prisma.OrderWhereInput[] {
  if (token.length < 3) return [];
  const lower = token.toLowerCase();
  return STATUS_SEARCH_KEYWORDS
    .filter(({ keywords }) => keywords.some((kw) => kw.startsWith(lower)))
    .map(({ condition }) => condition);
}

function buildFulfillmentStatusConditions(statuses: string[]): Prisma.OrderWhereInput[] {
  const conditions: Prisma.OrderWhereInput[] = [];
  for (const status of statuses) {
    switch (status) {
      case 'unfulfilled':
        conditions.push({
          canceled: false,
          closed: false,
          OR: [
            { fulfillmentStatus: null },
            { fulfillmentStatus: 'unfulfilled' },
            { fulfillmentStatus: 'pending' },
            { fulfillmentStatus: '' },
          ],
        });
        break;
      case 'partial':
        conditions.push({
          canceled: false,
          closed: false,
          OR: [
            { fulfillmentStatus: 'partial' },
            { fulfillmentStatus: 'partially_fulfilled' },
          ],
        });
        break;
      case 'fulfilled':
        conditions.push({
          canceled: false,
          OR: [
            { closed: false, fulfillmentStatus: { in: ['fulfilled', 'shipped'] } },
            { closed: true, fulfillmentStatus: { in: ['fulfilled', 'shipped', 'partially_fulfilled'] } },
          ],
        });
        break;
      case 'closed':
        conditions.push({
          canceled: false,
          closed: true,
          AND: [{
            OR: [
              { fulfillmentStatus: null },
              { fulfillmentStatus: { notIn: ['fulfilled', 'shipped', 'partially_fulfilled'] } },
            ],
          }],
        });
        break;
      case 'canceled':
        conditions.push({ canceled: true });
        break;
    }
  }
  return conditions;
}

function getPeriodStartDate(period: 'all' | 'week' | 'month' | 'year') {
  const now = new Date();
  if (period === 'all') return null;

  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  }

  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  const day = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function toLineItems(value: Prisma.JsonValue): Array<{ id: string; productId: string | null; name: string; sku: string; vendor: string; qty: number }> {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      return { id: '', productId: null, name: '', sku: '', vendor: '', qty: 0 };
    }

    const obj = item as Record<string, unknown>;
    return {
      id: typeof obj.id === 'string' ? obj.id : String(obj.id ?? ''),
      productId: typeof obj.productId === 'string' ? obj.productId : (obj.productId ? String(obj.productId) : null),
      name: typeof obj.name === 'string' ? obj.name : '',
      sku: typeof obj.sku === 'string' ? obj.sku : '',
      vendor: typeof obj.vendor === 'string' ? obj.vendor : '',
      qty: typeof obj.qty === 'number' ? obj.qty : Number(obj.qty ?? 0),
    };
  });
}

function normalizeFulfillmentLines(
  lines: FulfillmentLineInput[],
  orderLines: Array<{ id: string; qty: number }>
): FulfillmentLineInput[] {
  const orderLinesById = new Map(orderLines.map((line) => [line.id, line]));
  const normalized: FulfillmentLineInput[] = [];

  for (const line of lines) {
    const orderLine = orderLinesById.get(line.lineItemId);
    if (!orderLine) {
      throw new Error('Selected line item was not found on this order');
    }

    const quantity = Math.floor(Number(line.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error('Selected fulfillment quantities must be at least 1');
    }

    if (quantity > orderLine.qty) {
      throw new Error('Selected fulfillment quantity exceeds the ordered quantity');
    }

    normalized.push({
      lineItemId: line.lineItemId,
      quantity,
      full: Boolean(line.full),
    });
  }

  if (normalized.length === 0) {
    throw new Error('Select at least one line item to fulfill');
  }

  return normalized;
}

function toFulfillmentItems(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { shopifyOrderId: null as string | null, confirmations: [] as Array<{ lines: FulfillmentRequestLine[] }> };
  }

  const obj = value as Record<string, unknown>;
  const confirmations = Array.isArray(obj.confirmations)
    ? obj.confirmations.filter((item): item is { lines: FulfillmentRequestLine[] } => {
        return Boolean(item) && typeof item === 'object' && Array.isArray((item as { lines?: unknown }).lines);
      })
    : [];

  return {
    shopifyOrderId: typeof obj.shopifyOrderId === 'string' ? obj.shopifyOrderId : null,
    confirmations,
  };
}
