'use client';

import { truncate } from '@/lib/utils/common';
import { PRODUCT_STATUS_BADGES } from './constants';
import { VerifiedBadge } from './ProductFieldsPanel';
import { Eye, Trash } from './icons';
import { availableStockOf, stockValueOf, totalStockOf } from './hooks/useProductsTable';
import { categoryLeaf, formatCurrencyValue, formatDate, formatNumber, getSwatch } from './utils';
import type { ProductRecord } from './types';

type ProductsTableRowProps = {
  product: ProductRecord;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onView: (id: string) => void;
  onRequestDelete: (id: string, name: string) => void;
};

export default function ProductsTableRow({ product, selected, onToggleSelect, onView, onRequestDelete }: ProductsTableRowProps) {
  const badge = PRODUCT_STATUS_BADGES[product.status] ?? PRODUCT_STATUS_BADGES.DRAFT;

  return (
    <tr className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${selected ? 'bg-blue-50/50' : ''}`}>
      <td className="px-2 py-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(product.id)}
          className="h-3 w-3 rounded border-gray-300 text-blue-600 cursor-pointer"
          aria-label={`Select ${product.name}`}
        />
      </td>
      <td className="px-2 py-1">
        <div className="flex min-w-44 items-center gap-2">
          <Thumb product={product} />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium leading-tight text-gray-900" title={product.name}>
              {truncate(product.name, 50)}
            </p>
            <p className="truncate text-[10px] text-gray-400">{product.itemNo}</p>
          </div>
        </div>
      </td>
      <td className="px-2 py-1 text-[11px] text-gray-700">
        {product.suppliers.length === 0 ? (
          '—'
        ) : (
          <>
            {product.suppliers[0].name}
            {product.suppliers.length > 1 && <span className="ml-1 text-[10px] text-gray-400">+{product.suppliers.length - 1}</span>}
          </>
        )}
      </td>
      <td className="px-2 py-1 text-[11px] text-gray-700">{product.brand || '—'}</td>
      <td className="px-2 py-1 text-[11px] text-gray-700" title={product.category || undefined}>
        {product.category ? categoryLeaf(product.category) : '—'}
      </td>
      <td className="px-2 py-1 text-[11px] text-gray-700">{product.sku || '—'}</td>
      <td className="px-2 py-1 text-center">
        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-[6px] py-[1px] text-[10px] font-semibold leading-none ${badge}`}>
          {product.status.charAt(0) + product.status.slice(1).toLowerCase()}
        </span>
      </td>
      <td className="px-2 py-1 text-center">
        <VerifiedBadge verified={product.verified} />
      </td>
      <td className="px-2 py-1 text-right text-[11px] tabular-nums text-gray-700">{product.variants.length}</td>
      <td className="px-2 py-1 text-right text-[11px] tabular-nums text-gray-700">{formatNumber(totalStockOf(product))}</td>
      <td className="px-2 py-1 text-right text-[11px] tabular-nums text-emerald-700">{formatNumber(availableStockOf(product))}</td>
      <td className="px-2 py-1 text-right text-[11px] tabular-nums font-semibold text-gray-900">{formatCurrencyValue(stockValueOf(product))}</td>
      <td className="px-2 py-1 text-[11px] text-gray-500">{formatDate(product.createdAt)}</td>
      <td className="px-2 py-1">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title="View product"
            onClick={() => onView(product.id)}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <Eye className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Delete product"
            onClick={() => onRequestDelete(product.id, product.name)}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 cursor-pointer"
          >
            <Trash className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function Thumb({ product }: { product: ProductRecord }) {
  const image = product.images[0];
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image.url} alt="" className="h-7 w-7 shrink-0 rounded-[6px] border border-gray-200 object-cover" />;
  }
  return (
    <span
      className="h-7 w-7 shrink-0 rounded-[6px] border border-gray-200"
      style={{ backgroundColor: product.colours[0]?.color ?? getSwatch(product.variants[0]?.colour ?? '') }}
      aria-hidden="true"
    />
  );
}
