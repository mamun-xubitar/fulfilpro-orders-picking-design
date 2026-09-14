'use client';

import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import PoFormBody from './PoFormBody';
import ReceivePoModal from './ReceivePoModal';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';
import type { VariantRow } from './types';

type PoModalsProps = { po: ReturnType<typeof usePurchaseOrder>; variants: VariantRow[] };

export default function PoModals({ po, variants }: PoModalsProps) {
  return (
    <>
      {po.createOpen && <CreatePoModal po={po} variants={variants} />}
      {po.receiveTarget && <ReceivePoModal po={po} />}
    </>
  );
}

function CreatePoModal({ po, variants }: { po: ReturnType<typeof usePurchaseOrder>; variants: VariantRow[] }) {
  return (
    <ModalShell disableBackdropClose
      title="Create purchase order"
      compact
      onClose={po.closeCreate}
      extraWide
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={po.closeCreate}
            className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => po.saveAndSend()}
            disabled={po.saving}
            className={`flex-1 ${MODAL_FOOTER_BTN_PRIMARY}`}
          >
            {po.saving ? 'Saving...' : 'Save and send'}
          </button>
        </div>
      }
    >
      <PoFormBody po={po} variants={variants} />
    </ModalShell>
  );
}
