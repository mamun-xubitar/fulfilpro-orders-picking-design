'use client';

import type { OrdersPageBundle } from '../ordersPageContext';
import { Icon } from './icons';

/** Fulfilment edit / cancel requests waiting for an admin: one amber line per request (Admin only). */
export default function ApprovalsStrip({ p }: { p: OrdersPageBundle }) {
  if (!p.caps.admin || p.pendingRequests.length === 0) return null;
  const btn = 'h-6 rounded-md border px-2 text-[10.5px] font-semibold cursor-pointer';
  return (
    <div className="flex flex-col gap-1">
      {p.pendingRequests.map((req) => (
        <div key={req.id} className="flex h-[30px] items-center gap-2 rounded-lg border border-orders-warning-border bg-orders-warning-soft pl-2.5 pr-1.5 text-[11px] text-orders-warning-ink">
          <Icon name="user" className="h-3.5 w-3.5" />
          <b>{req.requestType === 'edit' ? 'Edit' : 'Cancel'} fulfilment request awaiting approval</b>
          <span className="min-w-0 flex-1 truncate text-orders-warning">{req.requestedByName} · order #{req.orderNumber} · “{req.reason}”</span>
          <button type="button" onClick={() => { p.setSearchInput(req.orderNumber); }} className={`${btn} border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted`}>View order</button>
          <button type="button" onClick={() => void p.handleAdminApproveRequest(req.id)} className={`${btn} border-orders-primary bg-orders-primary text-white hover:bg-orders-primary-hover`}>Approve</button>
          <button type="button" onClick={() => void p.handleAdminRejectRequest(req.id)} className={`${btn} border-orders-danger-border bg-orders-danger-soft text-orders-danger-ink hover:brightness-95`}>Reject</button>
        </div>
      ))}
    </div>
  );
}
