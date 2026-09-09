'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
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
    <ModalShell
      title="Create purchase order"
      onClose={po.closeCreate}
      extraWide
      footer={<ModalActions onCancel={po.closeCreate} onConfirm={() => po.saveAndSend()} confirmLabel={po.saving ? 'Saving...' : 'Save and send'} disabled={po.saving} />}
    >
      <PoFormBody po={po} variants={variants} />
    </ModalShell>
  );
}
