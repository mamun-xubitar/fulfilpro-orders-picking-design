'use client';

import { ModalShell } from '@/components/ModalShell';
import { useInventoryAccess } from './InventoryAccess';
import { locationChipClass } from './LocationPickerMenu';
import { variantTitle } from './utils';
import { NO_LOCATION, type useStocktake } from './hooks/useStocktake';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_FINISH, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';

const CONTROL =
  'h-[24px] rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer';

type StocktakeState = ReturnType<typeof useStocktake>;

function StocktakeFilterBar({ stocktake }: { stocktake: StocktakeState }) {
  const { filters, options } = stocktake;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-[6px]">
      <select value={filters.locationId} onChange={(e) => stocktake.setFilter('locationId', e.target.value)} aria-label="Location" className={CONTROL}>
        <option value="">All locations</option>
        {options.locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
        {options.hasUnlocated && <option value={NO_LOCATION}>No location</option>}
      </select>
      <select value={filters.colour} onChange={(e) => stocktake.setFilter('colour', e.target.value)} aria-label="Colour" className={CONTROL}>
        <option value="">All colours</option>
        {options.colours.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <select value={filters.size} onChange={(e) => stocktake.setFilter('size', e.target.value)} aria-label="Size" className={CONTROL}>
        <option value="">All sizes</option>
        {options.sizes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {(filters.locationId || filters.colour || filters.size) && (
        <button type="button" onClick={stocktake.clearFilters} className="h-[22px] rounded-[6px] px-[8px] text-[10px] font-bold text-inventory-secondary hover:bg-inventory-secondary/10 cursor-pointer">
          Clear filters
        </button>
      )}
      <span className="ml-auto text-[10px] font-semibold tabular-nums text-inventory-text-subtle">{stocktake.selectedCount} selected</span>
    </div>
  );
}

export default function StocktakeModal({ stocktake }: { stocktake: StocktakeState }) {
  const { canEdit } = useInventoryAccess();
  if (!stocktake.open) return null;

  return (
    <ModalShell
      disableBackdropClose
      title="New stocktake"
      compact
      onClose={stocktake.close}
      wide
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={stocktake.close} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            Cancel
          </button>
          <button type="button" onClick={stocktake.create} disabled={stocktake.creating || stocktake.selectedCount === 0} className={`flex-1 ${WIZARD_BTN_FINISH}`}>
            {stocktake.creating && SPINNER}
            {stocktake.creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      }
    >
      <div className={WIZARD_CARD_CLASS}>
        <p className="mb-2 text-[12px] text-inventory-text-muted">
          Tick the variants to count. A variant kept in several locations has a line per location. Print the sheet after creating, then enter the counts from the Stocktake tab.
        </p>
        <StocktakeFilterBar stocktake={stocktake} />
        <div className="max-h-96 overflow-y-auto thin-scroll rounded-lg border border-inventory-border">
          <table className="w-full border-collapse text-[11px] leading-none">
            <thead className="sticky top-0 z-10 bg-inventory-surface-muted shadow-[0_1px_0_var(--inventory-border)]">
              <tr className="border-b border-inventory-border bg-inventory-surface-muted text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                <th className="w-7 px-2 py-1">
                  <input
                    type="checkbox"
                    checked={stocktake.allVisibleChecked}
                    onChange={stocktake.toggleAllVisible}
                    disabled={stocktake.visible.length === 0}
                    aria-label="Select all shown variants"
                    className="h-3 w-3 cursor-pointer accent-inventory-primary"
                  />
                </th>
                <th className="px-2 py-1">Colour / Size</th>
                <th className="px-2 py-1">SKU</th>
                <th className="px-2 py-1">Location</th>
                {canEdit && <th className="px-2 py-1 text-right">Quantity</th>}
                <th className="px-2 py-1 text-right">Counted</th>
              </tr>
            </thead>
            <tbody>
              {stocktake.visible.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-2 py-6 text-center text-inventory-text-subtle">
                    No variants match these filters.
                  </td>
                </tr>
              ) : (
                stocktake.visible.map(({ key, variant, location }) => (
                  <tr key={key} className={`border-b border-inventory-divider last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover ${stocktake.selected[key] ? 'bg-inventory-primary/[5%]' : ''}`}>
                    <td className="px-2 py-1">
                      <input type="checkbox" checked={!!stocktake.selected[key]} onChange={() => stocktake.toggle(key)} aria-label={`Select ${variantTitle(variant)}${location ? ` at ${location.name}` : ''}`} className="h-3 w-3 cursor-pointer accent-inventory-primary" />
                    </td>
                    <td className="px-2 py-1 text-inventory-text">{variantTitle(variant)}</td>
                    <td className="px-2 py-1 text-inventory-text-subtle">{variant.sku ?? '—'}</td>
                    <td className="px-2 py-1">
                      {location ? (
                        <span className={`inline-flex items-center rounded-[4px] border px-[4px] py-[1px] text-[9px] font-semibold ${locationChipClass(location.id)}`}>{location.name}</span>
                      ) : (
                        <span className="text-inventory-text-subtle">—</span>
                      )}
                    </td>
                    {canEdit && (
                      <td title="Stock on hand now, for the whole variant across its locations" className="px-2 py-1 text-right tabular-nums text-inventory-text-muted">
                        {variant.stockOnHand}
                      </td>
                    )}
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        disabled
                        value=""
                        title="Counts are entered after the stocktake is created"
                        aria-label={`Counted for ${variantTitle(variant)}${location ? ` at ${location.name}` : ''}`}
                        className="h-[22px] w-20 rounded-[7px] border border-inventory-border-strong pl-[6px] pr-[10px] text-right text-[11px] leading-none outline-none disabled:cursor-not-allowed disabled:bg-inventory-surface-muted"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModalShell>
  );
}
