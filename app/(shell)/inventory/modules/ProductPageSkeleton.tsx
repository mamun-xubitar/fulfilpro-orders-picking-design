import { PanelHeading, panelBorderClass, type PanelTone } from './MainImagePanel';
import { Activity, Adjust, Clipboard, Cube, Document, Image as ImageIcon, Store, Swap, Tag } from './icons';
import { Bone, SkeletonRows, type SkeletonCell } from './Skeleton';

type ProductPageSkeletonProps = {
  /** Which tab is loading — the Variant tab leads with the variants table, Products with the details. */
  variant: 'products' | 'variants';
};

/** Loading state for the single-product pages. It mirrors the loaded page section by section —
 * same grids, heights, panel tones and (static) panel headings — so only the data shimmers and
 * nothing moves when the record arrives. Each section sets `--i` on its wrapper, which `.inventory-bone`
 * reads as an animation delay, so the highlight sweeps down the page rather than flashing in sync. */
export default function ProductPageSkeleton({ variant }: ProductPageSkeletonProps) {
  const tall = variant === 'variants';
  const sections = tall
    ? [<MatrixSkeleton key="matrix" tall />, <DetailsRowSkeleton key="details" />, <BottomRowSkeleton key="bottom" />]
    : [<DetailsRowSkeleton key="details" />, <MatrixSkeleton key="matrix" />, <BottomRowSkeleton key="bottom" />];

  return (
    <div role="status" aria-busy="true" aria-label="Loading product" className="space-y-2">
      {sections.map((section, i) => (
        <div key={section.key} style={{ '--i': i * 4 } as React.CSSProperties}>
          {section}
        </div>
      ))}
    </div>
  );
}

function Panel({ tone, icon, title, className = '', children }: { tone: PanelTone; icon: React.ReactNode; title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`flex min-w-0 flex-col overflow-hidden rounded-[10px] border ${panelBorderClass(tone)} bg-inventory-surface shadow-inventory ${className}`}>
      <PanelHeading tone={tone} icon={icon} title={title} />
      <div className="flex min-h-0 flex-1 flex-col gap-[6px] p-[6px]">{children}</div>
    </section>
  );
}

const PANEL_H = 'h-[220px] xl:h-[285px]';

/** A label on the left, a value on the right — the Stat / price row shape. */
function ValueRow({ label = 'w-14', value = 'w-8' }: { label?: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-inventory-divider py-[5px] last:border-0">
      <Bone className={`h-[8px] ${label}`} />
      <Bone className={`h-[9px] ${value}`} />
    </div>
  );
}

function DetailsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-[5px] md:grid-cols-2 xl:grid-cols-[150px_minmax(0,1.6fr)_minmax(0,1.15fr)_170px_200px]">
      <Panel tone="image" icon={<ImageIcon className="h-3 w-3" />} title="Main image" className={PANEL_H}>
        <Bone className="h-[110px] w-full rounded-[6px]" />
        <div className="flex gap-[4px]">
          {[0, 1, 2].map((i) => (
            <Bone key={i} className="h-7 flex-1 rounded-[5px]" />
          ))}
        </div>
        <Bone className="mt-auto h-[22px] w-full rounded-[6px]" />
      </Panel>

      <Panel tone="details" icon={<Document className="h-3 w-3" />} title="Product details" className={PANEL_H}>
        <div className="grid grid-cols-2 gap-x-[8px] gap-y-[8px]">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="space-y-[4px]">
              <Bone className="h-[7px] w-12" />
              <Bone className="h-[22px] w-full rounded-[6px]" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel tone="pricing" icon={<Tag className="h-3 w-3" />} title="Pricing & margin" className={PANEL_H}>
        <ValueRow label="w-16" value="w-12" />
        <ValueRow label="w-20" value="w-10" />
        <ValueRow label="w-12" value="w-14" />
        <ValueRow label="w-24" value="w-8" />
        <div className="mt-auto flex gap-[4px]">
          <Bone className="h-[22px] flex-1 rounded-[6px]" />
          <Bone className="h-[22px] flex-1 rounded-[6px]" />
        </div>
      </Panel>

      <Panel tone="stock" icon={<Cube className="h-3 w-3" />} title="Stock summary" className={PANEL_H}>
        <ValueRow label="w-16" value="w-6" />
        <ValueRow label="w-12" value="w-7" />
        <ValueRow label="w-14" value="w-5" />
        <ValueRow label="w-10" value="w-8" />
        <ValueRow label="w-16" value="w-9" />
      </Panel>

      <Panel tone="stores" icon={<Store className="h-3 w-3" />} title="Online stores" className={PANEL_H}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-[6px] border-b border-inventory-divider py-[5px] last:border-0">
            <Bone className="h-3 w-3 rounded-[3px]" />
            <Bone className="h-[9px] flex-1" />
            <Bone className="h-[14px] w-9 rounded-full" />
          </div>
        ))}
        <Bone className="mt-auto h-[22px] w-full rounded-[6px]" />
      </Panel>
    </div>
  );
}

