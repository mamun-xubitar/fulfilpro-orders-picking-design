'use client';

import { getRoleLabel } from '@/lib/roles';
import type { OrderItem, OrderRow, WorkDetailsModalState } from './types';
import DialogShell from './dialogs/DialogShell';
import { dlgBtn } from './dialogs/dialogUi';

type WorkDetailsModalProps = {
  workDetails: WorkDetailsModalState;
  closeWorkDetails: () => void;
  userIsAdmin: boolean;
  deleteWorkRecord: (order: OrderRow, item: OrderItem, workId: string) => void;
  /** Admin: record more decoration work for this line. */
  onMarkDone?: () => void;
};

export default function WorkDetailsModal({ workDetails, closeWorkDetails, userIsAdmin, deleteWorkRecord, onMarkDone }: WorkDetailsModalProps) {
  const works = workDetails.item.decoration?.works ?? [];
  return (
    <DialogShell
      title="Decoration work"
      sub={`#${workDetails.order.number} · ${workDetails.item.name || workDetails.item.title}`}
      width={440}
      onClose={closeWorkDetails}
      footer={<>
        <button type="button" onClick={closeWorkDetails} className={dlgBtn.ghost}>Close</button>
        {userIsAdmin && onMarkDone && <button type="button" onClick={onMarkDone} className={dlgBtn.pri}>Mark decoration done</button>}
      </>}
    >
      {works.length === 0 ? <p className="py-6 text-center text-orders-text-subtle">No work recorded yet.</p> : (
        <div className="flex flex-col gap-2">
          {works.map((work) => (
            <div key={work.id} className="rounded-[9px] border border-orders-border bg-orders-surface-muted px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span><b className="text-orders-text">{work.workerName}</b><span className="text-orders-text-subtle"> · {getRoleLabel(work.workerRole)}</span></span>
                <span className="text-[10px] text-orders-text-subtle">{new Date(work.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-0.5 text-orders-text-muted">Done <b className="tabular-nums text-orders-text">{work.quantityDone}</b></p>
              {work.comments.map((comment, ci) => (
                <div key={ci} className="mt-1.5 text-[10.5px] text-orders-text-muted">
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {(['sizes', 'colors', 'remarks', 'location'] as const).map((field) => comment[field] ? <span key={field}><span className="text-orders-text-subtle">{field}:</span> {comment[field]}</span> : null)}
                  </div>
                  {(comment.files ?? []).length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-2">
                      {(comment.files ?? []).map((file, fi) => <a key={fi} href={file.url} target="_blank" rel="noopener noreferrer" className="text-orders-primary hover:underline">{file.name}</a>)}
                    </div>
                  )}
                </div>
              ))}
              {userIsAdmin && <button type="button" onClick={() => deleteWorkRecord(workDetails.order, workDetails.item, work.id)} className="mt-1.5 text-[10.5px] font-bold text-orders-danger hover:underline cursor-pointer">Remove this record</button>}
            </div>
          ))}
        </div>
      )}
    </DialogShell>
  );
}
