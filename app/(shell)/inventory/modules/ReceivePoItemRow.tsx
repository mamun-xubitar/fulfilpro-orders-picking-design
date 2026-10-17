'use client';

import { formatColourName } from '@/lib/inventory/colour';
import type { LocationOption } from './hooks/useLocations';
import type { PurchaseOrderRecord } from './types';

export const RECEIVE_GRID_COLS = 'grid-cols-[1.25rem_minmax(0,1fr)_6rem_4.5rem_3rem_3rem_4rem_4.5rem_9rem_5rem_7rem_5rem]';

export const RECEIVE_SELECT_CLASS =
  'h-[22px] min-w-0 cursor-pointer rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring';

type ReceivePoItemRowProps = {
  item: PurchaseOrderRecord['items'][number];
  locations: LocationOption[];
  selected: boolean;
  locationId: string;
  qty: string;
  cost: string;
  remark: string;
  qtyError: string | null;
  onToggle: () => void;
  onLocationChange: (locationId: string) => void;
  onQtyChange: (value: string) => void;
  onCostChange: (value: string) => void;
  onRemarkChange: (value: string) => void;
};

export default function ReceivePoItemRow({ item, locations, selected, locationId, qty, cost, remark, qtyError, onToggle, onLocationChange, onQtyChange, onCostChange, onRemarkChange }: ReceivePoItemRowProps) {
  const remaining = Math.max(0, item.quantity - item.receivedQuantity);
  return (
    <div className="px-2 py-1 transition-colors duration-150 hover:bg-inventory-surface-hover">
      <div className={`grid ${RECEIVE_GRID_COLS} items-center gap-2 text-[11px] leading-none`}>
        <input
          type="checkbox"
          checked={selected}
          disabled={remaining === 0}
          onChange={onToggle}
          aria-label={`Select ${item.variantTitle}`}
          className="h-3 w-3 cursor-pointer accent-inventory-primary disabled:cursor-not-allowed"
        />
        <span title={item.variantTitle} className="min-w-0 truncate whitespace-nowrap text-inventory-text-muted">{item.variantTitle}</span>
        <span className="truncate text-inventory-text-subtle">{item.sku ?? '—'}</span>
        <span className="truncate text-inventory-text-subtle">{item.colour ? formatColourName(item.colour) : '—'}</span>
        <span className="truncate text-inventory-text-subtle">{item.size || '—'}</span>
        <span className="text-right tabular-nums text-inventory-text-subtle">{item.quantity}</span>
        <span className="text-right tabular-nums text-inventory-text-subtle">{item.receivedQuantity}</span>
        <span className="text-right tabular-nums font-medium text-inventory-text-muted">{remaining}</span>
        <input
          type="text"
          value={remark}
          onChange={(e) => onRemarkChange(e.target.value)}
          placeholder="Remark"
          aria-label={`Remark for ${item.variantTitle}`}
          className="h-[22px] w-full min-w-0 rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] uppercase leading-none outline-none placeholder:normal-case placeholder:text-inventory-text-subtle focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
        />
        <div className="relative w-full min-w-0">
          <span className="pointer-events-none absolute inset-y-0 left-[6px] flex items-center text-[11px] text-inventory-text-subtle">$</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={cost}
            onChange={(e) => onCostChange(e.target.value)}
            aria-label={`Unit cost for ${item.variantTitle}`}
            className="h-[22px] w-full rounded-[7px] border border-inventory-border-strong pl-[14px] pr-[10px] text-right text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
          />
        </div>
        <select
          value={locationId}
          onChange={(e) => onLocationChange(e.target.value)}
          aria-label={`Location for ${item.variantTitle}`}
          className={`w-full ${RECEIVE_SELECT_CLASS}`}
        >
          <option value="">Select…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <div className="w-full min-w-0">
          <input
            type="number"
            min={0}
            max={remaining}
            step={1}
            value={qty}
            onChange={(e) => onQtyChange(e.target.value)}
            aria-label={`Receive quantity for ${item.variantTitle}`}
            aria-invalid={qtyError !== null}
            title={qtyError ?? `0 to ${remaining}`}
            className={`h-[22px] w-full rounded-[7px] border pl-[6px] pr-[10px] text-right text-[11px] leading-none outline-none focus:ring-2 ${qtyError ? 'border-inventory-danger/45 bg-inventory-danger/8 focus:border-inventory-danger focus:ring-inventory-danger/20' : 'border-inventory-border-strong focus:border-inventory-primary focus:ring-inventory-primary-ring'}`}
          />
        </div>
      </div>
      {qtyError && <p className="mt-1 text-right text-[10px] leading-tight text-inventory-danger">{qtyError}</p>}
    </div>
  );
}
