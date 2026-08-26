'use client';

import { memo } from 'react';
import { ColourCell, Num, NumCell, RowAction, SizeCell, SkuCell } from './VariantsMatrixCells';
import { STATUS_STYLES } from './constants';
import { Check, Close, Pencil, Trash } from './icons';
import { computeVariant, formatCurrencyValue, formatMoney, formatNumber } from './utils';
import type { ColourOption, VariantRow } from './types';

type VariantsMatrixRowProps = {
  variant: VariantRow;
  selected: boolean;
  /** On: every stored cell in this row is an input. Computed cells stay derived. */
  editing: boolean;
  swatch: string;
  colours: ColourOption[];
  sizes: string[];
  onToggleSelect: (id: string) => void;
  onFieldChange: (id: string, patch: Partial<VariantRow>) => void;
  onStartEdit: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (variant: VariantRow) => void;
};

function VariantsMatrixRow({
  variant,
  selected,
  editing,
  swatch,
  colours,
  sizes,
  onToggleSelect,
  onFieldChange,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}: VariantsMatrixRowProps) {
  const { available, suggested, stockValue, status } = computeVariant(variant);
  const style = STATUS_STYLES[status];
  const name = variant.sku ?? variant.id;
  const set = (patch: Partial<VariantRow>) => onFieldChange(variant.id, patch);

  return (
    <tr className={`border-b border-gray-100 last:border-0 transition-colors duration-150 ${style.row} ${selected ? 'ring-1 ring-inset ring-blue-300' : ''}`}>
      <td className="relative py-2 pl-4 pr-2">
        <span className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} aria-hidden="true" />
        {/* A label wraps the checkbox only when the cell is read-only — wrapping a
            select would let a click on it toggle the row selection instead. */}
        {editing ? (
          <div className="flex items-center gap-2">
            <SelectCheckbox name={name} selected={selected} onToggleSelect={() => onToggleSelect(variant.id)} />
            <ColourCell value={variant.colour} colours={colours} swatch={swatch} label="Colour" onChange={(colour) => set({ colour })} />
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2">
            <SelectCheckbox name={name} selected={selected} onToggleSelect={() => onToggleSelect(variant.id)} />
            <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: swatch }} />
            <span className="whitespace-nowrap text-[13px] font-medium text-gray-900">{variant.colour}</span>
          </label>
        )}
      </td>

      {editing ? (
        <SizeCell value={variant.size} sizes={sizes} label="Size" onChange={(size) => set({ size })} />
      ) : (
        <td className="px-2 py-2 text-[13px] text-gray-700">{variant.size}</td>
      )}

      {editing ? (
        <SkuCell
          sku={variant.sku}
          barcode={variant.barcode}
          onChangeSku={(sku) => set({ sku })}
          onChangeBarcode={(barcode) => set({ barcode })}
        />
      ) : (
        <td className="px-2 py-2">
          <span className="block text-[13px] font-medium text-gray-900">{variant.sku ?? '—'}</span>
          <span className="block text-[11px] text-gray-400 tabular-nums">{variant.barcode ?? '—'}</span>
        </td>
      )}

      {editing ? (
        <NumCell value={variant.stockOnHand} label={`Stock on hand for ${name}`} onChange={(stockOnHand) => set({ stockOnHand })} />
      ) : (
        <Num value={formatNumber(variant.stockOnHand)} bold />
      )}
      <Num value={formatNumber(variant.allocated)} muted />

      <Num value={formatNumber(available)} className="font-bold text-emerald-700" />

      <Num value={formatNumber(variant.incoming)} muted />
      {editing ? (
        <NumCell value={variant.forwardOrders} label={`Forward orders for ${name}`} onChange={(forwardOrders) => set({ forwardOrders })} />
      ) : (
        <Num value={formatNumber(variant.forwardOrders)} muted />
      )}
      {editing ? (
        <NumCell value={variant.trigger} label={`Reorder trigger for ${name}`} onChange={(trigger) => set({ trigger })} />
      ) : (
        <Num value={formatNumber(variant.trigger)} />
      )}

      <Num value={formatNumber(suggested)} className="font-bold text-blue-700" />
      <td className="px-2 py-2 text-center">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
          {style.label}
        </span>
      </td>

      {editing ? (
        <NumCell value={variant.buyPrice} label={`Buy price for ${name}`} step="0.01" onChange={(buyPrice) => set({ buyPrice })} />
      ) : (
        <Num value={formatMoney(variant.buyPrice)} />
      )}
      {editing ? (
        <NumCell value={variant.sellPrice} label={`Sell price for ${name}`} step="0.01" onChange={(sellPrice) => set({ sellPrice })} />
      ) : (
        <Num value={formatMoney(variant.sellPrice)} />
      )}

      <Num value={formatCurrencyValue(stockValue)} bold />

      <td className="py-2 pl-2 pr-4">
        <div className="flex items-center justify-end gap-1">
          {editing ? (
            <>
              <RowAction label={`Cancel editing ${name}`} onClick={onCancel}>
                <Close className="h-3.5 w-3.5" />
              </RowAction>
              <RowAction label={`Save ${name}`} primary onClick={onSave}>
                <Check className="h-3.5 w-3.5" />
              </RowAction>
            </>
          ) : (
            <>
              <RowAction label={`Edit ${variant.sku ?? 'variant'}`} onClick={() => onStartEdit(variant.id)}>
                <Pencil className="h-3.5 w-3.5" />
              </RowAction>
              <RowAction label={`Delete ${variant.sku ?? 'variant'}`} danger onClick={() => onDelete(variant)}>
                <Trash className="h-3.5 w-3.5" />
              </RowAction>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function SelectCheckbox({ name, selected, onToggleSelect }: { name: string; selected: boolean; onToggleSelect: () => void }) {
  return (
    <input
      type="checkbox"
      checked={selected}
      onChange={onToggleSelect}
      aria-label={`Select ${name}`}
      className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
    />
  );
}

export default memo(VariantsMatrixRow);
