'use client';

import { ModalShell } from '@/components/ModalShell';
import type { OrdersPageBundle } from '../ordersPageContext';
import FulfillmentDetailsView from '../FulfillmentDetailsView';

/** One card per parcel of the order: Admin edits / cancels directly, Staff request and then execute. */
export default function FulfilmentsModal({ p }: { p: OrdersPageBundle }) {
  const order = p.orders.find((o) => o.id === p.fulfillmentViewOrderId);
  if (!order) return null;
  return (
    <ModalShell title={`Fulfilments · #${order.number}`} onClose={() => p.setFulfillmentViewOrderId(null)} wide>
      <FulfillmentDetailsView p={p} order={order} />
    </ModalShell>
  );
}
