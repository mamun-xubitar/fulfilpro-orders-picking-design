'use client';

import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import { STATUS_STYLES } from './constants';
import { useInventoryAccess } from './InventoryAccess';
import { Plus } from './icons';
import { reorderVariants } from './RecommendTable';
import type { ProductRecord } from './types';
import { formatNumber, getAvailable, getStatus, variantTitle } from './utils';

type RecommendVariantsModalProps = {
  product: ProductRecord;
  onClose: () => void;
  onCreatePo: (product: ProductRecord, variantIds: string[]) => void;
};

const TH = 'px-2 py-1 text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle';

/** Read-only stock picture of one product's variants — why each is (or isn't) flagged Reorder, and
 * how short it is — so the buyer knows what to put on the purchase order. */
export default function RecommendVariantsModal({ product, onClose, onCreatePo }: RecommendVariantsModalProps) {
  const { canEdit } = useInventoryAccess();
  const flagged = reorderVariants(product);
  // Reorder variants first, then the rest, each group keeping the product's own order.
  const rows = [...flagged, ...product.variants.filter((v) => getStatus(v) !== 'below')];

  return (
    <ModalShell
      disableBackdropClose
      title={`Variants — ${product.name}`}
      compact
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onClose} className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}>
            Close
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreatePo(product, flagged.map((v) => v.id));
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 ${MODAL_FOOTER_BTN_PRIMARY}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Create PO for {flagged.length} variant{flagged.length === 1 ? '' : 's'}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-2">
        <div className="rounded-[7px] border border-inventory-border bg-inventory-surface-muted p-2 text-[11px] text-inventory-text-muted">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-inventory-text">{product.itemNo}</span>
            <span>
              <span className="text-inventory-text-subtle">Brand: </span>
              {product.brand || '—'}
            </span>
            <span>
              <span className="text-inventory-text-subtle">Suppliers: </span>
              {product.suppliers.length > 0 ? product.suppliers.map((s) => s.name).join(', ') : '—'}
            </span>
            <span>
              <span className="text-inventory-text-subtle">Default PO qty: </span>
              {formatNumber(product.poQuantity)}
            </span>
          </div>
          <p className="mt-1.5 text-inventory-text-subtle">
            A variant is <span className="font-semibold text-inventory-danger-hover">Reorder</span> when Available (On hand − Allocated) is below its Trigger.
            Incoming is already on open purchase orders and isn&apos;t counted — check it before ordering more. <span className="font-semibold">Create PO</span> pre-fills the Reorder variants; you set the quantities and supplier.
          </p>
        </div>

        <div className="thin-scroll max-h-[calc(60dvh/var(--page-zoom,1))] overflow-auto rounded-lg border border-inventory-border">
          <table className="w-full min-w-[600px] border-collapse text-[11px] leading-none">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-inventory-border bg-inventory-surface-muted">
                <th className={`${TH} text-left`}>Variant</th>
                <th className={`${TH} text-left`}>SKU</th>
                <th className={`${TH} text-right`}>On hand</th>
                <th className={`${TH} text-right`}>Allocated</th>
                <th className={`${TH} text-right`}>Available</th>
                <th className={`${TH} text-right`}>Trigger</th>
                <th className={`${TH} text-right`}>Incoming</th>
                <th className={`${TH} text-center`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => {
                const status = getStatus(v);
                const style = STATUS_STYLES[status];
                const available = getAvailable(v);
                return (
                  <tr key={v.id} className={`border-b border-inventory-divider last:border-0 ${style.row}`}>
                    <td className="px-2 py-1.5 font-medium text-inventory-text-muted">{variantTitle(v)}</td>
                    <td className="px-2 py-1.5 text-inventory-text-subtle">{v.sku ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{formatNumber(v.stockOnHand)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{formatNumber(v.allocated)}</td>
                    <td className={`px-2 py-1.5 text-right font-semibold tabular-nums ${status === 'below' ? 'text-inventory-danger-hover' : 'text-inventory-text-muted'}`}>{formatNumber(available)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{formatNumber(v.trigger)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{formatNumber(v.incoming)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${style.badge}`}>{style.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ModalShell>
  );
}
