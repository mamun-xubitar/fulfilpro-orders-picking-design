'use client';

import { ModalShell } from '@/components/ModalShell';
import type { useSupplierConnections } from './hooks/useSupplierConnections';

type Props = {
  connections: ReturnType<typeof useSupplierConnections>;
  onClose: () => void;
};

export default function SupplierConnectionsModal({ connections: c, onClose }: Props) {
  if (!c.supplier) return null;

  return (
    <ModalShell title={`Connections — ${c.supplier.name}`} onClose={onClose} wide>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
          <select
            value={c.storeId}
            onChange={(e) => c.setStoreId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          >
            <option value="">Select a store...</option>
            {c.stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name || store.storeDomain}</option>
            ))}
          </select>
        </div>

        {c.storeId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Collections</label>
            {c.collectionsLoading ? (
              <p className="text-sm text-gray-400">Loading collections...</p>
            ) : c.liveCollections.length === 0 ? (
              <p className="text-sm text-gray-400">No collections found for this store.</p>
            ) : (
              <ul className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {c.liveCollections.map((collection) => (
                  <li key={collection.id} className="px-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.linkedCollectionIds.has(collection.id)}
                        onChange={() => c.toggleCollection(collection)}
                        disabled={c.linking}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      {collection.title}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Products</label>
          <input
            type="text"
            value={c.productSearchInput}
            onChange={(e) => c.setProductSearchInput(e.target.value)}
            placeholder={c.storeId ? 'Search products by title...' : 'Select a store first'}
            disabled={!c.storeId}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:cursor-not-allowed mb-2"
          />
          {c.productResults.length > 0 && (
            <ul className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 mb-3">
              {c.productResults.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => c.linkProduct(product)}
                    disabled={c.linkedProductIds.has(product.id) || c.linking}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {product.title}
                    {c.linkedProductIds.has(product.id) && <span className="text-gray-400"> · already linked</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="block text-xs font-medium text-gray-500 mb-1">Linked products</label>
          {c.connectionsLoading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : c.connections.products.length === 0 ? (
            <p className="text-sm text-gray-400">No products linked yet.</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {c.connections.products.map((product) => (
                <li key={product.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700">
                    {product.title} <span className="text-gray-400">· {product.storeName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => c.unlinkProduct(product.productId)}
                    disabled={c.linking}
                    className="text-xs text-red-600 hover:text-red-700 cursor-pointer disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {c.connections.collections.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Linked collections</label>
            <ul className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {c.connections.collections.map((collection) => (
                <li key={collection.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700">
                    {collection.title} <span className="text-gray-400">· {collection.storeName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => c.unlinkCollection(collection)}
                    disabled={c.linking}
                    className="text-xs text-red-600 hover:text-red-700 cursor-pointer disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
