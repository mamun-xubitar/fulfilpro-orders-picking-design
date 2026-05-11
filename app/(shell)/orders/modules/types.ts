export type OrderItem = { id: string; productId: string | null; name: string; sku: string; vendor: string; qty: number };
export type ShippingLine = {
  id: string;
  title: string;
  code: string | null;
  source: string | null;
  price: number;
  discountedPrice: number | null;
  currencyCode: string | null;
  carrierIdentifier: string | null;
  requestedFulfillmentServiceId: string | null;
  phone: string | null;
  deliveryCategory: string | null;
  discountCodes: string[];
  discountAllocations: Array<{
    amount: number;
    currencyCode: string | null;
    code: string | null;
    title: string | null;
    type: string | null;
    discountApplicationIndex: number | null;
  }>;
};
export type OrderRow = {
  id: string;
  number: string;
  customer: string;
  note: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  closed: boolean;
  closedAt: string | null;
  canceled: boolean;
  canceledAt: string | null;
  status: string;
  orderedAt: string;
  storeId: string;
  storeName: string;
  storeDomain: string;
  barcodes: string[];
  items: OrderItem[];
  shippingLines: ShippingLine[];
  fulfillmentItems: {
    shopifyOrderId: string | null;
    confirmations: FulfillmentConfirmation[];
  };
  itemsCount: number;
  messageCount: number;
  noteCount: number;
  stockRequestCount: number;
  backInStockStatus: BackInStockStatus | null;
  stockAdjustment: OrderStockAdjustment | null;
};

export type StoreOption = { id: string; name: string; storeDomain: string };
export type AdminOption = { id: string; name: string; email: string };
export type OrderAdminMessage = {
  id: string;
  adminName: string;
  adminEmail: string;
  senderName: string | null;
  senderEmail: string | null;
  message: string;
  createdAt: string;
};
export type OrderNote = {
  id: string;
  note: string;
  authorName: string | null;
  authorEmail: string | null;
  editorName: string | null;
  editorEmail: string | null;
  createdAt: string;
  updatedAt: string;
};
export type BackInStockStatus = 'pending' | 'partially_back_in_stock' | 'back_in_stock';
export type OrderStockAdjustmentStatus = 'pending' | 'partial' | 'managed';
export type OrderStockAdjustmentItem = {
  lineItemId: string;
  productId: string | null;
  name: string;
  sku: string;
  vendor: string;
  quantity: number;
  action: 'decrease' | 'restore';
  managed: boolean;
  managedAt: string | null;
  lastEventType: 'fulfilled' | 'partially_fulfilled' | 'fulfillment_canceled';
  lastEventAt: string;
};
export type OrderStockAdjustment = {
  id: string;
  orderId: string;
  status: OrderStockAdjustmentStatus;
  items: OrderStockAdjustmentItem[];
  managedCount: number;
  totalCount: number;
  lastEventType: 'fulfilled' | 'partially_fulfilled' | 'fulfillment_canceled';
  lastEventAt: string;
  managedByName: string | null;
  managedByEmail: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};
export type BackInStockItem = { lineItemId: string; dueDate: string; supplierName: string; quantity: number; item: string; restockedQuantity?: number };
export type BackInStockMessage = {
  id: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  message: string;
  status: BackInStockStatus | null;
  createdAt: string;
};
export type BackInStockRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  requesterName: string;
  requesterEmail: string;
  status: BackInStockStatus;
  items: BackInStockItem[];
  requestMessage: string | null;
  unreadUpdateCount: number;
  messages: BackInStockMessage[];
  createdAt: string;
  updatedAt: string;
};
export type PackingSlipLabel = {
  id: string;
  number: string;
  customer: string;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  note: string | null;
  storeName: string;
  storeDomain: string;
  storeUrl: string | null;
  storeLogoPath: string | null;
};
export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  errors?: string[];
  data: T;
};

export type OrderSyncJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | string;
  storeIds: string[] | null;
  totalStores: number;
  totalFetched: number;
  totalCreated: number;
  totalUpdated: number;
  failedStores: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FulfillmentEditRequestRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  fulfillmentId: string;
  requestType: 'edit' | 'cancel';
  requestedById: string;
  requestedByName: string;
  requestedByEmail: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminTargets: Array<{ id: string; name: string; email: string }>;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

export type FulfillmentLine = { lineItemId: string; quantity: number; full: boolean };
export type FulfillmentConfirmation = {
  id?: string;
  confirmedAt?: string | null;
  shopifyFulfillmentId?: string | null;
  shopifyFulfillmentStatus?: string | null;
  barcodes?: string[];
  fulfillmentDate?: string | null;
  trackingInfo?: {
    number?: string;
    company?: string;
    url?: string;
  } | null;
  lines: Array<{ lineItemId: string; quantity: number; full?: boolean }>;
};

export type PendingFulfillmentModalState = {
  order: OrderRow;
  lines: FulfillmentLine[];
  notifyCustomer: boolean;
  barcodeInput: string;
  trackingNumber: string;
  trackingUrl: string;
  trackingCompany: string;
};

export type MessageModalState = {
  order: OrderRow;
  admins: AdminOption[];
  messages: OrderAdminMessage[];
  selectedAdminId: string;
  message: string;
  loading: boolean;
  sending: boolean;
  error: string;
};

export type NoteModalState = {
  order: OrderRow;
  notes: OrderNote[];
  note: string;
  editingNoteId: string | null;
  loading: boolean;
  saving: boolean;
  deletingId: string | null;
  error: string;
};

export type StockModalState = {
  order: OrderRow;
  requests: BackInStockRequest[];
  items: BackInStockItem[];
  message: string;
  loading: boolean;
  saving: boolean;
  error: string;
};

export type StockAdjustmentModalState = {
  order: OrderRow;
  adjustment: OrderStockAdjustment | null;
  managedLineItemIds: string[];
  note: string;
  loading: boolean;
  saving: boolean;
  error: string;
};

export type EditFulfillmentModalState = {
  order: OrderRow;
  conf: FulfillmentConfirmation;
  confId: string;
  barcodes: string;
  fulfillmentDate: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  saving: boolean;
  error: string;
};

export type CancelFulfillmentModalState = {
  order: OrderRow;
  conf: FulfillmentConfirmation;
  confId: string;
  saving: boolean;
  error: string;
};

export type RequestPermissionModalState = {
  order: OrderRow;
  conf: FulfillmentConfirmation;
  confId: string;
  requestType: 'edit' | 'cancel';
  availableAdmins: AdminOption[];
  selectedAdminIds: string[];
  reason: string;
  loadingAdmins: boolean;
  saving: boolean;
  error: string;
};
