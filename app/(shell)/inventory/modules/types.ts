/** The shape the `/api/inventory/catalog` endpoints return, backed by the `SupplierProduct` tables. */

export type ProductStatusValue = 'ACTIVE' | 'DRAFT' | 'UNLISTED';

/** A colourway on the product. `color` is a CSS-compatible value (named keyword or hex),
 * derived from `name` — see lib/inventory/colour.ts. */
export type ColourOption = {
  name: string;
  color: string;
};

/** One open PO's unreceived quantity for a variant, with its expected delivery date. */
export type IncomingLot = {
  quantity: number;
  /** ISO 8601, or null when the PO has no delivery date yet ("TBC"). */
  date: string | null;
  poNumber: number;
  status: PurchaseOrderStatusValue;
};

/** One row of the variants / stock matrix. */
export type VariantRow = {
  id: string;
  sku: string | null;
  barcode: string | null;
  colour: string;
  size: string;
  /** Σ of `locations[].quantity` while the variant has any location; otherwise its unassigned stock. */
  stockOnHand: number;
  /** Weighted average of received PO unit cost; falls back to the stored per-variant price. Read-only. */
  buyPrice: number;
  sellPrice: number;
  /** Reorder point. No calculation — admin sets it manually. Defaults to 10. */
  trigger: number;
  /** Committed to unfulfilled orders. Manually editable — this value wins over allocatedFromOrders. */
  allocated: number;
  /** Order-derived hint only, shown next to the editable Allocated cell. */
  allocatedFromOrders: number;
  /** Sum of incomingLots. */
  incoming: number;
  /** One entry per open PO with unreceived quantity. */
  incomingLots: IncomingLot[];
  /** The one image from the product's pool this variant is linked to, Shopify-style — several
   * variants may point at the same image. Null when unlinked. */
  imageId: string | null;
  /** Where the variant is kept — any number of locations, A→Z, with the stock held at each. */
  locations: { id: string; name: string; quantity: number }[];
};

/** Below / near / above the reorder trigger. Drives row tint, badge and legend. */
export type VariantStatus = 'below' | 'near' | 'above';

/** Per-row values computed from a VariantRow — never stored. */
export type VariantComputed = {
  available: number;
  stockValue: number;
  status: VariantStatus;
};

/** The Stock Summary figures, folded from the visible rows. */
export type StockSummary = {
  totalStock: number;
  availableStock: number;
  allocated: number;
  incoming: number;
  stockValue: number;
  /** Sum of the Trigger column — shown in the table totals row only. */
  trigger: number;
};

/** A product image. Grouped into the thumb rail by `colour`. */
export type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
  /** null = not tied to a colourway (hero / packshot / other). */
  colour: string | null;
};

/** One variant of the product as it exists on a single connected store, fetched live from Shopify. */
export type StoreListingVariant = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  optionValues: string[];
  inventoryQuantity: number | null;
  /** This store's live MediaImage id for the variant, if one is assigned. */
  imageId: string | null;
  /** The variant's inventory item gid on that store — used to set its Available quantity. */
  inventoryItemId: string | null;
};

/** One product image as it exists on a single connected store, fetched live from Shopify. */
export type StoreListingImage = {
  id: string;
  url: string;
  altText: string | null;
};

/** A connected store, and (if this product is published there) its live Shopify listing —
 * looked up by handle. One entry per connected store, whether or not the product is found. */
export type StoreListingStatusValue = 'NOT_LISTED' | 'PUBLISHING' | 'LISTED' | 'FAILED';

