'use client';

import { ModalShell } from '@/components/ModalShell';
import type { LocationOption } from './hooks/useLocations';
import type { StoreLocationRow, StoreLocationsState } from './hooks/useStoreLocations';
import { WIZARD_BODY_CLASS, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';

const SELECT_CLASS =
  'h-[24px] w-full rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring disabled:opacity-60';

function groupByStore(rows: StoreLocationRow[]) {
  const groups = new Map<string, { storeId: string; storeName: string; rows: StoreLocationRow[] }>();
  for (const row of rows) {
    const group = groups.get(row.storeId) ?? { storeId: row.storeId, storeName: row.storeName, rows: [] };
    group.rows.push(row);
    groups.set(row.storeId, group);
  }
  return [...groups.values()];
}

/** Maps each connected store's Shopify locations to a hub location. Order fulfilments and returns at
 * a mapped store location move stock at its hub location; unmapped ones fall back to the variant's
 * fullest location (out) or first location (back). */
export default function StoreLocationsModal({ storeLocations: s, locations }: { storeLocations: StoreLocationsState; locations: LocationOption[] }) {
  if (!s.open) return null;
  const groups = groupByStore(s.rows);

  return (
    <ModalShell
      title="Store locations"
      compact
      wide
      onClose={s.close}
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={s.sync} disabled={s.syncing} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            {s.syncing ? 'Syncing...' : 'Sync from Shopify'}
          </button>
          <button type="button" onClick={s.close} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            Done
          </button>
        </div>
      }
    >
      <p className="mb-2 text-[11px] leading-snug text-inventory-text-muted">
        When a store fulfils or restocks an order at one of its locations, stock moves at the hub location mapped here. Unmapped locations take stock from the fullest location and return it to the first.
      </p>
      {s.loading || (s.syncing && s.rows.length === 0) ? (
        <div className={`${WIZARD_CARD_CLASS} space-y-2`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[24px] animate-pulse rounded-[7px] bg-inventory-surface-hover" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className={`${WIZARD_CARD_CLASS} text-center text-[11px] text-inventory-text-subtle`}>No store locations yet — sync from Shopify.</div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.storeId} className={WIZARD_CARD_CLASS}>
              <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">{group.storeName}</h4>
              <div className="space-y-1.5">
                {group.rows.map((row) => (
                  <div key={row.id} className="grid grid-cols-1 items-center gap-1 sm:grid-cols-2 sm:gap-2">
                    <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-inventory-text">
                      <span className="truncate" title={row.name}>{row.name}</span>
                      {!row.active && <span className="shrink-0 rounded-[4px] border border-inventory-border px-[4px] py-[1px] text-[9px] font-semibold uppercase text-inventory-text-subtle">Inactive</span>}
                    </div>
                    <select
                      aria-label={`Hub location for ${group.storeName} ${row.name}`}
                      value={row.inventoryLocationId ?? ''}
                      disabled={s.savingId === row.id}
                      onChange={(e) => s.setMapping(row, e.target.value || null)}
                      className={SELECT_CLASS}
                    >
                      <option value="">Not mapped</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
