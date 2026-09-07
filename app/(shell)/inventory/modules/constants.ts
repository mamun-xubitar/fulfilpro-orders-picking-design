import type { ModuleTabId, ProductStatusValue, ProductTabId, QuickFilterId, TabDef, VariantStatus } from './types';

export const MODULE_TABS: TabDef<ModuleTabId>[] = [
  { id: 'products', label: 'Products', blurb: 'Browse and maintain the product catalogue.' },
  { id: 'purchase-recommend', label: 'Purchase Recommend', blurb: 'Reorder suggestions rolled up across every product.' },
  { id: 'purchase-orders', label: 'Purchase Orders', blurb: 'Raise and track supplier purchase orders.' },
  { id: 'receiving', label: 'Receiving', blurb: 'Book incoming stock against open purchase orders.' },
  { id: 'stocktake', label: 'Stocktake', blurb: 'Plan counts and reconcile counted quantities.' },
  { id: 'adjustments', label: 'Adjustments', blurb: 'Record and review manual stock corrections.' },
  { id: 'suppliers', label: 'Suppliers', blurb: 'Manage supplier records and their product links.' },
  { id: 'payments', label: 'Payments', blurb: 'Track supplier invoices and settlements.' },
  { id: 'reports', label: 'Reports', blurb: 'Stock valuation, movement and margin reporting.' },
  { id: 'dashboard', label: 'Dashboard', blurb: 'Headline inventory metrics at a glance.' },
];

export const PRODUCT_TABS: TabDef<ProductTabId>[] = [
  { id: 'details', label: 'Product Details', blurb: 'Core product record.' },
  { id: 'variants', label: 'Variants / Stock', blurb: 'Full-screen variant and stock editor.' },
  { id: 'purchase-info', label: 'Purchase Info', blurb: 'Lead times, minimum order quantities and pack sizes.' },
  { id: 'suppliers', label: 'Suppliers', blurb: 'Suppliers who can fulfil this product.' },
  { id: 'images', label: 'Images', blurb: 'Manage the full image library for this product.' },
  { id: 'notes', label: 'Notes', blurb: 'Internal notes against this product.' },
  { id: 'documents', label: 'Documents', blurb: 'Spec sheets, certificates and artwork files.' },
  { id: 'history', label: 'History', blurb: 'Every change made to this product record.' },
];

export const QUICK_FILTERS: { id: QuickFilterId; label: string }[] = [
  { id: 'buying-lt-1', label: 'Buying < $1.00' },
  { id: 'profit-lt-5', label: 'Profit < $5.00' },
  { id: 'selling-lt-1', label: 'Selling < $1.00' },
  { id: 'selling-lt-5', label: 'Selling < $5.00' },
];

/** A row within this fraction above its trigger counts as "near". */
export const NEAR_TRIGGER_RATIO = 1.2;

export const STATUS_STYLES: Record<VariantStatus, { row: string; badge: string; bar: string; label: string }> = {
  below: {
    row: 'bg-red-50/70 hover:bg-red-50',
    badge: 'bg-red-100 text-red-700 border-red-200',
    bar: 'bg-red-500',
    label: 'Reorder',
  },
  near: {
    row: 'bg-amber-50/70 hover:bg-amber-50',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    bar: 'bg-amber-500',
    label: 'Low',
  },
  above: {
    row: 'hover:bg-gray-50',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bar: 'bg-emerald-500',
    label: 'OK',
  },
};

export const STATUS_LEGEND: { id: VariantStatus; label: string; className: string }[] = [
  { id: 'below', label: 'Below trigger', className: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'near', label: 'Within 20% of trigger', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'above', label: 'Above trigger', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export const PRODUCT_STATUS_BADGES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  ARCHIVED: 'bg-gray-50 text-gray-600 border-gray-200',
};

/** SupplierProductStoreListing.status — our own record of the publish, shown on each store card. */
export const LISTING_STATUS_BADGES: Record<string, string> = {
  NOT_LISTED: 'bg-gray-50 text-gray-500 border-gray-200',
  PUBLISHING: 'bg-blue-50 text-blue-700 border-blue-200',
  LISTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};

/** The products table's status filter and bulk "Set status" modal. */
export const STATUS_OPTIONS: { value: ProductStatusValue; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

/** Preset quantity dropdown on each row of the stock adjustment modal, so an admin rarely has to
 * type: every whole number 1-10, then even steps up to 20 — mirrored to negative and positive. */
const ADJUSTMENT_MAGNITUDES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20];
export const ADJUSTMENT_PRESETS = [...ADJUSTMENT_MAGNITUDES.slice().reverse().map((n) => -n), ...ADJUSTMENT_MAGNITUDES];
