'use client';

import { useContext } from 'react';
import OverflowChipRow from './OverflowChipRow';
import { colourChipItems } from './ProductColoursField';
import { DenseFieldsContext, FieldLabel } from './ProductFieldRows';
import { sizeChipItems } from './ProductSizesField';
import { Plus } from './icons';
import type { ColourOption } from './types';

type ProductOptionsRowProps = {
  sizes: string[];
  colours: ColourOption[];
  sizesError?: string;
  coloursError?: string;
  /** Opens the Colour & size adjustment modal — shared by each field's "+" button and by the
   * OverflowChipRow's "+N" badge (item 6b), so every entry point lands on the same modal. */
  onEdit: () => void;
};

/**
 * Sizes and Colours cells for the Product details panel (not the New Product wizard's embedded
 * copy, which still uses the plain wrapping chips) — item 6b: each list is forced to a single
 * line via OverflowChipRow, with a "+N" badge standing in for whatever doesn't fit. Split out of
 * ProductFieldsPanel to keep that file under the component size budget.
 */
export default function ProductOptionsRow({ sizes, colours, sizesError, coloursError, onEdit }: ProductOptionsRowProps) {
  const dense = useContext(DenseFieldsContext);
  const editButton = (label: string) => (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`Edit ${label}`}
      title={`Edit ${label}`}
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-inventory-border-strong bg-inventory-surface text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
    >
      <Plus className="h-3 w-3" />
    </button>
  );
  // In dense mode (notched labels) the chip row gets the same bordered-box chrome every other
  // field has, so its label has a border to sit on — plain flex row otherwise (wizard).
  const rowClass = dense
    ? 'flex h-[24px] min-w-0 flex-1 items-center gap-[4px] rounded-[7px] border border-inventory-border-strong px-[6px]'
    : 'flex min-w-0 flex-1 items-center gap-[4px]';

  return (
    <>
      <div className="min-w-0">
        <FieldLabel>Sizes</FieldLabel>
        <div className="flex items-center gap-[4px]">
          <div className={rowClass}>
            <OverflowChipRow items={sizeChipItems(sizes)} onShowMore={onEdit} />
          </div>
          {editButton('sizes')}
        </div>
        {sizesError && <p className="mt-[2px] text-[10px] leading-tight text-inventory-danger">{sizesError}</p>}
      </div>

      <div className="min-w-0">
        <FieldLabel>Colours</FieldLabel>
        <div className="flex items-center gap-[4px]">
          <div className={rowClass}>
            <OverflowChipRow items={colourChipItems(colours)} onShowMore={onEdit} />
          </div>
          {editButton('colours')}
        </div>
        {coloursError && <p className="mt-[2px] text-[10px] leading-tight text-inventory-danger">{coloursError}</p>}
      </div>
    </>
  );
}
