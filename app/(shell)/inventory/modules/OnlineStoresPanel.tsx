'use client';

import { PanelHeading } from './MainImagePanel';
import { PRODUCT_STATUS_BADGES } from './constants';
import { External, Store } from './icons';
import { formatMoney } from './utils';
import type { StoreListing } from './types';

type OnlineStoresPanelProps = {
  stores: StoreListing[];
  baseCurrency: string;
  onEditPrice: (store: StoreListing) => void;
  onAction: (action: string) => void;
};

export default function OnlineStoresPanel({ stores, baseCurrency, onEditPrice, onAction }: OnlineStoresPanelProps) {
  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading icon={<Store className="h-4 w-4" />} title="Online stores & prices" meta={`${stores.length}`} />

      <div className="flex-1 space-y-2 p-3">
        {stores.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-gray-400">This product is not published to any store.</p>
        ) : (
          stores.map((store) => (
            <article key={store.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate text-[13px] font-semibold text-gray-900">{store.name}</h4>
                  <p className="truncate text-[11px] text-gray-500">{store.domain}</p>
                </div>
                <span className="shrink-0 text-[13px] font-bold text-gray-900 tabular-nums">
                  ${formatMoney(store.price)} <span className="text-[11px] font-medium text-gray-400">{baseCurrency}</span>
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    PRODUCT_STATUS_BADGES[store.status] ?? PRODUCT_STATUS_BADGES.ARCHIVED
                  }`}
                >
                  {store.status}
                </span>
                <span className="truncate text-[10px] text-gray-400">ID {store.externalId}</span>
              </div>

              <div className="mt-2.5 flex gap-1.5">
                <StoreButton onClick={() => onEditPrice(store)}>Edit price</StoreButton>
                <StoreButton onClick={() => onAction(`Pushing the price to ${store.name}`)}>Update</StoreButton>
                {store.url ? (
                  <a
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 py-1 text-[11px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
                  >
                    Open
                    <External className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 py-1 text-[11px] font-semibold text-gray-300">
                    Open
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <div className="border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={() => onAction('Manage store listings')}
          className="w-full rounded-lg bg-blue-600 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-blue-700 cursor-pointer"
        >
          Manage store listings
        </button>
      </div>
    </section>
  );
}

function StoreButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-lg border border-gray-300 py-1 text-[11px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
    >
      {children}
    </button>
  );
}
