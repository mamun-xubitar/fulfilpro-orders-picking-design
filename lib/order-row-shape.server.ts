import { isOrderPickerRole } from '@/lib/roles';

type Loose = Record<string, unknown>;

/** Order pickers only get what the packing workflow needs. Customer contact / address, shipping,
 * fulfilment, stock and decoration data are removed on the server, not just hidden in the UI. */
export function shapeOrderForRole<T extends object>(order: T, role?: string | null): T {
  if (!isOrderPickerRole(role)) return order;
  const row = order as Loose & { items?: Loose[] };
  return {
    ...order,
    note: null,
    address: null,
    address2: null,
    city: null,
    state: null,
    country: null,
    barcodes: [],
    shippingLines: [],
    fulfillmentItems: { shopifyOrderId: null, confirmations: [] },
    stockRequestCount: 0,
    backInStockStatus: null,
    stockAdjustment: null,
    decorationAttachments: { files: [], customerDesign: [], customerRemarks: '', photos: [] },
    labelPrintedAt: null,
    trackings: [],
    items: (row.items ?? []).map((item) => ({
      ...item,
      customAttributes: undefined,
      isEmbroidery: false,
      isPrint: false,
      assignments: [],
      decoration: undefined,
    })),
  } as T;
}
