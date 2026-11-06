'use client';

import { ModalShell } from '@/components/ModalShell';
import AnimatedStepBody from './newProduct/AnimatedStepBody';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import PoFormBody from './PoFormBody';
import ReceivePoModal from './ReceivePoModal';
import type { LocationOption } from './hooks/useLocations';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';
import type { VariantRow } from './types';

type PoModalsProps = { po: ReturnType<typeof usePurchaseOrder>; variants: VariantRow[]; locations: LocationOption[] };

export default function PoModals({ po, variants, locations }: PoModalsProps) {
  return (
    <>
      {po.createOpen && <CreatePoModal po={po} variants={variants} />}
      {po.receiveTarget && <ReceivePoModal po={po} locations={locations} />}
    </>
  );
}

export function CreatePoModal({ po, variants }: { po: ReturnType<typeof usePurchaseOrder>; variants: VariantRow[] }) {
  return (
    <ModalShell disableBackdropClose
      title="Create purchase order"
      compact
      onClose={po.closeCreate}
      wide
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={po.closeCreate}
            className={`flex-1 ${WIZARD_BTN_SECONDARY}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => po.saveAndSend()}
            disabled={po.saving}
            className={`flex-1 ${WIZARD_BTN_PRIMARY}`}
          >
            {po.saving ? (
              <>
                {SPINNER}
                Saving…
              </>
            ) : (
              'Save and send'
            )}
          </button>
        </div>
      }
    >
      <div className={WIZARD_CARD_CLASS}>
        <AnimatedStepBody minHeightClassName="min-h-0">
          <PoFormBody compact po={po} variants={variants} />
        </AnimatedStepBody>
      </div>
    </ModalShell>
  );
}
