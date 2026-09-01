/** The shape the `/api/inventory/catalog` endpoints return, backed by the `SupplierProduct` tables. */

export type ProductStatusValue = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

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
};

/** One row of the variants / stock matrix. */
export type VariantRow = {
  id: string;
  sku: string | null;
  barcode: string | null;
  colour: string;
  size: string;
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

/** A storefront the product is published to. */
export type StoreListing = {
  id: string;
  /** Store.name */
  name: string;
  /** Store.storeDomain */
  domain: string;
  /** Product.status on that store */
  status: ProductStatusValue;
  /** Product.shopifyId on that store */
  externalId: string;
  /** Listed price on that store, in base currency. */
  price: number;
  /** Product.onlineStoreUrl */
  url: string | null;
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

/** Everything the Products tab renders for one product. */
export type ProductRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
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
  /** Parent SKU. Shopify has no such field; derived from the variant prefix. */
  sku: string;
  /** Sanitized HTML — edited via a rich-text field, imported straight from Shopify's
   * `Body (HTML)` CSV column, and rendered rather than escaped. */
  description: string;
  /** NOT IN PRISMA YET — free-text supplier delivery note. */
  deliveryRemarks: string;
  status: ProductStatusValue;
  /** NOT IN PRISMA YET — whether a human has signed off on the record. */
  verified: boolean;
  /** ISO 8601 — orders the product list; the page opens on the newest. */
  createdAt: string;
  images: ProductImage[];
  /** NOT IN PRISMA YET — source of truth for the size chips and the matrix size dropdown. */
  sizes: string[];
  /** NOT IN PRISMA YET — source of truth for the colour chips, matrix pills and every swatch. */
  colours: ColourOption[];
  variants: VariantRow[];
  pricing: PricingInputs;
  stores: StoreListing[];
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

/** The payload the page loads on mount. */
export type ProductsResponse = {
  products: ProductRecord[];
  globals: InventoryGlobals;
};

// — UI-only types —

export type ModuleTabId =
  | 'products'
  | 'purchase-recommend'
  | 'purchase-orders'
  | 'receiving'
  | 'stocktake'
  | 'adjustments'
  | 'suppliers'
  | 'payments'
  | 'reports'
  | 'dashboard';

export type ProductTabId =
  | 'details'
  | 'variants'
  | 'purchase-info'
  | 'suppliers'
  | 'images'
  | 'notes'
  | 'documents'
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
  brand: string;
  name: string;
  category: string;
  categoryId: string | null;
  sku: string;
  description: string;
  deliveryRemarks: string;
  /** Comma-separated, e.g. "50, 52, 54, 56, 58, 60". */
  sizes: string;
  /** Comma-separated, e.g. "Red, Blue, Hot Pink". */
  colours: string;
  status: ProductStatusValue;
  verified: boolean;
};

// — Purchase orders —

export type PurchaseOrderStatusValue = 'DRAFT' | 'REQUESTED' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

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
};

export type PurchaseOrderRecord = {
  id: string;
  number: number;
  supplierId: string;
  supplierName: string;
  poEmail: string;
  supplierProductId: string;
  productTitle: string;
  status: PurchaseOrderStatusValue;
  deliveryDate: string | null;
  remark: string | null;
  createdAt: string;
  items: PurchaseOrderItemRecord[];
};

export type SupplierOption = { id: string; name: string; poEmail: string };

// — Stocktake —

export type StocktakeItemRecord = { id: string; variantId: string; colour: string; size: string; sku: string | null; expectedQty: number; countedQty: number | null };

export type StocktakeRecord = {
  id: string;
  supplierProductId: string;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  startedByName: string;
  completedAt: string | null;
  createdAt: string;
  items: StocktakeItemRecord[];
};

// — Stock adjustments —

export type StockAdjustmentReasonValue = 'DAMAGED' | 'LOST' | 'FOUND' | 'RETURN' | 'CORRECTION' | 'OTHER';

export type StockAdjustmentRecord = {
  id: string;
  variantId: string;
  colour: string;
  size: string;
  delta: number;
  reason: StockAdjustmentReasonValue;
  note: string | null;
  actorName: string;
  createdAt: string;
};
