'use client';

import type { OrderRow } from './types';
import type { OrdersPageBundle } from './ordersPageContext';
import { formatFulfillmentDate } from './utils';
import FulfillmentConfActions from './FulfillmentConfActions';

type FulfillmentDetailsViewProps = {
  p: OrdersPageBundle;
  order: OrderRow;
};

export default function FulfillmentDetailsView({ p, order }: FulfillmentDetailsViewProps) {
  return (
    <div className="min-w-0">
            <div className="space-y-3">
        {order.fulfillmentItems.confirmations.map((conf, confIndex) => (
          <div key={conf.id ?? confIndex} className="bg-orders-surface rounded-lg border border-orders-border p-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs text-orders-text-muted">
              {conf.confirmedAt && (
                <span><span className="font-medium text-orders-text-subtle">Confirmed:</span> {new Date(conf.confirmedAt).toLocaleString()}</span>
              )}
              {conf.fulfillmentDate && (
                <span><span className="font-medium text-orders-text-subtle">Fulfilled:</span> {formatFulfillmentDate(conf.fulfillmentDate)}</span>
              )}
              {conf.shopifyFulfillmentStatus && (
                <span><span className="font-medium text-orders-text-subtle">Status:</span> {conf.shopifyFulfillmentStatus}</span>
              )}
              {conf.trackingInfo?.company && (
                <span><span className="font-medium text-orders-text-subtle">Carrier:</span> {conf.trackingInfo.company}</span>
              )}
              {conf.trackingInfo?.number && (
                <span>
                  <span className="font-medium text-orders-text-subtle">Tracking:</span>{' '}
                  {conf.trackingInfo.url ? (
                    <a href={conf.trackingInfo.url} target="_blank" rel="noopener noreferrer" className="text-orders-primary hover:underline">{conf.trackingInfo.number}</a>
                  ) : conf.trackingInfo.number}
                </span>
              )}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-orders-divider">
                  <th className="text-left py-1 text-orders-text-subtle font-medium">Product</th>
                  <th className="text-left py-1 text-orders-text-subtle font-medium">SKU</th>
                  <th className="text-center py-1 text-orders-text-subtle font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {conf.lines.map((line) => {
                  const lineItem = order.items.find((i) => i.id === line.lineItemId);
                  return (
                    <tr key={line.lineItemId} className="border-b border-orders-divider">
                      <td className="py-1.5 pr-2 text-orders-text-body">{lineItem?.name ?? line.lineItemId}</td>
                      <td className="py-1.5 pr-2 font-mono text-orders-text-subtle">{lineItem?.sku || '-'}</td>
                      <td className="py-1.5 text-center text-orders-text-body">{line.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {conf.barcodes && conf.barcodes.length > 0 && (
              <div className="mt-2 text-xs text-orders-text-subtle">
                <span className="font-medium">Barcodes:</span> {conf.barcodes.join(', ')}
              </div>
            )}
            {(p.userIsAdmin || p.userIsStaff) && (
              <FulfillmentConfActions p={p} order={order} conf={conf} confId={conf.id ?? String(confIndex)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
