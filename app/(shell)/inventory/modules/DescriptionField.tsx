'use client';

import AiDescriptionField from './AiDescriptionField';
import { parseColoursInput, parseSizesInput } from './utils';
import type { useProductDetails } from './hooks/useProductDetails';

type DescriptionFieldProps = {
  details: ReturnType<typeof useProductDetails>;
  /** Collapses the editor to a one-line toolbar + one-line body, with an Expand button that
   * covers the panel with the full editor — only for the Product details panel, never the New
   * Product wizard (`ProductFieldsPanel embedded`). */
  compact?: boolean;
};

/** Product details' description field — thin adapter wiring the shared AiDescriptionField to the
 * product details draft. See AiDescriptionField for the AI generation UI/behaviour itself, and
 * StoreDraftDetails for the other caller (per-store publish/bulk-update drafts). */
export default function DescriptionField({ details: d, compact }: DescriptionFieldProps) {
  return (
    <AiDescriptionField
      value={d.form.description}
      onChange={d.setDescription}
      subjectKey={d.productId ?? ''}
      compact={compact}
      buildRequestData={() => ({
        productId: d.productId,
        name: d.form.name,
        brand: d.form.brand,
        category: d.form.category,
        productRemark: d.form.productRemark,
        sizes: parseSizesInput(d.form.sizes),
        colours: parseColoursInput(d.form.colours),
      })}
    />
  );
}
