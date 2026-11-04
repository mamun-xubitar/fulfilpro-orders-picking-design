'use client';

import { getRoleLabel } from '@/lib/roles';
import type { OrderItem, OrderRow, WorkDetailsModalState } from './types';

type WorkDetailsModalProps = {
  workDetails: WorkDetailsModalState;
  closeWorkDetails: () => void;
  userIsAdmin: boolean;
  deleteWorkRecord: (order: OrderRow, item: OrderItem, workId: string) => void;
};

export default function WorkDetailsModal({
  workDetails,
  closeWorkDetails,
  userIsAdmin,
  deleteWorkRecord,
}: WorkDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeWorkDetails}>
      <div className="w-full max-w-lg rounded-xl bg-orders-surface shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-orders-border px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-orders-text">Decoration work</h3>
            <p className="text-xs text-orders-text-subtle mt-0.5">Order {workDetails.order.number} · {workDetails.item.name || workDetails.item.title}</p>
          </div>
          <button onClick={closeWorkDetails} className="text-orders-text-subtle hover:text-orders-text-muted text-lg leading-none cursor-pointer">×</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {(workDetails.item.decoration?.works ?? []).length === 0 ? (
            <p className="text-sm text-orders-text-subtle">No work recorded yet.</p>
          ) : (
            (workDetails.item.decoration?.works ?? []).map((work) => (
              <div key={work.id} className="rounded-lg border border-orders-border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-medium text-orders-text">{work.workerName}</span>
                    <span className="text-orders-text-subtle"> · {getRoleLabel(work.workerRole)}</span>
                  </div>
                  <span className="text-[11px] text-orders-text-subtle">{new Date(work.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-orders-text-muted">Done {work.quantityDone}</p>
                {work.comments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {work.comments.map((comment, ci) => (
                      <div key={ci} className="text-[11px] text-orders-text-muted">
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {(['sizes', 'colors', 'remarks', 'location'] as const).map((field) =>
                            comment[field] ? (
                              <span key={field}><span className="text-orders-text-subtle">{field}:</span> {comment[field]}</span>
                            ) : null
                          )}
                        </div>
                        {(comment.files ?? []).length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-2">
                            {(comment.files ?? []).map((file, fi) => (
                              <a key={fi} href={file.url} target="_blank" rel="noopener noreferrer" className="text-orders-primary hover:underline">📎 {file.name}</a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {userIsAdmin && (
                  <button
                    onClick={() => deleteWorkRecord(workDetails.order, workDetails.item, work.id)}
                    className="mt-2 text-[11px] text-red-500 hover:text-orders-danger-ink"
                  >
                    Remove this record
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
