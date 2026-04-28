import prisma from '@/lib/prisma.server';

export type ShopifyOrderPayload = {
  id?: string | number;
  name?: string;
  order_number: number;
  email?: string | null;
  phone?: string | null;
  total_price?: string | number | null;
  current_total_price?: string | number | null;
  fulfillment_status?: string | null;
  created_at: string;
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
    name?: string | null;
    sku?: string | null;
    quantity?: number | null;
    price?: string | number | null;
  }> | null;
};

export class OrderModel {
  async createIfMissingFromOrderCreateWebhook(params: {
    payload: ShopifyOrderPayload;
    storeId: string;
    storeDomain: string;
  }) {
    const { payload, storeId } = params;
    console.log('Processing order webhook', JSON.stringify(payload, null, 2));
    const exists = await prisma.order.findUnique({
      where: { number: payload.order_number as number },
      select: { id: true },
    });

    if (exists) {
      return { created: false };
    }

    const lineItems = (payload.line_items ?? []).map((item) => ({
      name: item.name ?? '',
      sku: item.sku ?? '',
      qty: Number(item.quantity ?? 0),
      price: Number(item.price ?? 0),
    }));

    const shippingAddress = payload.shipping_address;
    const customerName =
      `${payload.customer?.first_name ?? ''} ${payload.customer?.last_name ?? ''}`.trim() ||
      shippingAddress?.name?.trim() ||
      'Unknown Customer';
    const customerEmail = payload.customer?.email ?? payload.email ?? null;
    const customerPhone = payload.customer?.phone ?? payload.phone ?? shippingAddress?.phone ?? null;

    const fulfillmentStatus = resolveFulfillmentStatus(payload.fulfillment_status);
    const priceRaw = payload.current_total_price ?? payload.total_price ?? 0;
    const price = Number(priceRaw);

    const address = [shippingAddress?.address1, shippingAddress?.address2]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(', ') || null;

    await prisma.order.create({
      data: {
        number: payload.order_number,
        cusName: customerName,
        cusEmail: customerEmail,
        address,
        phone: customerPhone,
        city: shippingAddress?.city ?? null,
        state: shippingAddress?.province ?? null,
        zip: shippingAddress?.zip ?? null,
        country: shippingAddress?.country ?? null,
        fulfillmentStatus,
        boarcode: extractBarcode(lineItems),
        lineItems,
        price: Number.isFinite(price) ? price : 0,
        storeId,
        orderedAt: new Date(payload.created_at)
      },
    });

    return { created: true };
  }
}

function resolveFulfillmentStatus(payloadStatus?: string | null) {
  const normalized = (payloadStatus ?? '').toLowerCase();
  if (normalized.includes('partial')) return 'partial';
  if (normalized.includes('fulfill')) return 'fulfilled';
  return normalized || 'unfulfilled';
}

function extractBarcode(lineItems: Array<{ sku: string }>) {
  const firstSku = lineItems.find((item) => item.sku.trim() !== '')?.sku ?? '';
  return firstSku || null;
}
