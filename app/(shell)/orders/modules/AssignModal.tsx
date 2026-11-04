'use client';

import { getRoleLabel } from '@/lib/roles';
import type { AssignModalState, DecoratorUser } from './types';
import DialogShell from './dialogs/DialogShell';
import { dlgBtn, dlgInput, Field } from './dialogs/dialogUi';

type AssignModalProps = {
  assignModal: AssignModalState;
  setAssignModal: React.Dispatch<React.SetStateAction<AssignModalState | null>>;
  closeAssignModal: () => void;
  removeAssignment: (assignmentId: string) => void;
  submitAssignment: () => void;
  decoratorUsers: DecoratorUser[];
  decoratorUsersLoaded: boolean;
};

/** Assign decorators to a line (Admin): current assignees with Remove, then pick a decorator and a due date. */
export default function AssignModal({ assignModal, setAssignModal, closeAssignModal, removeAssignment, submitAssignment, decoratorUsers, decoratorUsersLoaded }: AssignModalProps) {
  return (
    <DialogShell
      title="Assign decoration"
      sub={`#${assignModal.orderNumber} · ${assignModal.productName}`}
      width={360}
      busy={assignModal.saving}
      onClose={closeAssignModal}
      footer={<>
        <button type="button" onClick={closeAssignModal} disabled={assignModal.saving} className={dlgBtn.ghost}>Cancel</button>
        <button type="button" onClick={submitAssignment} disabled={assignModal.saving || !assignModal.selectedUserId} className={dlgBtn.pri}>{assignModal.saving ? 'Assigning…' : 'Assign'}</button>
      </>}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[9.5px] font-bold uppercase tracking-[.4px] text-orders-text-subtle">Current assignees</span>
          {assignModal.assignments.length === 0 ? <p className="text-orders-text-subtle">No decorators assigned yet.</p> : (
            <ul className="flex flex-col gap-1">
              {assignModal.assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-[7px] border border-orders-border bg-orders-surface-muted py-1 pl-2 pr-1.5">
                  <span className="min-w-0"><b className="block truncate text-orders-text">{a.assigneeName}</b><span className="text-[10px] text-orders-text-subtle">{getRoleLabel(a.assigneeRole)}{a.dueDate ? ` · due ${a.dueDate}` : ''}</span></span>
                  <button type="button" onClick={() => removeAssignment(a.id)} disabled={assignModal.removingId === a.id} className={dlgBtn.danger.replace('h-7', 'h-5').replace('text-[11px]', 'text-[9.5px]').replace('px-[9px]', 'px-1.5')}>{assignModal.removingId === a.id ? 'Removing…' : 'Remove'}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Field label="Decorator" hint={decoratorUsersLoaded && decoratorUsers.length === 0 ? 'No active decorator users. Create them in Users.' : undefined}>
          <select value={assignModal.selectedUserId} onChange={(e) => setAssignModal((prev) => (prev ? { ...prev, selectedUserId: e.target.value } : prev))} className={`${dlgInput} cursor-pointer`}>
            <option value="">Select a decorator…</option>
            {decoratorUsers.map((u) => <option key={u.id} value={u.id}>{u.name} — {getRoleLabel(u.role)}</option>)}
          </select>
        </Field>
        <Field label="Complete by (optional)">
          <input type="date" value={assignModal.dueDate} onChange={(e) => setAssignModal((prev) => (prev ? { ...prev, dueDate: e.target.value } : prev))} className={dlgInput} />
        </Field>
        {assignModal.error && <p className="text-[11px] text-orders-danger">{assignModal.error}</p>}
      </div>
    </DialogShell>
  );
}
