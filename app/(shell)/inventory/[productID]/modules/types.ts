export type ApiResponse<T> = { success: boolean; message: string; data: T };

export type ProductImage = { id: string; url: string; altText: string | null };
export type SalesChannel = { id: string; name: string };
export type OptionValue = { name: string; value: string };
export type LocationQuantity = { locationId: string; locationName: string; available: number; onHand: number };

export type InventoryPolicyValue = 'DENY' | 'CONTINUE';

export type VariantDetail = {
  id: string;
  shopifyId: string;
  title: string | null;
  sku: string | null;
  price: number;
  cost: number | null;
  inventoryItemId: string | null;
  inventoryQuantity: number;
  inventoryTracked: boolean;
  inventoryPolicy: InventoryPolicyValue;
  imageUrl: string | null;
  optionValues: OptionValue[];
  position: number;
  soldQuantity: number;
  locationQuantities: LocationQuantity[];
};

export type ProductStatusValue = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export type ProductCollection = { id: string; title: string; handle: string | null };

export type ProductDetail = {
  id: string;
  storeId: string;
  shopifyId: string;
  title: string;
  handle: string | null;
  vendor: string | null;
  productType: string | null;
  category: string | null;
  categoryId: string | null;
  status: ProductStatusValue;
  tags: string[];
  imageUrl: string | null;
  descriptionHtml: string | null;
  images: ProductImage[];
  onlineStoreUrl: string | null;
  salesChannels: SalesChannel[];
  collections: ProductCollection[];
  totalInventory: number;
  store: { id: string; name: string; storeDomain: string };
  variants: VariantDetail[];
  updatedAt: string;
};

export type LocationOption = { id: string; name: string };

export type SiblingProduct = {
  id: string;
  title: string;
  onlineStoreUrl: string | null;
  store: { id: string; name: string };
};

export type ProductDetailResponse = {
  product: ProductDetail;
  locations: LocationOption[];
  siblings: SiblingProduct[];
  stale: boolean;
};

export type TaxonomyCategory = { id: string; name: string; fullName: string; isLeaf: boolean };

export type ColorGroup = {
  key: string;
  label: string;
  variantIds: string[];
  totalStock: number;
  totalSold: number;
  allContinueSelling: boolean;
};

export type ProductFieldsPayload = {
  title?: string;
  descriptionHtml?: string;
  tags?: string[];
  productType?: string;
  status?: ProductStatusValue;
  category?: { id: string; name: string } | null;
};

export type VariantFieldsPayload = {
  id: string;
  price?: number;
  inventoryPolicy?: InventoryPolicyValue;
  cost?: number | null;
};

export type GalleryEntryKind = 'color' | 'hero' | 'other';

export type GalleryEntry = {
  key: string;
  url: string;
  altText: string | null;
  kind: GalleryEntryKind;
  colorKey: string | null;
  label: string;
};

export type SizeCount = { size: string; quantity: number };
