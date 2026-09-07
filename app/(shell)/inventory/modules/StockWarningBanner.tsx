import { variantTitle } from './utils';

export type StockWarningRow = { variantId: string; colour: string; size: string; total: number; available: number };

/** Informational, non-blocking notice shown in the publish modal when the unpublished selected
 * stores' resolved stock for a variant sums past the hub's own available quantity — a deliberate
 * overcommit is a real workflow, so this never disables Save. See `stockWarnings` in
 * useStorePublish.ts. */
export default function StockWarningBanner({ warnings }: { warnings: StockWarningRow[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
      <p className="font-semibold">Stock split exceeds hub availability</p>
      <ul className="mt-1 space-y-0.5">
        {warnings.map((w) => (
          <li key={w.variantId}>
            {variantTitle(w)}: {w.total} pushed across selected stores, {w.available} in hub
          </li>
        ))}
      </ul>
    </div>
  );
}
