'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import type {
  ApiResponse,
  ConnectionCollection,
  LiveCollection,
  ProductSearchResult,
  StoreOption,
  SupplierConnections,
  SupplierRow,
} from '../types';

export function useSupplierConnections() {
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [connections, setConnections] = useState<SupplierConnections>({ products: [], collections: [] });
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');

  const [liveCollections, setLiveCollections] = useState<LiveCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const { searchInput: productSearchInput, setSearchInput: setProductSearchInput, search: productSearch } = useDebouncedSearch('', 300);
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);

  const { request: requestLink, loading: linking } = useRequest();

  useEffect(() => {
    fetch('/api/inventory/products/form-data')
      .then((res) => res.json())
      .then((json: ApiResponse<{ stores: StoreOption[] }>) => {
        if (json.success) setStores(json.data.stores);
      })
      .catch(() => {});
  }, []);

  const loadConnections = (supplierId: string) => {
    setConnectionsLoading(true);
    fetch(`/api/inventory/suppliers/${supplierId}/connections`)
      .then((res) => res.json())
      .then((json: ApiResponse<SupplierConnections>) => {
        if (json.success) setConnections(json.data);
      })
      .catch(() => {})
      .finally(() => setConnectionsLoading(false));
  };

  const open = (row: SupplierRow) => {
    setSupplier(row);
    setStoreId('');
    setLiveCollections([]);
    setProductSearchInput('');
    setProductResults([]);
    loadConnections(row.id);
  };

  const close = () => {
    setSupplier(null);
    setConnections({ products: [], collections: [] });
  };

  useEffect(() => {
    const loadCollections = async () => {
      if (!storeId) {
        setLiveCollections([]);
        return;
      }
      setCollectionsLoading(true);
      try {
        const res = await fetch(`/api/inventory/collections?storeId=${storeId}`);
        const json = (await res.json()) as ApiResponse<{ collections: LiveCollection[] }>;
        if (json.success) setLiveCollections(json.data.collections);
      } catch {
        setLiveCollections([]);
      } finally {
        setCollectionsLoading(false);
      }
    };
    void loadCollections();
  }, [storeId]);

  useEffect(() => {
    const ctrl = new AbortController();
    const loadProducts = async () => {
      if (!storeId || !productSearch) {
        setProductResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/inventory/products?search=${encodeURIComponent(productSearch)}&storeId=${storeId}&pageSize=10`, { signal: ctrl.signal });
        const json = (await res.json()) as ApiResponse<{ products: ProductSearchResult[] }>;
        if (json.success) setProductResults(json.data.products);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setProductResults([]);
      }
    };
    void loadProducts();
    return () => ctrl.abort();
  }, [storeId, productSearch]);

  const linkedCollectionIds = new Set(connections.collections.filter((c) => c.storeId === storeId).map((c) => c.collectionId));
  const linkedProductIds = new Set(connections.products.map((p) => p.productId));

  const toggleCollection = (collection: LiveCollection) => {
    if (!supplier) return;
    const isLinked = linkedCollectionIds.has(collection.id);
    void requestLink({
      url: `/api/inventory/suppliers/${supplier.id}/connections`,
      method: isLinked ? 'DELETE' : 'POST',
      showToast: false,
      data: { type: 'collection', storeId, collectionId: collection.id, title: collection.title, handle: collection.handle },
      onSuccess: () => loadConnections(supplier.id),
    });
  };

  const linkProduct = (product: ProductSearchResult) => {
    if (!supplier) return;
    void requestLink({
      url: `/api/inventory/suppliers/${supplier.id}/connections`,
      method: 'POST',
      showToast: false,
      data: { type: 'product', productId: product.id },
      onSuccess: () => loadConnections(supplier.id),
    });
  };

  const unlinkProduct = (productId: string) => {
    if (!supplier) return;
    void requestLink({
      url: `/api/inventory/suppliers/${supplier.id}/connections`,
      method: 'DELETE',
      showToast: false,
      data: { type: 'product', productId },
      onSuccess: () => loadConnections(supplier.id),
    });
  };

  const unlinkCollection = (collection: ConnectionCollection) => {
    if (!supplier) return;
    void requestLink({
      url: `/api/inventory/suppliers/${supplier.id}/connections`,
      method: 'DELETE',
      showToast: false,
      data: { type: 'collection', storeId: collection.storeId, collectionId: collection.collectionId },
      onSuccess: () => loadConnections(supplier.id),
    });
  };

  return {
    supplier,
    connections,
    connectionsLoading,
    stores,
    storeId,
    setStoreId,
    liveCollections,
    collectionsLoading,
    linkedCollectionIds,
    linkedProductIds,
    productSearchInput,
    setProductSearchInput,
    productResults,
    linking,
    open,
    close,
    toggleCollection,
    linkProduct,
    unlinkProduct,
    unlinkCollection,
  };
}
