import type { ModuleTabId, ProductStatusValue, QuickFilterId, TabDef, VariantStatus } from './types';

// Item 5: the child/sub-tab strip (formerly PRODUCT_TABS — Details/Variants/Purchase
// info/Suppliers/Images/Notes/Documents/History) is gone. Only the primary tabs remain, with
// History promoted here as its own primary tab.
export const MODULE_TABS: TabDef<ModuleTabId>[] = [
  { id: 'variants', label: 'Variant', blurb: 'Variants, stock and the product they belong to.' },
  { id: 'products', label: 'Products', blurb: 'Browse and maintain the product catalogue.' },
  { id: 'purchase-recommend', label: 'Purchase Recommend', blurb: 'Reorder suggestions rolled up across every product.' },
  { id: 'purchase-orders', label: 'Purchase Orders', blurb: 'Raise and track supplier purchase orders.' },
  { id: 'locations', label: 'Location', blurb: 'Where each variant is kept.' },
  { id: 'stocktake', label: 'Stocktake', blurb: 'Plan counts and reconcile counted quantities.' },
  { id: 'adjustments', label: 'Adjustments', blurb: 'Record and review manual stock corrections.' },
  { id: 'suppliers', label: 'Suppliers', blurb: 'Manage supplier records and their product links.' },
  { id: 'payments', label: 'Payments', blurb: 'Track supplier invoices and settlements.' },
  { id: 'history', label: 'History', blurb: 'Every change made across the product catalogue.' },
];

export const QUICK_FILTERS: { id: QuickFilterId; label: string }[] = [
  { id: 'buying-lt-1', label: 'Buy < $1' },
  { id: 'profit-lt-5', label: 'Profit < $5' },
  { id: 'selling-lt-1', label: 'Sell < $1' },
  { id: 'selling-lt-5', label: 'Sell < $5' },
];

/** A row within this fraction above its trigger counts as "near". */
export const NEAR_TRIGGER_RATIO = 1.2;

export const STATUS_STYLES: Record<VariantStatus, { row: string; badge: string; bar: string; label: string }> = {
  below: {
    row: 'bg-inventory-danger/10 hover:bg-inventory-danger/10',
    badge: 'bg-inventory-danger/15 text-inventory-danger-hover border-inventory-danger/30',
    bar: 'bg-inventory-danger',
    label: 'Reorder',
  },
  near: {
    row: 'bg-inventory-warning/8 hover:bg-inventory-warning/10',
    badge: 'bg-inventory-warning/15 text-inventory-warning-ink border-inventory-warning/30',
    bar: 'bg-inventory-accent',
    label: 'Low',
  },
  above: {
    row: 'hover:bg-inventory-surface-hover',
    badge: 'bg-inventory-success/10 text-inventory-success-hover border-inventory-success/30',
    bar: 'bg-inventory-success',
    label: 'OK',
  },
};

export const STATUS_LEGEND: { id: VariantStatus; label: string; hint: string; className: string }[] = [
  { id: 'below', label: 'Below', hint: 'Below trigger', className: 'bg-inventory-danger/15 text-inventory-danger-hover border-inventory-danger/30' },
  { id: 'near', label: 'Near', hint: 'Within 20% of trigger', className: 'bg-inventory-warning/15 text-inventory-warning-ink border-inventory-warning/30' },
  { id: 'above', label: 'Above', hint: 'Above trigger', className: 'bg-inventory-success/10 text-inventory-success-hover border-inventory-success/30' },
];

export const PRODUCT_STATUS_BADGES: Record<string, string> = {
  ACTIVE: 'bg-inventory-success/10 text-inventory-success-hover border-inventory-success/30',
  DRAFT: 'bg-inventory-warning/10 text-inventory-warning-ink border-inventory-warning/30',
  UNLISTED: 'bg-inventory-surface-muted text-inventory-text-muted border-inventory-border',
};

/** SupplierProductStoreListing.status — our own record of the publish, shown on each store card. */
export const LISTING_STATUS_BADGES: Record<string, string> = {
  NOT_LISTED: 'bg-inventory-surface-muted text-inventory-text-subtle border-inventory-border',
  PUBLISHING: 'bg-inventory-secondary/10 text-inventory-secondary border-inventory-secondary/30',
  LISTED: 'bg-inventory-success/10 text-inventory-success-hover border-inventory-success/30',
  FAILED: 'bg-inventory-danger/10 text-inventory-danger-hover border-inventory-danger/30',
};

/** Shopify-style product status — used by the products table's status filter, the bulk "Set
 * status" modal, the Product Details status select, and the store publish/bulk-update status
 * select. `hint` mirrors Shopify's own explanatory copy for each state. */
export const STATUS_OPTIONS: { value: ProductStatusValue; label: string; hint: string }[] = [
  { value: 'ACTIVE', label: 'Active', hint: 'Sell via selected sales channels and markets' },
  { value: 'DRAFT', label: 'Draft', hint: 'Not visible on selected sales channels or markets' },
  { value: 'UNLISTED', label: 'Unlisted', hint: 'Accessible only by direct link' },
];

/** Display label for a status badge — falls back to the raw value for anything unexpected. */
export function productStatusLabel(status: string): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

/** Preset quantity dropdown on each row of the stock adjustment modal, so an admin rarely has to
 * type: every whole number 1-10, then even steps up to 20 — mirrored to negative and positive. */
const ADJUSTMENT_MAGNITUDES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20];
export const ADJUSTMENT_PRESETS = [...ADJUSTMENT_MAGNITUDES.slice().reverse().map((n) => -n), ...ADJUSTMENT_MAGNITUDES];

/** Display labels for InventoryActivity.type — the History tab's type filter and badges. A type
 * not listed here (e.g. one written by a newer feature) is shown as its raw value. */
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  created: 'Created',
  imported: 'Imported',
  details_updated: 'Details updated',
  pricing_updated: 'Pricing updated',
  price_applied: 'Price applied',
  variant_updated: 'Variant updated',
  variant_image_updated: 'Variant image',
  variant_deleted: 'Variant deleted',
  image_added: 'Image added',
  image_removed: 'Image removed',
  status_updated: 'Status updated',
  verified_updated: 'Verified updated',
  omitted_updated: 'Omitted updated',
  store_edited: 'Store edited',
  store_published: 'Store published',
  stock_adjusted: 'Stock adjusted',
  po_received: 'PO received',
  stocktake_completed: 'Stocktake synced',
  order_allocation: 'Order allocation',
  order_stock: 'Order stock',
};

export function activityTypeLabel(type: string): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type;
}
