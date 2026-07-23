import type { Pagination } from './types';

export const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
  hasPrev: false,
  hasNext: false,
};

export const SEARCH_FIELDS = [
  { value: 'title', label: 'Title' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'tag', label: 'Tag' },
];

export const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-50 text-green-700 border-green-200' },
  DRAFT: { label: 'Draft', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  ARCHIVED: { label: 'Archived', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const STOCK_LEVEL_OPTIONS = [
  { value: '', label: 'All Stock Levels' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'not_tracked', label: 'Not Tracked' },
];

export const COLUMNS: Array<{ key: string; label: string; sortable: boolean }> = [
  { key: 'title', label: 'Product', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'totalInventory', label: 'Inventory', sortable: true },
  { key: 'soldQuantity', label: 'Sold', sortable: true },
  { key: 'store', label: 'Store', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'productType', label: 'Type', sortable: true },
  { key: 'salesChannels', label: 'Channels', sortable: false },
  { key: 'vendor', label: 'Vendor', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];