const MATRIX_HEADERS = ['Size', 'Variant', 'Location', 'Stock on hand', 'Allocated', 'Available', 'Incoming', 'Status', 'Buy price', 'Sell price', 'Stock value', 'Actions'];
// The Variant tab shows every column; the compact Products card drops SKU / Barcode and Trigger.
const FULL_HEADERS = [...MATRIX_HEADERS.slice(0, 2), 'SKU / Barcode', ...MATRIX_HEADERS.slice(2, 7), 'Trigger', ...MATRIX_HEADERS.slice(7)];
const COMPACT_CELLS: SkeletonCell[] = ['check', 'stack', 'text', 'num', 'num', 'num', 'num', 'badge', 'num', 'num', 'num', { kind: 'actions', count: 2 }];
const FULL_CELLS: SkeletonCell[] = ['check', 'stack', 'text', 'text', 'num', 'num', 'num', 'num', 'num', 'num', 'badge', 'num', 'num', 'num', { kind: 'actions', count: 2 }];

function MatrixSkeleton({ tall }: { tall?: boolean }) {
  const headers = tall ? FULL_HEADERS : MATRIX_HEADERS;
  return (
    <section className={`overflow-hidden rounded-xl border ${panelBorderClass('variants')} bg-inventory-surface shadow-sm`}>
      <div className="flex flex-wrap items-center gap-[4px] border-b border-inventory-sec-variants/25 bg-inventory-sec-variants/[7%] px-[8px] py-[4px] shadow-[inset_3px_0_0_0_var(--color-inventory-sec-variants)]">
        <h3 className="mr-[2px] text-[9.5px] font-bold uppercase leading-none tracking-[0.5px] text-inventory-sec-variants">Variants / stock</h3>
        <Bone className="h-[16px] w-[60px] rounded-full" />
        <Bone className="h-[22px] w-[22px] rounded-[7px]" />
        <span className="mx-[2px] h-[18px] w-px bg-inventory-border" aria-hidden="true" />
        <Bone className="h-[22px] w-[210px] max-w-full rounded-[7px]" />
        <Bone className="h-[22px] w-[74px] rounded-[7px]" />
        <Bone className="h-[22px] w-[88px] rounded-[7px]" />
        <Bone className="h-[22px] w-[64px] rounded-[7px]" />
      </div>
      <div className={`flex ${tall ? 'min-h-[14rem]' : 'min-h-[10rem]'}`}>
        <div className="hidden w-[170px] shrink-0 space-y-[9px] border-r border-inventory-border p-[8px] sm:block">
          <Bone className="h-[8px] w-16" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-[6px]">
              <Bone className="h-[14px] w-[14px] rounded-full" />
              <Bone className="h-[9px] flex-1" />
              <Bone className="h-[8px] w-4" />
            </div>
          ))}
        </div>
        <div className="thin-scroll min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-5xl border-collapse">
            <thead>
              <tr className="border-b border-inventory-border bg-inventory-surface-muted">
                {headers.map((label) => (
                  <th key={label} scope="col" className="whitespace-nowrap px-[4px] py-[3px] text-left text-[8px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle first:pl-[6px] last:pr-[6px] last:text-right">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SkeletonRows cells={tall ? FULL_CELLS : COMPACT_CELLS} rows={tall ? 7 : 4} cellClassName="px-[4px] py-[6px] first:pl-[6px] last:pr-[6px]" />
            </tbody>
          </table>
        </div>
      </div>
      <div className="border-t border-inventory-sec-variants/35 bg-[#f9f1fa] px-[6px] py-[5px]">
        <Bone className="h-[8px] w-24" />
      </div>
    </section>
  );
}

const BOTTOM_CARDS: { tone: PanelTone; icon: React.ReactNode; title: string; stats: number; buttons: number }[] = [
  { tone: 'po', icon: <Clipboard className="h-3 w-3" />, title: 'Purchase orders', stats: 2, buttons: 1 },
  { tone: 'stocktake', icon: <Clipboard className="h-3 w-3" />, title: 'Stocktake', stats: 2, buttons: 2 },
  { tone: 'adjust', icon: <Adjust className="h-3 w-3" />, title: 'Adjustments', stats: 2, buttons: 2 },
  { tone: 'import', icon: <Swap className="h-3 w-3" />, title: 'Import / export', stats: 0, buttons: 3 },
  { tone: 'activity', icon: <Activity className="h-3 w-3" />, title: 'Recent activity', stats: 3, buttons: 0 },
];

function BottomRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-[5px] md:grid-cols-2 xl:h-24 xl:grid-cols-5">
      {BOTTOM_CARDS.map((card) => (
        <Panel key={card.title} tone={card.tone} icon={card.icon} title={card.title} className="min-h-24">
          {Array.from({ length: card.stats }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <Bone className="h-[8px] w-16" />
              <Bone className="h-[9px] w-10" />
            </div>
          ))}
          {card.buttons > 0 && (
            <div className="mt-auto flex gap-[4px]">
              {Array.from({ length: card.buttons }).map((_, i) => (
                <Bone key={i} className="h-[22px] flex-1 rounded-[6px]" />
              ))}
            </div>
          )}
        </Panel>
      ))}
    </div>
  );
}
