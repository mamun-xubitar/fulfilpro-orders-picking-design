import type { TrackingRow } from '@/models/tracking.model.server';
export type { TrackingRow };

export type StoreOption = { id: string; name: string };

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export type BulkRegisterModalState = {
  count: number | null;
  loading: boolean;
  submitting: boolean;
  error: string;
  dateFrom: string;
  dateTo: string;
  storeIds: string[];
  calendarNav: { year: number; month: number };
  hoverDate: string | null;
  storeDropdownOpen: boolean;
};
