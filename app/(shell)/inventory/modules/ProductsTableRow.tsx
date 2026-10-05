'use client';

import { truncate } from '@/lib/utils/common';
import { PRODUCT_STATUS_BADGES } from './constants';
import { useInventoryAccess } from './InventoryAccess';
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
  onToggleOmit: (id: string, omitted: boolean) => void;
};

export default function ProductsTableRow({ product, selected, onToggleSelect, onView, onRequestDelete, onToggleOmit }: ProductsTableRowProps) {
  const { canEdit } = useInventoryAccess();
  const badge = PRODUCT_STATUS_BADGES[product.status] ?? PRODUCT_STATUS_BADGES.DRAFT;

  return (
    <tr className={`border-b border-inventory-divider last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover ${product.omitted ? 'opacity-50' : ''} ${selected ? 'bg-inventory-secondary/10/50' : ''}`}>
      <td className="px-2 py-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(product.id)}
          className="h-3 w-3 rounded border-inventory-border-strong text-inventory-secondary cursor-pointer"
          aria-label={`Select ${product.name}`}
        />
      </td>
      <td className="px-2 py-1">
        <div className="flex min-w-44 items-center gap-2">
          <Thumb product={product} />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium leading-tight text-inventory-text" title={product.name}>
              {truncate(product.name, 50)}
            </p>
            <p className="truncate text-[10px] text-inventory-text-subtle">{product.itemNo}</p>
          </div>
        </div>
      </td>
      <td className="px-2 py-1 text-[11px] text-inventory-text-muted">
        {product.suppliers.length === 0 ? (
          '—'
        ) : (
          <>
            {product.suppliers[0].name}
            {product.suppliers.length > 1 && <span className="ml-1 text-[10px] text-inventory-text-subtle">+{product.suppliers.length - 1}</span>}
          </>
        )}
      </td>
      <td className="px-2 py-1 text-[11px] text-inventory-text-muted">{product.brand || '—'}</td>
      <td className="px-2 py-1 text-[11px] text-inventory-text-muted" title={product.category || undefined}>
        {product.category ? categoryLeaf(product.category) : '—'}
      </td>
      <td className="px-2 py-1 text-[11px] text-inventory-text-muted">{product.sku || '—'}</td>
      <td className="px-2 py-1 text-center">
        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-[6px] py-[1px] text-[10px] font-semibold leading-none ${badge}`}>
          {product.status.charAt(0) + product.status.slice(1).toLowerCase()}
        </span>
      </td>
      <td className="px-2 py-1 text-center">
        <VerifiedBadge verified={product.verified} />
      </td>
      <td className="px-2 py-1 text-right text-[11px] tabular-nums text-inventory-text-muted">{product.variants.length}</td>
      <td className="px-2 py-1 text-right text-[11px] tabular-nums text-inventory-text-muted">{formatNumber(totalStockOf(product))}</td>
      <td className="px-2 py-1 text-right text-[11px] tabular-nums text-inventory-success-hover">{formatNumber(availableStockOf(product))}</td>
      <td className="px-2 py-1 text-right text-[11px] tabular-nums font-semibold text-inventory-text">{formatCurrencyValue(stockValueOf(product))}</td>
      <td className="px-2 py-1 text-[11px] text-inventory-text-subtle">{formatDate(product.createdAt)}</td>
      <td className="px-2 py-1">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title="View product"
            onClick={() => onView(product.id)}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
          >
            <Eye className="h-3 w-3" />
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                title="Delete product"
                onClick={() => onRequestDelete(product.id, product.name)}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-danger/10 hover:text-inventory-danger-hover cursor-pointer"
              >
                <Trash className="h-3 w-3" />
              </button>
              <OmitSwitch omitted={product.omitted} onChange={(next) => onToggleOmit(product.id, next)} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/** Item 19 — hides a product from the list (and the record stepper) without deleting it. */
function OmitSwitch({ omitted, onChange }: { omitted: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={omitted}
      title={omitted ? 'Restore to list' : 'Omit from list'}
      onClick={() => onChange(!omitted)}
      className={`relative flex h-[14px] w-[24px] shrink-0 items-center rounded-full transition-colors duration-150 cursor-pointer ${omitted ? 'bg-inventory-accent' : 'bg-inventory-border-strong'}`}
    >
      <span className={`h-[10px] w-[10px] rounded-full bg-inventory-surface shadow-sm transition-transform duration-150 ${omitted ? 'translate-x-[12px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}

function Thumb({ product }: { product: ProductRecord }) {
  const image = product.images[0];
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image.url} alt="" className="h-7 w-7 shrink-0 rounded-[6px] border border-inventory-border object-cover" />;
  }
  return (
    <span
      className="h-7 w-7 shrink-0 rounded-[6px] border border-inventory-border"
      style={{ backgroundColor: product.colours[0]?.color ?? getSwatch(product.variants[0]?.colour ?? '') }}
      aria-hidden="true"
    />
  );
}
