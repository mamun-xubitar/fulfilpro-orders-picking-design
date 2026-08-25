'use client';

import { PanelHeading } from './MainImagePanel';
import { Activity, Adjust, Clipboard, Swap, Upload } from './icons';
import { formatDate, formatRelative } from './utils';
import type { ProductRecord } from './types';

type BottomPanelsProps = {
  product: ProductRecord;
  /** Passed in so relative timestamps stay stable between server and client render. */
  now: number;
  onAction: (action: string) => void;
};

export default function BottomPanels({ product, now, onAction }: BottomPanelsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card icon={<Clipboard className="h-4 w-4" />} title="Stocktake">
        <Stat label="Last stocktake" value={formatDate(product.stocktake.lastAt)} />
        <Stat label="Next stocktake" value={formatDate(product.stocktake.nextAt)} />
        <Actions>
          <PrimaryButton onClick={() => onAction('New stocktake')}>New stocktake</PrimaryButton>
          <SecondaryButton onClick={() => onAction('Print count sheet')}>Print count sheet</SecondaryButton>
        </Actions>
      </Card>

      <Card icon={<Adjust className="h-4 w-4" />} title="Adjustments">
        <Stat label="Last adjustment" value={formatDate(product.adjustments.lastAt)} />
        <Stat label="This month" value={String(product.adjustments.thisMonth)} />
        <Actions>
          <PrimaryButton onClick={() => onAction('New adjustment')}>New adjustment</PrimaryButton>
          <SecondaryButton onClick={() => onAction('Adjustment history')}>View history</SecondaryButton>
        </Actions>
      </Card>

      <Card icon={<Swap className="h-4 w-4" />} title="Import / export">
        <button
          type="button"
          onClick={() => onAction('Import from Excel / CSV')}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Import Excel / CSV
        </button>
        {/* Not pinned: this card has no stat rows, so the exports sit with the import
            rather than being stranded at the bottom of a stretched grid cell. */}
        <Actions pin={false}>
          <SecondaryButton onClick={() => onAction('Export products')}>Export products</SecondaryButton>
          <SecondaryButton onClick={() => onAction('Export PO')}>Export PO</SecondaryButton>
        </Actions>
      </Card>

      <Card icon={<Activity className="h-4 w-4" />} title="Recent activity">
        {product.activity.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">No recent activity</p>
        ) : (
          <ul className="max-h-28 space-y-2.5 overflow-y-auto pr-1">
            {product.activity.map((entry) => (
              <li key={entry.id} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[13px] leading-snug text-gray-800">{entry.message}</span>
                  <span className="block text-[11px] text-gray-400">
                    {entry.actor} · {formatRelative(entry.at, now)}
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
    <section className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading icon={icon} title={title} />
      <div className="flex flex-1 flex-col gap-2 p-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 last-of-type:border-0">
      <span className="text-[13px] font-medium text-gray-600">{label}</span>
      <span className="text-[13px] font-bold text-gray-900 tabular-nums">{value}</span>
    </div>
  );
}

function Actions({ pin = true, children }: { pin?: boolean; children: React.ReactNode }) {
  return <div className={`flex gap-2 pt-1 ${pin ? 'mt-auto' : ''}`}>{children}</div>;
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 whitespace-nowrap rounded-lg bg-blue-600 px-2 py-1.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-blue-700 cursor-pointer"
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
      className="flex-1 whitespace-nowrap rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
    >
      {children}
    </button>
  );
}
