'use client';

import { useInventoryAccess } from './InventoryAccess';
import { PanelHeading, panelBorderClass, type PanelTone } from './MainImagePanel';
import PurchaseOrdersPanel from './PurchaseOrdersPanel';
import type { InventoryPage } from './hooks/useInventoryPage';
import { Activity, Adjust, Clipboard, Swap, Upload } from './icons';
import { formatDate, formatRelative } from './utils';

type BottomPanelsProps = { p: InventoryPage };

/** Five-up row (design 6) — Purchase orders absorbed alongside Stocktake, Adjustments,
 * Import/export and Recent activity, all sized to the same fixed height. */
export default function BottomPanels({ p }: BottomPanelsProps) {
  const product = p.product!;
  const { canEdit, canCount } = useInventoryAccess();

  return (
    <div className="grid grid-cols-1 gap-[5px] md:grid-cols-2 xl:h-24 xl:flex-none xl:grid-cols-5">
      <PurchaseOrdersPanel po={p.po} />

      <Card tone="stocktake" icon={<Clipboard className="h-3 w-3" />} title="Stocktake">
        <Stat label="Last stocktake" value={formatDate(product.stocktake.lastAt)} />
        <Stat label="Next stocktake" value={formatDate(product.stocktake.nextAt)} />
        <Actions>
          {canCount && <PrimaryButton onClick={p.stocktake.openModal}>New stocktake</PrimaryButton>}
          <SecondaryButton onClick={() => p.setModuleTab('stocktake')}>View stocktakes</SecondaryButton>
        </Actions>
      </Card>

      <Card tone="adjust" icon={<Adjust className="h-3 w-3" />} title="Adjustments">
        <Stat label="Last adjustment" value={formatDate(product.adjustments.lastAt)} />
        <Stat label="This month" value={String(product.adjustments.thisMonth)} />
        <Actions>
          {canEdit && <PrimaryButton onClick={p.adjustments.openModal}>New adjustment</PrimaryButton>}
          <SecondaryButton onClick={p.adjustments.openHistory}>View history</SecondaryButton>
        </Actions>
      </Card>

      <Card tone="import" icon={<Swap className="h-3 w-3" />} title="Import / export">
        {canEdit && (
          <button
            type="button"
            onClick={p.importExport.openImport}
            className="mt-auto flex h-[22px] w-full items-center justify-center gap-1 rounded-[6px] bg-inventory-success text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-success-hover cursor-pointer"
          >
            <Upload className="h-3 w-3" />
            Import Product CSV
          </button>
        )}
        {/* Not pinned: this card has no stat rows, so the exports sit with the import
            rather than being stranded at the bottom of a stretched grid cell. */}
        <Actions pin={false}>
          <SecondaryButton onClick={() => p.importExport.exportVariants(product.variants)}>Export product CSV</SecondaryButton>
          <SecondaryButton onClick={() => p.importExport.exportPurchaseOrders(p.po.purchaseOrders)}>Export PO CSV</SecondaryButton>
        </Actions>
      </Card>

      <Card
        tone="activity"
        icon={<Activity className="h-3 w-3" />}
        title="Recent activity"
        action={
          <button
            type="button"
            onClick={() => p.setModuleTab('history')}
            className="cursor-pointer text-[10px] font-bold leading-none text-inventory-sec-activity transition-opacity duration-150 hover:opacity-70 hover:underline"
          >
            Show history
          </button>
        }
      >
        {product.activity.length === 0 ? (
          <p className="py-3 text-center text-[10px] text-inventory-text-subtle">No recent activity</p>
        ) : (
          <ul className="thin-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {product.activity.map((entry) => (
              <li key={entry.id} className="flex gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-inventory-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[10px] leading-snug text-inventory-text">{entry.message}</span>
                  <span className="block text-[9px] text-inventory-text-subtle">
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

function Card({ icon, title, tone, action, children }: { icon: React.ReactNode; title: string; tone: PanelTone; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-[10px] border ${panelBorderClass(tone)} bg-inventory-surface shadow-inventory`}>
      <PanelHeading tone={tone} icon={icon} title={title} action={action} />
      <div className="flex min-h-0 flex-1 flex-col gap-[4px] p-[6px]">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-inventory-divider py-[4px] leading-none last-of-type:border-0">
      <span className="text-[10px] font-medium text-inventory-text-muted">{label}</span>
      <span className="text-[10px] font-bold text-inventory-text tabular-nums">{value}</span>
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
      className="h-[22px] flex-1 whitespace-nowrap rounded-[6px] bg-inventory-primary px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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
      className="h-[22px] flex-1 whitespace-nowrap rounded-[6px] border border-inventory-border-strong px-[6px] text-[10px] font-bold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
    >
      {children}
    </button>
  );
}
