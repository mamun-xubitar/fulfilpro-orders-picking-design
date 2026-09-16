import { Cube } from './icons';

export default function ComingSoon({ label, blurb }: { label: string; blurb: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-inventory-border-strong bg-inventory-surface px-6 py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-inventory-surface-muted text-inventory-text-subtle">
        <Cube className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold text-inventory-text">{label}</h2>
      <p className="mt-1 max-w-md text-sm text-inventory-text-subtle">{blurb}</p>
      <span className="mt-4 inline-flex items-center rounded-full border border-inventory-border bg-inventory-surface-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-inventory-text-subtle">
        Coming soon
      </span>
    </div>
  );
}
