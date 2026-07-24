'use client';

import { STATUS_BADGE } from './constants';
import { formatCurrency, getShopifyThumbnailUrl } from './utils';
import type { ProductRow } from './types';

type InventoryTableRowProps = {
  product: ProductRow;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRequestDelete: (id: string, title: string) => void;
};

export default function InventoryTableRow({ product, selected, onToggleSelect, onRequestDelete }: InventoryTableRowProps) {
  const badge = STATUS_BADGE[product.status] ?? STATUS_BADGE.DRAFT;

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 ${selected ? 'bg-blue-50/50' : ''}`}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(product.id)}
          className="rounded border-gray-300 text-blue-600 cursor-pointer"
          aria-label={`Select ${product.title}`}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-56">
          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getShopifyThumbnailUrl(product.imageUrl, 50)} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
            {product.tags.length > 0 && (
              <p className="text-xs text-gray-400 truncate">{product.tags.join(', ')}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
          {badge.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{product.totalInventory}</td>
      <td className="px-4 py-3 text-sm text-gray-700">
        <div>{product.soldQuantity}</div>
        <div className="text-xs text-gray-400">{formatCurrency(product.soldAmount)}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{product.store.name}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{product.category ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{product.productType ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {product.salesChannels.length > 0 ? product.salesChannels.map((c) => c.name).join(', ') : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{product.vendor ?? '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            title="Product details"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {product.onlineStoreUrl && (
            <a
              href={product.onlineStoreUrl}
              target="_blank"
              rel="noreferrer"
              title="View product"
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <button
            title="Delete product"
            onClick={() => onRequestDelete(product.id, product.title)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
