'use client';

import { ModalShell } from '@/components/ModalShell';
import LocationRemapFields from './LocationRemapFields';
import type { LocationRemapPending } from './hooks/useVariantsMatrix';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import { formatNumber, variantTitle } from './utils';
import type { ProductRecord } from './types';

/** Single variant's location save drops a holding location — confirm where its stock moves. */
export default function VariantLocationRemapModal({
  pending,
  product,
  saving,
  onCancel,
  onTarget,
  onConfirm,
}: {
  pending: LocationRemapPending;
  product: ProductRecord | null;
  saving: boolean;
  onCancel: () => void;
  onTarget: (fromId: string, toId: string) => void;
  onConfirm: () => void;
}) {
  const variant = product?.variants.find((v) => v.id === pending.variantId);
  const complete = pending.removed.every((r) => pending.remap[r.id] && pending.destinations.some((d) => d.id === pending.remap[r.id]));
  return (
    <ModalShell
      disableBackdropClose
      title={`Move stock — ${variant ? variantTitle(variant) : 'variant'}`}
      compact
      elevated
      onClose={onCancel}
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onCancel} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={saving || !complete} className={`flex-1 ${WIZARD_BTN_PRIMARY}`}>
            {saving && SPINNER}
            {saving ? 'Saving...' : 'Move & save'}
          </button>
        </div>
      }
    >
      <div className={`${WIZARD_CARD_CLASS} space-y-3`}>
        <LocationRemapFields
          needs={pending.removed.map((r) => ({ id: r.id, name: r.name, detail: formatNumber(r.quantity) }))}
          destinations={pending.destinations}
          remap={pending.remap}
          onChange={onTarget}
        />
      </div>
    </ModalShell>
  );
}
