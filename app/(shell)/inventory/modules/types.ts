export type ApiResponse<T> = { success: boolean; message: string; data: T };

export type StoreOption = { id: string; name: string; storeDomain?: string };

export type ProductStatusValue = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export type ProductRow = {
  id: string;
  title: string;
  handle: string | null;
  vendor: string | null;
  productType: string | null;
  category: string | null;
  status: ProductStatusValue;
  tags: string[];
  imageUrl: string | null;
  onlineStoreUrl: string | null;
  salesChannels: string[];
  totalInventory: number;
  soldQuantity: number;
  soldAmount: number;
  store: { id: string; name: string };
  shopifyUpdatedAt: string | null;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export type ProductSyncJob = {
  id: string;
  status: string;
  storeIds: string[] | null;
  totalStores: number;
  totalFetched: number;
  totalCreated: number;
  totalUpdated: number;
  failedStores: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
