'use client';

import { useRouter } from 'next/navigation';
import { deriveTaskState } from '@/app/(shell)/tasks/modules/utils';
import { DUE_TYPE_STYLES } from '@/app/(shell)/tasks/modules/constants';
import type { TaskDueType } from '@/app/(shell)/tasks/modules/types';

type Summary = { pending: number; overdue: number; seriouslyLate: number };
type TaskItem = { id: string; title: string; dueDate: string; dueType: TaskDueType; status: string; state: string; assigneeName: string };

export default function TasksButtonModal({
  isAdmin,
  source,
  tasks,
  tasksLoading,
  onClose,
}: {
  isAdmin: boolean;
  source: Summary;
  tasks: TaskItem[];
  tasksLoading: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Pending Tasks</h3>
            <div className="flex gap-2 text-xs mt-1">
              {source.overdue > 0 && (
                <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">{source.overdue} overdue</span>
              )}
              {source.seriouslyLate > 0 && (
                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">{source.seriouslyLate} late</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {tasksLoading && (
            <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
          )}
          {!tasksLoading && tasks.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">No open tasks</div>
          )}
          {tasks.map((task) => {
            const state = deriveTaskState(task.status, task.dueDate);
            const rowBg = state === 'seriously_late' ? 'bg-red-50' : state === 'overdue' ? 'bg-orange-50' : '';
            return (
              <button
                key={task.id}
                onClick={() => { onClose(); router.push(`/tasks?openTask=${task.id}`); }}
                className={`w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors duration-100 cursor-pointer ${rowBg}`}
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 leading-snug truncate">{task.title}</p>
                  <span className={`shrink-0 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${DUE_TYPE_STYLES[task.dueType].badge}`}>
                    {DUE_TYPE_STYLES[task.dueType].label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Due {new Date(task.dueDate).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  {isAdmin && <span className="ml-2 text-gray-400">· {task.assigneeName}</span>}
                  {state === 'overdue' && <span className="ml-2 text-orange-600 font-semibold">Overdue</span>}
                  {state === 'seriously_late' && <span className="ml-2 text-red-600 font-semibold">Seriously Late</span>}
                </p>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
          <button
            onClick={() => { onClose(); router.push('/tasks'); }}
            className="w-full text-center text-sm text-blue-600 font-semibold hover:underline cursor-pointer"
          >
            View all tasks →
          </button>
        </div>
      </div>
    </div>
  );
}
