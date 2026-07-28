export type ApiResponse<T> = { success: boolean; message: string; data: T };

export type SupplierRow = {
  id: string;
  name: string;
  contactEmail: string | null;
  poEmail: string;
  description: string | null;
  productCount: number;
  collectionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupplierForm = {
  name: string;
  poEmail: string;
  contactEmail: string;
  description: string;
};

export const EMPTY_SUPPLIER_FORM: SupplierForm = {
  name: '',
  poEmail: '',
  contactEmail: '',
  description: '',
};

export type StoreOption = { id: string; name: string; storeDomain: string };

export type ConnectionProduct = {
  id: string;
  productId: string;
  title: string;
  storeName: string;
  linkedAt: string;
};

export type ConnectionCollection = {
  id: string;
  storeId: string;
  storeName: string;
  collectionId: string;
  title: string;
  handle: string | null;
};

export type SupplierConnections = { products: ConnectionProduct[]; collections: ConnectionCollection[] };

export type LiveCollection = { id: string; title: string; handle: string | null };

export type ProductSearchResult = {
  id: string;
  title: string;
  store: { id: string; name: string };
};
