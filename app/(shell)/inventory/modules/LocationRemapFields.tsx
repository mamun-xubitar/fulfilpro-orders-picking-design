'use client';

export type RemapDestination = { id: string; name: string };

/** One removed location's stock moves into a surviving location — shared by the bulk "Set
 * locations" modal and the single-variant save confirmation. When only one destination exists
 * its value is used automatically, so the select just shows it. */
export default function LocationRemapFields({
  needs,
  destinations,
  remap,
  onChange,
}: {
  /** Removed locations holding stock: label detail (e.g. "100 across 46 variants") shown after each name. */
  needs: { id: string; name: string; detail: string }[];
  destinations: RemapDestination[];
  remap: Record<string, string>;
  onChange: (fromId: string, toId: string) => void;
}) {
  return (
    <div className="rounded-[8px] border border-inventory-primary/30 bg-inventory-primary/[4%] p-[8px]">
      <p className="text-[11px] font-bold text-inventory-text">Move stock from removed locations</p>
      <p className="mt-[2px] text-[10px] leading-snug text-inventory-text-subtle">
        These locations still hold stock. Pick where each one&apos;s stock should go — it will be added to that location.
      </p>
      <div className="mt-[6px] space-y-[6px]">
        {needs.map((need) => {
          const value = remap[need.id] ?? (destinations.length === 1 ? destinations[0].id : '');
          return (
            <div key={need.id} className="flex items-center gap-[6px]">
              <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-inventory-text" title={`${need.name} (${need.detail})`}>
                {need.name} <span className="font-normal text-inventory-text-subtle">({need.detail})</span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-[10px] font-bold text-inventory-text-subtle">→</span>
              <select
                value={value}
                onChange={(e) => onChange(need.id, e.target.value)}
                aria-label={`Move ${need.name} stock to`}
                className="h-[24px] max-w-[150px] shrink-0 cursor-pointer rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[10.5px] font-semibold text-inventory-text outline-none focus:border-inventory-primary"
              >
                <option value="">Pick location…</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
