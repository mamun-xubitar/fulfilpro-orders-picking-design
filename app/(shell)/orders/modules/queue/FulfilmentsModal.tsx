'use client';

import type { OrdersPageBundle } from '../ordersPageContext';
import FulfillmentDetailsView from '../FulfillmentDetailsView';
import DialogShell from '../dialogs/DialogShell';
import { dlgBtn } from '../dialogs/dialogUi';

/** One card per parcel of the order: Admin edits / cancels directly, Staff request and then execute. */
export default function FulfilmentsModal({ p }: { p: OrdersPageBundle }) {
  const order = p.orders.find((o) => o.id === p.fulfillmentViewOrderId);
  if (!order) return null;
  const sub = `#${order.number} · ${order.canceled || order.closed ? 'locked, no edits' : p.userIsAdmin ? 'admin edits directly' : 'staff: request, approval, then execute'}`;
  const close = () => p.setFulfillmentViewOrderId(null);
  return (
    <DialogShell title="Fulfilments" sub={sub} width={440} onClose={close} footer={<button type="button" onClick={close} className={dlgBtn.ghost}>Close</button>}>
      <FulfillmentDetailsView p={p} order={order} />
    </DialogShell>
  );
}
