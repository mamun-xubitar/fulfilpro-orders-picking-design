import type { FulfillmentEditRequestRow } from './types';

type PendingRequestsPanelProps = {
  pendingRequests: FulfillmentEditRequestRow[];
  open: boolean;
  onToggle: () => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
};

export default function PendingRequestsPanel({
  pendingRequests,
  open,
  onToggle,
  onApprove,
  onReject,
}: PendingRequestsPanelProps) {
  if (pendingRequests.length === 0) return null;

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100 transition-colors duration-150 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">{pendingRequests.length}</span>
          <span className="text-sm font-semibold text-amber-800">Fulfillment permission request{pendingRequests.length > 1 ? 's' : ''} pending</span>
        </div>
        <svg className={`w-4 h-4 text-amber-600 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          {pendingRequests.map((req) => (
            <div key={req.id} className="px-4 py-3 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-sm min-w-0">
                  <p className="font-semibold text-gray-800">{req.requestedByName} &mdash; <span className="font-normal text-gray-600">{req.requestType === 'edit' ? 'Edit' : 'Cancel'} fulfillment</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">Order #{req.orderNumber} &bull; {new Date(req.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-gray-700 mt-1 italic truncate max-w-sm">&ldquo;{req.reason}&rdquo;</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onApprove(req.id)}
                    className="text-xs font-semibold text-white bg-green-600 rounded-lg px-3 py-1.5 hover:bg-green-700 cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(req.id)}
                    className="text-xs font-semibold text-white bg-red-500 rounded-lg px-3 py-1.5 hover:bg-red-600 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
