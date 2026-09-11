'use client';

import { PanelHeading } from './MainImagePanel';
import PurchaseOrdersPanel from './PurchaseOrdersPanel';
import type { InventoryPage } from './hooks/useInventoryPage';
import { Activity, Adjust, Clipboard, Swap, Upload } from './icons';
import { formatDate, formatRelative } from './utils';

type BottomPanelsProps = { p: InventoryPage };

/** Five-up row (design 6) — Purchase orders absorbed alongside Stocktake, Adjustments,
 * Import/export and Recent activity, all sized to the same fixed height. */
export default function BottomPanels({ p }: BottomPanelsProps) {
  const product = p.product!;

  return (
    <div className="grid grid-cols-1 gap-[5px] md:grid-cols-2 xl:h-24 xl:flex-none xl:grid-cols-5">
      <PurchaseOrdersPanel po={p.po} />

      <Card icon={<Clipboard className="h-3 w-3" />} title="Stocktake">
        <Stat label="Last stocktake" value={formatDate(product.stocktake.lastAt)} />
        <Stat label="Next stocktake" value={formatDate(product.stocktake.nextAt)} />
        <Actions>
          <PrimaryButton onClick={p.stocktake.start} disabled={p.stocktake.starting}>
            New stocktake
          </PrimaryButton>
          <SecondaryButton onClick={p.stocktake.printCountSheet}>Print count sheet</SecondaryButton>
        </Actions>
      </Card>

      <Card icon={<Adjust className="h-3 w-3" />} title="Adjustments">
        <Stat label="Last adjustment" value={formatDate(product.adjustments.lastAt)} />
        <Stat label="This month" value={String(product.adjustments.thisMonth)} />
        <Actions>
          <PrimaryButton onClick={p.adjustments.openModal}>New adjustment</PrimaryButton>
          <SecondaryButton onClick={p.adjustments.openHistory}>View history</SecondaryButton>
        </Actions>
      </Card>

      <Card icon={<Swap className="h-3 w-3" />} title="Import / export">
        <button
          type="button"
          onClick={p.importExport.openImport}
          className="mt-auto flex h-[22px] w-full items-center justify-center gap-1 rounded-[6px] bg-emerald-600 text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-emerald-700 cursor-pointer"
        >
          <Upload className="h-3 w-3" />
          Import Product/PO CSV
        </button>
        {/* Not pinned: this card has no stat rows, so the exports sit with the import
            rather than being stranded at the bottom of a stretched grid cell. */}
        <Actions pin={false}>
          <SecondaryButton onClick={() => p.importExport.exportVariants(product.variants)}>Export product CSV</SecondaryButton>
          <SecondaryButton onClick={() => p.importExport.exportPurchaseOrders(p.po.purchaseOrders)}>Export PO CSV</SecondaryButton>
        </Actions>
      </Card>

      <Card icon={<Activity className="h-3 w-3" />} title="Recent activity">
        {product.activity.length === 0 ? (
          <p className="py-3 text-center text-[10px] text-gray-400">No recent activity</p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {product.activity.map((entry) => (
              <li key={entry.id} className="flex gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[10px] leading-snug text-gray-800">{entry.message}</span>
                  <span className="block text-[9px] text-gray-400">
                    {entry.actor} · {formatRelative(entry.at, p.now)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col rounded-[10px] border border-gray-200 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]">
      <PanelHeading icon={icon} title={title} />
      <div className="flex min-h-0 flex-1 flex-col gap-[4px] p-[6px]">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-gray-100 py-[4px] leading-none last-of-type:border-0">
      <span className="text-[10px] font-medium text-gray-600">{label}</span>
      <span className="text-[10px] font-bold text-gray-900 tabular-nums">{value}</span>
    </div>
  );
}

function Actions({ pin = true, children }: { pin?: boolean; children: React.ReactNode }) {
  return <div className={`flex gap-1 ${pin ? 'mt-auto' : ''}`}>{children}</div>;
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-[22px] flex-1 whitespace-nowrap rounded-[6px] bg-blue-600 px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-[22px] flex-1 whitespace-nowrap rounded-[6px] border border-gray-300 px-[6px] text-[10px] font-bold leading-none text-gray-700 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
    >
      {children}
    </button>
  );
}
