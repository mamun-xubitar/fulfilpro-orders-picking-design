'use client';

import { memo } from 'react';
import { ColourCell, IncomingCell, Num, NumCell, RowAction, SizeCell, SkuCell, VariantTitleCell } from './VariantsMatrixCells';
import { STATUS_STYLES } from './constants';
import { Check, Close, Trash } from './icons';
import { computeVariant, formatCurrencyValue, formatMoney, formatNumber } from './utils';
import type { VariantRow } from './types';

type VariantsMatrixRowProps = {
  /** Already draft-overlaid by the hook — the row only ever renders values, never merges them. */
  variant: VariantRow;
  selected: boolean;
  /** This row differs from the server (computed by diffing against the server row, not by
   * tracking which fields were touched — see variantDraftChanges). Note this is per *row*, not
   * per visible column: an edit to a column hidden inline (SKU/Barcode, Trigger) still arms this
   * row's Save button on the inline table, since the edit is real and must stay saveable. */
  dirty: boolean;
  /** This row's own PATCH is in flight. */
  saving: boolean;
  /** Full view renders every column; the inline table hides SKU / Barcode and Trigger. */
  showAllColumns: boolean;
  swatch: string;
  onToggleSelect: (id: string) => void;
  onFieldChange: (id: string, patch: Partial<VariantRow>) => void;
  onSave: (id: string) => void;
  onRevert: (id: string) => void;
  onDelete: (variant: VariantRow) => void;
};

/** Every row is always editable — there is no read-only mode here. A row's Save/Revert actions
 * appear only once it's dirty; Delete is always available. */
function VariantsMatrixRow({
  variant,
  selected,
  dirty,
  saving,
  showAllColumns,
  swatch,
  onToggleSelect,
  onFieldChange,
  onSave,
  onRevert,
  onDelete,
}: VariantsMatrixRowProps) {
  const { available, stockValue, status } = computeVariant(variant);
  const style = STATUS_STYLES[status];
  const name = variant.sku ?? variant.id;
  const set = (patch: Partial<VariantRow>) => onFieldChange(variant.id, patch);

  return (
    <tr className={`border-b border-inventory-border last:border-0 transition-colors duration-150 ${style.row} ${selected ? 'ring-1 ring-inset ring-inventory-primary' : ''}`}>
      <td className="relative px-[4px] py-0 pl-[6px]">
        <span className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} aria-hidden="true" />
        <div className="flex items-center gap-[4px]">
          <SelectCheckbox name={name} selected={selected} onToggleSelect={() => onToggleSelect(variant.id)} />
          <ColourCell value={variant.colour} swatch={swatch} />
        </div>
      </td>

      <SizeCell value={variant.size} />
      <VariantTitleCell colour={variant.colour} size={variant.size} />

      {showAllColumns && (
        <SkuCell
          sku={variant.sku}
          barcode={variant.barcode}
          onChangeSku={(sku) => set({ sku })}
          onChangeBarcode={(barcode) => set({ barcode })}
        />
      )}

      <NumCell value={variant.stockOnHand} label={`Stock on hand for ${name}`} onChange={(stockOnHand) => set({ stockOnHand })} />
      <NumCell
        value={variant.allocated}
        label={`Allocated for ${name}`}
        title={`${formatNumber(variant.allocatedFromOrders)} committed to open orders`}
        onChange={(allocated) => set({ allocated })}
      />

      <Num value={formatNumber(available)} className="font-bold text-inventory-success-hover" />

      <IncomingCell lots={variant.incomingLots} />
      {showAllColumns && <NumCell value={variant.trigger} label={`Reorder trigger for ${name}`} onChange={(trigger) => set({ trigger })} />}

      <td className="px-[4px] py-0 text-center">
        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.4px] ${style.badge}`}>
          {style.label}
        </span>
      </td>

      <Num value={formatMoney(variant.buyPrice)} muted title="Weighted average of received PO cost" />
      <NumCell value={variant.sellPrice} label={`Sell price for ${name}`} step="0.01" onChange={(sellPrice) => set({ sellPrice })} />

      <Num value={formatCurrencyValue(stockValue)} bold />

      <td className="px-[4px] py-0 pr-[6px]">
        {/* Fixed min-width so a row doesn't jitter sideways the moment it goes dirty. */}
        <div className="flex min-w-[4rem] items-center justify-end gap-[4px]">
          {dirty && (
            <>
              <RowAction label={`Discard changes to ${name}`} disabled={saving} onClick={() => onRevert(variant.id)}>
                <Close className="h-3 w-3" />
              </RowAction>
              <RowAction label={`Save ${name}`} primary disabled={saving} onClick={() => onSave(variant.id)}>
                {saving ? (
                  <span className="block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </RowAction>
            </>
          )}
          <RowAction label={`Delete ${variant.sku ?? 'variant'}`} danger onClick={() => onDelete(variant)}>
            <Trash className="h-3 w-3" />
          </RowAction>
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
      className="h-3 w-3 cursor-pointer accent-inventory-primary"
    />
  );
}

export default memo(VariantsMatrixRow);
