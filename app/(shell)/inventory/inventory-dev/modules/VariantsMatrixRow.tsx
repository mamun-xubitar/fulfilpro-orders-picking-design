'use client';

import { memo } from 'react';
import { STATUS_STYLES } from './constants';
import { Pencil, Trash } from './icons';
import { computeVariant, formatCurrencyValue, formatMoney, formatNumber, getSwatch } from './utils';
import type { VariantRow } from './types';

type VariantsMatrixRowProps = {
  variant: VariantRow;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onTriggerChange: (id: string, value: number) => void;
  onAction: (action: string) => void;
};

function VariantsMatrixRow({ variant, selected, onToggleSelect, onTriggerChange, onAction }: VariantsMatrixRowProps) {
  const { available, suggested, stockValue, status } = computeVariant(variant);
  const style = STATUS_STYLES[status];

  return (
    <tr className={`border-b border-gray-100 last:border-0 transition-colors duration-150 ${style.row} ${selected ? 'ring-1 ring-inset ring-blue-300' : ''}`}>
      <td className="relative py-2 pl-4 pr-2">
        <span className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} aria-hidden="true" />
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(variant.id)}
            aria-label={`Select ${variant.sku ?? variant.id}`}
            className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
          />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: getSwatch(variant.colour) }} />
          <span className="whitespace-nowrap text-[13px] font-medium text-gray-900">{variant.colour}</span>
        </label>
      </td>
      <td className="px-2 py-2 text-[13px] text-gray-700">{variant.size}</td>
      <td className="px-2 py-2">
        <span className="block text-[13px] font-medium text-gray-900">{variant.sku ?? '—'}</span>
        <span className="block text-[11px] text-gray-400 tabular-nums">{variant.barcode ?? '—'}</span>
      </td>
      <Num value={formatNumber(variant.stockOnHand)} bold />
      <Num value={formatNumber(variant.allocated)} muted />
      <Num value={formatNumber(available)} className="font-bold text-emerald-700" />
      <Num value={formatNumber(variant.incoming)} muted />
      <Num value={formatNumber(variant.forwardOrders)} muted />
      <td className="px-2 py-2 text-right">
        <input
          type="number"
          min={0}
          value={variant.trigger}
          onChange={(e) => onTriggerChange(variant.id, Math.max(0, Number(e.target.value) || 0))}
          aria-label={`Reorder trigger for ${variant.sku ?? variant.id}`}
          className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-right text-[13px] tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </td>
      <Num value={formatNumber(suggested)} className="font-bold text-blue-700" />
      <td className="px-2 py-2 text-center">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
          {style.label}
        </span>
      </td>
      <Num value={formatMoney(variant.buyPrice)} />
      <Num value={formatMoney(variant.sellPrice)} />
      <Num value={formatCurrencyValue(stockValue)} bold />
      <td className="py-2 pl-2 pr-4">
        <div className="flex items-center justify-end gap-1">
          <RowAction label={`Edit ${variant.sku ?? 'variant'}`} onClick={() => onAction('Editing a variant')}>
            <Pencil className="h-3.5 w-3.5" />
          </RowAction>
          <RowAction label={`Delete ${variant.sku ?? 'variant'}`} danger onClick={() => onAction('Deleting a variant')}>
            <Trash className="h-3.5 w-3.5" />
          </RowAction>
        </div>
      </td>
    </tr>
  );
}

function Num({ value, bold, muted, className }: { value: string; bold?: boolean; muted?: boolean; className?: string }) {
  return (
    <td
      className={`px-2 py-2 text-right text-[13px] tabular-nums ${className ?? ''} ${
        className ? '' : bold ? 'font-bold text-gray-900' : muted ? 'text-gray-500' : 'text-gray-700'
      }`}
    >
      {value}
    </td>
  );
}

function RowAction({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded-lg border border-gray-300 bg-white p-1.5 transition-colors duration-150 cursor-pointer ${
        danger ? 'text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

export default memo(VariantsMatrixRow);
