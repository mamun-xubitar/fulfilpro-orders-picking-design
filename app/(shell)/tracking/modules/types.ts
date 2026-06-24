import type { TrackingRow } from '@/models/tracking.model.server';
export type { TrackingRow };

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
};