export type StoreListingResult = {
  storeId: string;
  storeName: string;
  storeDomain: string;
  found: boolean;
  /** How the product was matched on that store — handle lookup, persisted id fallback, or null. */
  matchedBy: 'handle' | 'id' | null;
  /** Product.title on that store — null when not found there. */
  productTitle: string | null;
  productGid: string | null;
  externalId: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'UNLISTED' | null;
  url: string | null;
  currencyCode: string | null;
  variants: StoreListingVariant[];
  /** Shopify's free-text "Type" field on that store — null when not found there. */
  productType: string | null;
  /** Collections this listing currently belongs to on that store — used to seed the publish
   * modal's Collections picker. Automated collections are flagged so they're never offered for
   * (unsupported) manual membership edits. */
  collections: { id: string; title: string; handle: string; automated: boolean }[];
  /** Product.descriptionHtml on that store — null when not found there. */
  description: string | null;
  /** Product.vendor on that store — null when not found there. */
  vendor: string | null;
  /** Product.tags on that store. */
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  /** Shopify's standard taxonomy category on that store — distinct from `productType`. */
  category: { id: string; name: string } | null;
  /** Product images on that store, live from Shopify. */
  images: StoreListingImage[];
  /** Set when this store's lookup failed (e.g. throttled, bad token) — the other stores still resolve. */
  error: string | null;
  /** From SupplierProductStoreListing — our own record of the publish, merged onto the live
   * Shopify lookup above. Independent of `status`, which is Shopify's product status. */
  listingStatus: StoreListingStatusValue;
  /** Per-store margin % — pre-fills this store's suggested price in the publish/bulk-update
   * modals. Never affects the product-level Pricing & margin panel's calculation. */
  marginPercent: number | null;
  /** This store's global default margin (set on the inventory toolbar's "Per store margin"
   * section) — the fallback `marginPercent` resolves to when this product has no margin of its
   * own for this store. Null when the store has no default set either, in which case pricing
   * falls back further to the product's own sell price. See lib/inventory/store-price.ts. */
  storeDefaultMarginPercent: number | null;
  lastError: string | null;
  lastPublishedAt: string | null;
};

/** Raw pricing inputs. Mirrors the ProductPricing table one-for-one. */
export type PricingInputs = {
  currencyCode: string;
  exchangeRate: number;
  buyingPrice: number;
  freight: number;
  misc: number;
  marginPercent: number;
  /** A percent (0-100) of the ex-tax sell price — matches ProductPricing.tax. */
  tax: number;
};

/** Pricing figures derived from PricingInputs. */
export type PricingComputed = {
  totalBuying: number;
  sellingPrice: number;
  /** sellingPrice * (tax / 100). */
  taxAmount: number;
  sellingIncTax: number;
};

/** One entry in the Recent Activity panel. */
export type ActivityEntry = {
  id: string;
  /** ISO 8601. */
  at: string;
  actor: string;
  message: string;
};

export type StocktakeInfo = {
  /** ISO 8601, or null when never counted. */
  lastAt: string | null;
  nextAt: string | null;
};

export type AdjustmentsInfo = {
  lastAt: string | null;
  thisMonth: number;
};

export type ProductSupplierLink = { id: string; name: string; poEmail: string };

/** Everything the Products tab renders for one product. */
export type ProductRecord = {
  id: string;
  /** Every linked supplier, alphabetical by name — a product can have several, none of them a
   * "default". */
  suppliers: ProductSupplierLink[];
  /** The hub's own style code — distinct from `handle`. */
  itemNo: string;
  /** Unique, URL-safe slug — Shopify's product Handle equivalent. */
  handle: string;
  /** Product.vendor */
  brand: string;
  /** Product.title */
  name: string;
  /** Product.category */
  category: string;
  /** Shopify taxonomy gid backing `category`. */
  categoryId: string | null;
  /** Hub-only flat InventoryCategory — distinct from the Shopify taxonomy `category` above, never
   * pushed to Shopify. */
  inventoryCategoryId: string | null;
  inventoryCategoryName: string | null;
  /** Parent SKU. Shopify has no such field; derived from the variant prefix. */
  sku: string;
  /** Sanitized HTML — edited via a rich-text field, imported straight from Shopify's
   * `Body (HTML)` CSV column, and rendered rather than escaped. */
  description: string;
  /** Free-text internal note about the product itself (distinct from a PO's own remark). */
  productRemark: string;
  /** Default quantity seeded onto every variant row when creating a purchase order. */
  poQuantity: number;
  /** Hidden from the product list and record stepper until "Show omitted" is on. */
  omitted: boolean;
  status: ProductStatusValue;
  /** Whether a human has signed off on the record. */
  verified: boolean;
  /** ISO 8601 — orders the product list; the page opens on the newest. */
  createdAt: string;
  images: ProductImage[];
  /** Source of truth for the size chips and the matrix size dropdown. */
  sizes: string[];
  /** Source of truth for the colour chips, matrix pills and every swatch. */
  colours: ColourOption[];
  variants: VariantRow[];
  pricing: PricingInputs;
  stocktake: StocktakeInfo;
  adjustments: AdjustmentsInfo;
  activity: ActivityEntry[];
};

