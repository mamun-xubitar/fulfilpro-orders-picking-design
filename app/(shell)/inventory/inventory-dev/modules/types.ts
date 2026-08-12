/**
 * The shape this page expects from the API once it is wired to the database.
 *
 * Fields are annotated with where they come from today, so integration is a
 * mapping exercise rather than a redesign. `demo-data.ts` is the only file that
 * fabricates values of these types.
 */

export type ProductStatusValue = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

/** One row of the variants / stock matrix. */
export type VariantRow = {
  // — mirrors ProductVariant today —
  id: string;
  sku: string | null;
  /** Not on ProductVariant; would come from a barcode column or Shopify metafield. */
  barcode: string | null;
  /** Derived from ProductVariant.optionValues JSON via COLOR_OPTION_NAMES. */
  colour: string;
  /** Derived from ProductVariant.optionValues JSON via SIZE_OPTION_NAMES. */
  size: string;
  /** ProductVariant.inventoryQuantity */
  stockOnHand: number;
  /** ProductVariant.cost, converted to base currency */
  buyPrice: number;
  /** ProductVariant.price */
  sellPrice: number;

  // — NOT IN PRISMA YET —
  /** Reorder point. Needs a new column on ProductVariant. */
  trigger: number;
  /** Committed to unfulfilled orders. Would roll up from OrderLineItem. */
  allocated: number;
  /** On order but not received. Would roll up from PurchaseOrderItem. */
  incoming: number;
  /** Future-dated / pre-sold demand. Needs a new source. */
  forwardOrders: number;
};

/** Below / near / above the reorder trigger. Drives row tint, badge and legend. */
export type VariantStatus = 'below' | 'near' | 'above';

/** Per-row values computed from a VariantRow — never stored. */
export type VariantComputed = {
  available: number;
  suggested: number;
  stockValue: number;
  status: VariantStatus;
};

/** The seven Stock Summary figures, folded from the visible rows. */
export type StockSummary = {
  totalStock: number;
  availableStock: number;
  allocated: number;
  incoming: number;
  forwardOrders: number;
  suggestedOrder: number;
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
  /** Flat amount in base currency, not a rate — matches ProductPricing.tax. */
  tax: number;
};

/** Pricing figures derived from PricingInputs. */
export type PricingComputed = {
  totalBuying: number;
  sellingPrice: number;
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
  /** Style code — Product.handle stands in for this today. */
  itemNo: string;
  /** Product.vendor */
  brand: string;
  /** Product.title */
  name: string;
  /** Product.category */
  category: string;
  /** Parent SKU. Shopify has no such field; derived from the variant prefix. */
  sku: string;
  /** Plain text, from Product.descriptionHtml. */
  description: string;
  /** NOT IN PRISMA YET — free-text supplier delivery note. */
  deliveryRemarks: string;
  status: ProductStatusValue;
  /** NOT IN PRISMA YET — whether a human has signed off on the record. */
  verified: boolean;
  /** ISO 8601 — orders the product list; the page opens on the newest. */
  createdAt: string;
  images: ProductImage[];
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
