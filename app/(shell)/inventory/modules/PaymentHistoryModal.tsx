'use client';

import { useEffect, useState } from 'react';
import { MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import useRequest from '@/hooks/useRequest';
import { SkeletonRows } from './Skeleton';
import type { PoPaymentHistoryRecord, PoPaymentListRecord } from './types';
import { formatDate, formatMoney, formatPoNumber } from './utils';

const ACTION_LABELS: Record<string, string> = { created: 'Created', updated: 'Edited', paid: 'Marked paid', unpaid: 'Marked unpaid' };
const TH = 'whitespace-nowrap px-2 py-1 text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle';

/** Every save of one payment, newest first — the audit trail behind a payment that is edited in place. */
export default function PaymentHistoryModal({ payment, onClose }: { payment: PoPaymentListRecord; onClose: () => void }) {
  const [history, setHistory] = useState<PoPaymentHistoryRecord[] | null>(null);
  const { request } = useRequest<{ history: PoPaymentHistoryRecord[] }>();

  useEffect(() => {
    request({ url: `/api/inventory/purchase-orders/${payment.purchaseOrderId}/payment`, method: 'GET', showToast: false, onSuccess: ({ data }) => setHistory(data.history) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.purchaseOrderId]);

  return (
    <ModalShell
      disableBackdropClose
      elevated
      compact
      title={`Payment history — ${formatPoNumber(payment.purchaseOrder.number)}`}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <button type="button" onClick={onClose} className={`w-full ${MODAL_FOOTER_BTN_SECONDARY}`}>
          Close
        </button>
      }
    >
      <div className="max-h-[min(24rem,60vh)] overflow-auto thin-scroll rounded-lg border border-inventory-border">
        <table aria-busy={history === null} className="w-full min-w-[620px] border-collapse text-[11px] leading-none">
          <thead>
            <tr className="border-b border-inventory-border bg-inventory-surface-muted text-left">
              <th className={TH}>When</th>
              <th className={TH}>Change</th>
              <th className={TH}>By</th>
              <th className={`${TH} text-center`}>Status</th>
              <th className={`${TH} text-right`}>Rate</th>
              <th className={`${TH} text-right`}>Buying</th>
              <th className={`${TH} text-right`}>Freight / Misc</th>
              <th className={`${TH} text-right`}>Total (AUD)</th>
            </tr>
          </thead>
          <tbody>
            {history === null ? (
              <SkeletonRows rows={3} cells={['text', 'text', 'text', 'badge', 'num', 'num', 'num', 'num']} />
            ) : (
              history.map((h) => (
                <tr key={h.id} className="border-b border-inventory-divider last:border-0">
                  <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{formatDate(h.createdAt)}</td>
                  <td className="px-2 py-1.5 font-medium text-inventory-text">{ACTION_LABELS[h.action] ?? h.action}</td>
                  <td className="px-2 py-1.5 text-inventory-text-muted">{h.actorName}</td>
                  <td className="px-2 py-1.5 text-center text-inventory-text-muted">{h.status === 'PAID' ? 'Paid' : 'Unpaid'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">
                    {h.currencyCode} {h.exchangeRate}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{formatMoney(h.buyingPrice)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">
                    {formatMoney(h.freight)} / {formatMoney(h.misc)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-inventory-text">${formatMoney(h.totalAud)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}