/** Store-wide defaults, from AppSettings + CurrencyRate. */
export type InventoryGlobals = {
  exchangeRate: number;
  marginPercent: number;
  baseCurrency: string;
  currencies: { code: string; rate: number }[];
};

export type CataloguePagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

/** The payload `GET /api/inventory/catalog` returns for every mode. */
export type ProductsResponse = {
  products: ProductRecord[];
  pagination: CataloguePagination;
  /** Whole-catalogue count, ignoring every filter — the "of Y" half of the record stepper. */
  totalAll: number;
  /** Table mode only: count under the Verified filter only — the "n / X" half of the record
   * stepper, kept in sync with the table's own mutations (delete, bulk actions, import). */
  stepperTotal?: number;
  /** Table mode only: stock on hand / stock value summed over every row matching the current
   * filters and search (not just the current page) — the table's bottom totals row (item 21). */
  totals?: { stockOnHand: number; stockValue: number };
  globals: InventoryGlobals;
  supplierOptions: { id: string; name: string }[];
  /** Table mode only: every hub-only category, for the Category filter dropdown. */
  categoryOptions?: { id: string; name: string }[];
};

// — UI-only types —

export type ModuleTabId =
  | 'variants'
  | 'products'
  | 'purchase-recommend'
  | 'purchase-orders'
  | 'locations'
  | 'stocktake'
  | 'adjustments'
  | 'suppliers'
  | 'payments'
  | 'history';

export type TabDef<T extends string> = {
  id: T;
  label: string;
  /** Shown on the ComingSoon panel for stub tabs. */
  blurb: string;
};

/** The four orange shortcut filters in the toolbar. */
export type QuickFilterId = 'buying-lt-1' | 'profit-lt-5' | 'selling-lt-1' | 'selling-lt-5';

/** Editable copy of PricingInputs while the pricing panel is in edit mode. */
export type PricingForm = {
  currencyCode: string;
  exchangeRate: string;
  buyingPrice: string;
  freight: string;
  misc: string;
  marginPercent: string;
  tax: string;
};

/** Editable copy of the product record while the details panel is in edit mode. */
export type ProductDetailsForm = {
  itemNo: string;
  handle: string;
  /** Every linked supplier for this product — at least one. Saving replaces the full set (an id
   * dropped from here has its link removed). */
  supplierIds: string[];
  brand: string;
  name: string;
  category: string;
  categoryId: string | null;
  /** Hub-only flat InventoryCategory — distinct from the Shopify taxonomy category above. */
  inventoryCategoryId: string | null;
  inventoryCategoryName: string;
  sku: string;
  description: string;
  productRemark: string;
  /** Default quantity seeded onto every variant row when creating a purchase order. */
  poQuantity: string;
  /** Comma-separated, e.g. "50, 52, 54, 56, 58, 60". */
  sizes: string;
  /** Comma-separated, e.g. "Red, Blue, Hot Pink". */
  colours: string;
  status: ProductStatusValue;
  verified: boolean;
};

// — Purchase orders —

export type PurchaseOrderStatusValue = 'REQUESTED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export type PurchaseOrderItemRecord = {
  id: string;
  variantId: string | null;
  variantTitle: string;
  /** Null when the linked variant has since been deleted. */
  colour: string | null;
  size: string | null;
  sku: string | null;
  quantity: number;
  receivedQuantity: number;
  unitCost: number | null;
  /** The linked variant's locations, A→Z — where a receipt can be put away. */
  locations: { id: string; name: string }[];
};

export type PurchaseOrderRecord = {
  id: string;
  number: number;
  referenceNumber: string | null;
  supplierId: string;
  supplierName: string;
  poEmail: string;
  supplierProductId: string;
  productTitle: string;
  status: PurchaseOrderStatusValue;
  deliveryDate: string | null;
  poRemark: string | null;
  shippingRemark: string | null;
  createdAt: string;
  items: PurchaseOrderItemRecord[];
  itemNo: string;
  /** Null until a payment is first saved for this PO. */
  payment: PoPaymentRecord | null;
  /** The pricing frozen on the PO at creation — what the Pay modal starts from when no payment exists yet. */
  productPricing: { currencyCode: string; exchangeRate: number; buyingPrice: number; freight: number; misc: number } | null;
};

