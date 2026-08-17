import type { MessageAdmin } from '@/hooks/useOrderMessages';
type AdminOption = MessageAdmin;

export type OrderItem = {
  id: string;
  productId: string | null;
  variantId?: string | null;
  name: string;
  title?: string;
  variantTitle?: string;
  variantOptions?: Array<{ name: string; value: string }>;
  customAttributes?: Array<{ name: string; value: string }>;
  imageUrl?: string | null;
  sku: string;
  vendor: string;
  qty: number;
  position?: number;
  packedQuantity?: number;
  isEmbroidery?: boolean;
  isPrint?: boolean;
  assignments?: LineItemAssignment[];
  decoration?: DecorationLineSummary;
};
export type DecorationFileRef = { name: string; url: string; size?: number; mimeType?: string };
export type OrderDecorationAttachments = {
  files: DecorationFileRef[];
  customerDesign: DecorationFileRef[];
  customerRemarks: string;
  photos: DecorationFileRef[];
};
export type OrderAttachmentField = 'files' | 'customerDesign' | 'customerRemarks' | 'photos';
export type FileAttachmentField = 'files' | 'customerDesign' | 'photos';
export type DecorationWorkComment = {
  sizes?: string;
  colors?: string;
  remarks?: string;
  location?: string;
  files?: DecorationFileRef[];
};
export type DecorationWorkRecord = {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: string;
  category: string;
  quantityDone: number;
  comments: DecorationWorkComment[];
  createdAt: string;
};
export type DecorationLineSummary = {
  doneQty: number;
  remaining: number;
  fullyDone: boolean;
  locked: boolean;
  hasPendingRequest: boolean;
  hasActiveGrant: boolean;
  works: DecorationWorkRecord[];
};
export type LineItemAssignment = {
  id: string;
  lineItemId?: string;
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  assigneeRole: string;
  category: string | null;
  dueDate: string | null;
  assignedByName: string | null;
  createdAt: string;
};
export type DecoratorUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  category: 'embroidery' | 'print' | null;
};
export type AssignModalState = {
  orderId: string;
  orderNumber: string;
  lineItemId: string;
  productName: string;
  assignments: LineItemAssignment[];
  selectedUserId: string;
  dueDate: string;
  saving: boolean;
  removingId: string | null;
  error: string;
};
export type WorkCommentDraft = {
  sizes: string;
  colors: string;
  remarks: string;
  location: string;
  files: DecorationFileRef[];
  uploading: boolean;
};
export type WorkModalState = {
  order: OrderRow;
  item: OrderItem;
  quantityDone: number;
  comments: WorkCommentDraft[];
  saving: boolean;
  error: string;
};
export type WorkDraftState = {
  quantityDone: number;
  comments: WorkCommentDraft[];
  saving: boolean;
  error: string;
};
export type WorkDetailsModalState = {
  order: OrderRow;
  item: OrderItem;
};
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
export type TrackingSummary = {
  id: string;
  trackingNumber: string;
  registrationStatus: string;
  status: string | null;
};

export type OrderRow = {
  id: string;
  number: number;
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
  decorationAttachments: OrderDecorationAttachments;
  packingStatus: 'packed' | 'partially_packed' | 'not_packed';
  packedQuantity: number;
  totalQuantity: number;
  trackings: TrackingSummary[];
};

export type TrackingActionModalState = {
  order: OrderRow;
  tracking: TrackingSummary | null;
  action: 'register' | 'pause' | 'restart';
  saving: boolean;
  error: string;
};

export type StoreOption = { id: string; name: string; storeDomain: string };
export type { MessageAdmin as AdminOption, MessageRecord as OrderAdminMessage } from '@/hooks/useOrderMessages';
export type { NoteRecord as OrderNote } from '@/hooks/useOrderNotes';
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
  number: number;
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

import type { MessageModalState as MessageModalStateGeneric } from '@/hooks/useOrderMessages';
import type { NoteModalState as NoteModalStateGeneric } from '@/hooks/useOrderNotes';
export type MessageModalState = MessageModalStateGeneric<OrderRow>;
export type NoteModalState = NoteModalStateGeneric<OrderRow>;

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

export type DeleteLineItemModalState = {
  order: OrderRow;
  item: OrderItem;
  restockable: boolean;
  restock: boolean;
  saving: boolean;
  error: string;
};

export type EditLineItemModalState = {
  order: OrderRow;
  item: OrderItem;
  titleEditable: boolean;
  title: string;
  quantity: number;
  minQuantity: number;
  restockable: boolean;
  restock: boolean;
  saving: boolean;
  error: string;
};

export type VariantSearchResult = {
  variantShopifyId: string;
  productShopifyId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  price: number;
  inventoryQuantity: number;
  imageUrl: string | null;
};

export type AddLineItemModalState = {
  order: OrderRow;
  afterLineItemId: string;
  mode: 'variant' | 'custom';
  query: string;
  results: VariantSearchResult[];
  searching: boolean;
  selectedVariant: VariantSearchResult | null;
  customTitle: string;
  currencyCode: string | null;
  quantity: number;
  saving: boolean;
  error: string;
};
