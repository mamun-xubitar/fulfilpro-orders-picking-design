import type { ProductStatusValue } from './types';

export const STATUS_OPTIONS: Array<{ value: ProductStatusValue; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const STATUS_BADGE: Record<ProductStatusValue, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-50 text-green-700 border-green-200' },
  DRAFT: { label: 'Draft', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  ARCHIVED: { label: 'Archived', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const COLOR_OPTION_NAMES = ['color', 'colour'];
export const SIZE_OPTION_NAMES = ['size'];

export const LOW_STOCK_THRESHOLD = 10;
export const OUT_OF_STOCK_THRESHOLD = 1;