export type PoPaymentStatusValue = 'UNPAID' | 'PAID';

type PoPaymentFields = {
  status: PoPaymentStatusValue;
  currencyCode: string;
  exchangeRate: number;
  buyingPrice: number;
  freight: number;
  misc: number;
  totalAud: number;
  paidAt: string | null;
  reference: string | null;
  remark: string | null;
};

export type PoPaymentRecord = PoPaymentFields & {
  id: string;
  purchaseOrderId: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
};

export type PoPaymentHistoryRecord = PoPaymentFields & {
  id: string;
  /** created | updated | paid | unpaid */
  action: string;
  actorName: string;
  createdAt: string;
};

/** A payment as listed on the Payments tab: the payment plus the PO it settles. */
export type PoPaymentListRecord = PoPaymentRecord & {
  purchaseOrder: { number: number; productTitle: string; supplierId: string; supplierName: string; supplierProductId: string };
  historyCount: number;
};

export type SupplierOption = { id: string; name: string; poEmail: string };

// — Stocktake —

export type StocktakeStatusValue = 'OPEN' | 'COUNTED' | 'COMPLETED' | 'CANCELLED';

/** One counting line — a variant at one location. `expectedQty` / `systemQty` only come back for admins. */
export type StocktakeItemRecord = {
  id: string;
  variantId: string;
  colour: string;
  size: string;
  sku: string | null;
  locationId: string | null;
  locationName: string | null;
  /** Stock at the line's location (or the variant's unassigned stock) when the stocktake was created. */
  expectedQty?: number;
  /** The same figure right now. */
  systemQty?: number;
  countedQty: number | null;
};

export type StocktakeRecord = {
  id: string;
  number: number;
  supplierProductId: string;
  productName: string;
  itemNo: string;
  status: StocktakeStatusValue;
  startedByName: string;
  countedByName: string | null;
  countedAt: string | null;
  syncedByName: string | null;
  completedAt: string | null;
  createdAt: string;
  itemCount: number;
  countedCount: number;
  items: StocktakeItemRecord[];
};

export type StocktakeSyncSummary = { adjusted: number; unchanged: number; skipped: number };

// — Stock adjustments —

export type StockAdjustmentReasonValue = 'DAMAGED' | 'LOST' | 'FOUND' | 'RETURN' | 'CORRECTION' | 'OTHER';

export type StockAdjustmentSourceValue = 'MANUAL' | 'STOCKTAKE';

/** One adjustment — a saved batch of variant lines — as listed in the Adjustments tab and a
 * product's history. The lines themselves load with the View modal (AdjustmentBatchDetail). */
export type AdjustmentBatchRecord = {
  id: string;
  /** Shown as ADJ-0001 (formatAdjustmentNumber). */
  number: number;
  source: StockAdjustmentSourceValue;
  /** The stocktake's ST-0007 when `source` is STOCKTAKE. */
  reference: string | null;
  createdAt: string;
  supplierProductId: string;
  productName: string;
  itemNo: string;
  actorName: string;
  lineCount: number;
  netQty: number;
  /** The reason every line shares, or MIXED. */
  reason: StockAdjustmentReasonValue | 'MIXED';
};

export type AdjustmentLineRecord = {
  id: string;
  variantId: string;
  colour: string;
  size: string;
  sku: string | null;
  delta: number;
  /** Stock at the line's location just before the change. Null for old adjustments, and for
   * non-admins (who don't see stock on hand). */
  stockBefore: number | null;
  /** Where the change landed; null for a variant with no location and for older lines. */
  locationId: string | null;
  locationName: string | null;
  reason: StockAdjustmentReasonValue;
  note: string | null;
};

export type AdjustmentBatchDetail = AdjustmentBatchRecord & { lines: AdjustmentLineRecord[] };

// — History —

/** One row of the History tab (InventoryActivity), with the product it belongs to. */
export type InventoryActivityRecord = {
  id: string;
  type: string;
  message: string;
  actorName: string;
  createdAt: string;
  /** Set on adjustment entries — the History tab's View opens that adjustment. */
  adjustmentBatchId: string | null;
  supplierProductId: string;
  productName: string;
  itemNo: string;
};
