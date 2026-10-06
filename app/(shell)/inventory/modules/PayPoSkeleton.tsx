'use client';

import { ModalShell } from '@/components/ModalShell';
import { Bone } from './Skeleton';
import { WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';

/** Stand-in for the Pay modal while a purchase order is fetched by id (Payments tab → Edit). It
 * mirrors the loaded layout — product header, three cost rows, then the date / reference / remark
 * card — so the modal opens at its final size and nothing shifts when the form arrives. */
export default function PayPoSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell
      disableBackdropClose
      elevated
      compact
      title="Payment"
      onClose={onClose}
      maxWidthClass="max-w-[520px]"
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onClose} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            Cancel
          </button>
          <button type="button" disabled className={`flex-1 ${WIZARD_BTN_PRIMARY}`}>
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-2" aria-busy="true" aria-label="Loading payment">
        <div className={`${WIZARD_CARD_CLASS} space-y-[10px]`}>
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-[6px]">
              <Bone className="h-[11px] w-44" />
              <Bone className="h-[8px] w-28" />
            </div>
            <Bone className="h-[16px] w-12 rounded-full" />
          </div>
          {['w-[140px]', 'w-[88px]', 'w-[160px]'].map((width, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <Bone className="h-[9px] w-32" />
              <Bone className={`h-[22px] rounded-[7px] ${width}`} />
            </div>
          ))}
        </div>
        <div className={`${WIZARD_CARD_CLASS} grid grid-cols-2 gap-x-3 gap-y-2`}>
          {[0, 1].map((i) => (
            <div key={i} className="space-y-[5px]">
              <Bone className="h-[8px] w-14" />
              <Bone className="h-[24px] w-full rounded-[7px]" />
            </div>
          ))}
          <div className="col-span-2 space-y-[5px]">
            <Bone className="h-[8px] w-14" />
            <Bone className="h-[44px] w-full rounded-[7px]" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
