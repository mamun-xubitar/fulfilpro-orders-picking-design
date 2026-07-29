'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';
import PoReceiveItemRow from './PoReceiveItemRow';
import type { usePurchaseOrders } from './hooks/usePurchaseOrders';
import type { LocationOption } from './types';

type PoReceiveModalProps = {
  po: ReturnType<typeof usePurchaseOrders>;
  locations: LocationOption[];
};

export default function PoReceiveModal({ po, locations }: PoReceiveModalProps) {
  const receive = po.receive;
  if (!receive.receiveOpen) return null;

  const checkedLocations = locations.filter((location) => receive.checkedLocationIds.has(location.id));

  return (
    <ModalShell
      title="Receive inventory"
      onClose={receive.close}
      wide
      footer={
        <ModalActions
          onCancel={receive.close}
          onConfirm={receive.submit}
          confirmLabel={receive.receiving ? 'Receiving...' : 'Receive'}
          disabled={receive.receiving || !receive.canSubmit}
        />
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 mb-2">Select the locations to receive stock into.</p>
          <ul className="flex flex-wrap gap-3">
            {locations.map((location) => (
              <li key={location.id}>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receive.checkedLocationIds.has(location.id)}
                    onChange={() => receive.toggleLocation(location.id)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  {location.name}
                </label>
              </li>
            ))}
          </ul>
        </div>

        {checkedLocations.length > 1 && (
          <p className="text-xs text-gray-500">Qty is divided evenly across the selected locations — adjust any box if it landed elsewhere.</p>
        )}

        <div className="space-y-3">
          {receive.drafts.map((draft) => (
            <PoReceiveItemRow
              key={draft.itemId}
              draft={draft}
              qty={receive.qtyById[draft.itemId] ?? '0'}
              onQtyChange={(value) => receive.setQty(draft.itemId, value)}
              checkedLocations={checkedLocations}
              allocations={receive.allocations[draft.itemId] ?? {}}
              onAllocationChange={(locationId, value) => receive.setAllocation(draft.itemId, locationId, value)}
              allocatedTotal={receive.getAllocatedTotal(draft.itemId)}
            />
          ))}
        </div>

        {receive.errors.general && <p className="text-sm text-red-600">{receive.errors.general}</p>}
      </div>
    </ModalShell>
  );
}
