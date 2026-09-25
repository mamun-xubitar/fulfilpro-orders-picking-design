'use client';

import type { StoreVariantTableRow } from './storeDiff';

type StoreDiffVariantsSummaryProps = {
  rows: StoreVariantTableRow[];
};

function variantLabel(row: StoreVariantTableRow): string {
  return [row.colour, row.size].filter(Boolean).join(' / ') || 'Default';
}

function fieldChangeSummary(row: StoreVariantTableRow): string {
  const parts: string[] = [];
  if (row.mismatchedFields.has('price')) parts.push(`Price ${row.storePrice?.toFixed(2) ?? '—'} → ${row.systemPrice.toFixed(2)}`);
  if (row.mismatchedFields.has('sku')) parts.push(`SKU ${row.storeSku || '(empty)'} → ${row.systemSku || '(empty)'}`);
  if (row.mismatchedFields.has('barcode')) parts.push(`Barcode ${row.storeBarcode || '(empty)'} → ${row.systemBarcode || '(empty)'}`);
  if (row.mismatchedFields.has('image')) parts.push('Image');
  return parts.join(', ');
}

/** Plain-language readout under the variants table (item 4) — three short lists so an admin can
 * confirm what a "Save variants to store" push will actually do before clicking it, without
 * having to scan every row of the table for its tint. */
export default function StoreDiffVariantsSummary({ rows }: StoreDiffVariantsSummaryProps) {
  const updating = rows.filter((r) => r.kind === 'changed');
  const missing = rows.filter((r) => r.kind === 'missing-in-store');
  const extra = rows.filter((r) => r.kind === 'extra-in-store');

  if (updating.length === 0 && missing.length === 0 && extra.length === 0) return null;

  return (
    <div className="space-y-[6px] rounded-[8px] border border-inventory-border bg-inventory-surface-muted p-[8px] text-[10.5px] leading-snug">
      {updating.length > 0 && (
        <SummarySection title="Will update" tone="text-inventory-sec-pricing">
          {updating.map((r) => (
            <li key={r.key}>
              <strong>{variantLabel(r)}</strong> — {fieldChangeSummary(r)}
            </li>
          ))}
        </SummarySection>
      )}
      {missing.length > 0 && (
        <SummarySection title="Will add to store (missing)" tone="text-inventory-success-hover">
          {missing.map((r) => (
            <li key={r.key}>{variantLabel(r)}</li>
          ))}
        </SummarySection>
      )}
      {extra.length > 0 && (
        <SummarySection title="Will delete from store (extra)" tone="text-inventory-warning-ink">
          {extra.map((r) => (
            <li key={r.key}>{variantLabel(r)}</li>
          ))}
        </SummarySection>
      )}
    </div>
  );
}

function SummarySection({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`text-[9px] font-bold uppercase tracking-[0.3px] ${tone}`}>{title}</p>
      <ul className="mt-[2px] list-disc space-y-[1px] pl-[16px] text-inventory-text-muted">{children}</ul>
    </div>
  );
}
