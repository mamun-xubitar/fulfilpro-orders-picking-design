'use client';

import type { OrdersPageBundle } from '../ordersPageContext';
import { Icon } from './icons';

/** Fulfilment edit / cancel requests waiting for an admin: one collapsible amber section listing every request (Admin only). */
export default function ApprovalsStrip({ p }: { p: OrdersPageBundle }) {
  if (!p.caps.admin || p.pendingRequests.length === 0) return null;
  const count = p.pendingRequests.length;
  const open = p.pendingRequestsPanelOpen;
  const btn = 'h-6 rounded-md border px-2 text-[10.5px] font-semibold cursor-pointer';
  return (
    <div className="overflow-hidden rounded-lg border border-orders-warning-border bg-orders-warning-soft">
      <button
        type="button"
        onClick={() => p.setPendingRequestsPanelOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex h-[30px] w-full cursor-pointer items-center gap-2 px-2.5 text-left text-[11px] text-orders-warning-ink hover:brightness-95"
      >
        <Icon name="user" className="h-3.5 w-3.5" />
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-orders-warning px-1 text-[10px] font-bold text-white">{count}</span>
        <b className="flex-1">Fulfilment request{count > 1 ? 's' : ''} awaiting approval</b>
        <Icon name="chevronDown" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="max-h-[40vh] divide-y divide-orders-border overflow-y-auto border-t border-orders-warning-border bg-orders-surface">
          {p.pendingRequests.map((req) => (
            <div key={req.id} className="flex flex-wrap items-start justify-between gap-3 px-2.5 py-2">
              <div className="min-w-0 text-[11px]">
                <p className="font-semibold text-orders-text-body">
                  {req.requestedByName} — <span className="font-normal">{req.requestType === 'edit' ? 'Edit' : 'Cancel'} fulfilment</span>
                  <span className="ml-2 text-[10.5px] font-normal text-orders-text-muted"><b className="font-bold text-orders-text-body">Order #{req.orderNumber}</b> • {new Date(req.createdAt).toLocaleString()}</span>
                </p>
                <p title={req.reason} className="mt-0.5 max-w-xl truncate text-[10.5px] italic text-orders-text-body">“{req.reason}”</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" onClick={() => { p.setSearchInput(req.orderNumber); }} className={`${btn} border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted`}>View order</button>
                <button type="button" onClick={() => void p.handleAdminApproveRequest(req.id)} className={`${btn} border-orders-primary bg-orders-primary text-white hover:bg-orders-primary-hover`}>Approve</button>
                <button type="button" onClick={() => void p.handleAdminRejectRequest(req.id)} className={`${btn} border-orders-danger-border bg-orders-danger-soft text-orders-danger-ink hover:brightness-95`}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
