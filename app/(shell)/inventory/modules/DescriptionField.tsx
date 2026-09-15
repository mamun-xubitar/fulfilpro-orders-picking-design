'use client';

import AiDescriptionField from './AiDescriptionField';
import { parseColoursInput, parseSizesInput } from './utils';
import type { useProductDetails } from './hooks/useProductDetails';

type DescriptionFieldProps = {
  details: ReturnType<typeof useProductDetails>;
  /** Enables the header Show Details button + fixed-height editor — only for the Product
   * details panel, never the New Product wizard (`ProductFieldsPanel embedded`). */
  showDetailsButton?: boolean;
};

/** Product details' description field — thin adapter wiring the shared AiDescriptionField to the
 * product details draft. See AiDescriptionField for the AI generation UI/behaviour itself, and
 * StoreDraftDetails for the other caller (per-store publish/bulk-update drafts). */
export default function DescriptionField({ details: d, showDetailsButton }: DescriptionFieldProps) {
  return (
    <AiDescriptionField
      value={d.form.description}
      onChange={d.setDescription}
      subjectKey={d.productId ?? ''}
      showDetailsButton={showDetailsButton}
      buildRequestData={() => ({
        productId: d.productId,
        name: d.form.name,
        brand: d.form.brand,
        category: d.form.category,
        remarks: d.form.remarks,
        sizes: parseSizesInput(d.form.sizes),
        colours: parseColoursInput(d.form.colours),
      })}
    />
  );
}
