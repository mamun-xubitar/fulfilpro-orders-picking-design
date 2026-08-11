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

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  errors?: string[];
  data: T;
};

export type TrackingSyncJob = {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | string;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export type OrderSearchOption = { id: string; number: number; customer: string | null };

export type CarrierOption = { code: number; name: string };

export type SingleRegisterModalState = {
  search: string;
  results: OrderSearchOption[];
  searching: boolean;
  dropdownOpen: boolean;
  selectedOrder: OrderSearchOption | null;
  trackingNumber: string;
  suggesting: boolean;
  submitting: boolean;
  error: string;
  carrierCode: number | null;
  carrierName: string;
  carrierSearch: string;
  carrierResults: CarrierOption[];
  carrierSearching: boolean;
  carrierDropdownOpen: boolean;
  carrierAutoDetected: boolean;
};
