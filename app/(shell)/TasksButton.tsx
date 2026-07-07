'use client';

import { useEffect, useRef, useState } from 'react';
import TasksButtonModal from '@/app/(shell)/TasksButtonModal';
import type { TaskDueType } from '@/app/(shell)/tasks/modules/types';

type Summary = { pending: number; overdue: number; seriouslyLate: number };
type TaskItem = { id: string; title: string; dueDate: string; dueType: TaskDueType; status: string; state: string; assigneeName: string };

const POLL_INTERVAL_MS = 30_000;
const AUTO_POPUP_INTERVAL_MS = 30 * 60_000;

export default function TasksButton({ isAdmin }: { isAdmin: boolean }) {
  const [mySummary, setMySummary] = useState<Summary>({ pending: 0, overdue: 0, seriouslyLate: 0 });
  const [badgeSummary, setBadgeSummary] = useState<Summary>({ pending: 0, overdue: 0, seriouslyLate: 0 });
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const hasAutoPoppedRef = useRef(false);

  function loadMySummary() {
    fetch('/api/tasks/my-summary')
      .then((r) => r.json() as Promise<{ success: boolean; data: Summary }>)
      .then((r) => {
        if (!r.success) return;
        setMySummary(r.data);
        const ownTotal = r.data.pending + r.data.overdue + r.data.seriouslyLate;
        if (ownTotal > 0 && !hasAutoPoppedRef.current) {
          hasAutoPoppedRef.current = true;
          openModal();
        }
      })
      .catch(() => {});
  }

  function loadBadgeSummary() {
    if (!isAdmin) return;
    fetch('/api/tasks/tab-counts')
      .then((r) => r.json() as Promise<{ success: boolean; data: Summary }>)
      .then((r) => { if (r.success) setBadgeSummary(r.data); })
      .catch(() => {});
  }

  useEffect(() => {
    loadMySummary();
    loadBadgeSummary();
    const pollId = window.setInterval(() => {
      loadMySummary();
      loadBadgeSummary();
    }, POLL_INTERVAL_MS);
    const autoPopupId = window.setInterval(() => {
      hasAutoPoppedRef.current = false;
      loadMySummary();
    }, AUTO_POPUP_INTERVAL_MS);
    return () => {
      window.clearInterval(pollId);
      window.clearInterval(autoPopupId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function loadTasks() {
    setTasksLoading(true);
    fetch('/api/tasks?state=all&pageSize=50')
      .then((r) => r.json() as Promise<{ success: boolean; data: { tasks: TaskItem[] } }>)
      .then((r) => {
        if (r.success) {
          setTasks(r.data.tasks.filter((t) => t.status !== 'COMPLETED'));
        }
      })
      .catch(() => {})
      .finally(() => setTasksLoading(false));
  }

  function openModal() {
    loadTasks();
    setOpen(true);
  }

  const source = isAdmin ? badgeSummary : mySummary;
  const total = source.pending + source.overdue + source.seriouslyLate;
  const seriouslyLate = source.seriouslyLate > 0;

  const iconColorClass = seriouslyLate ? 'text-red-600' : total > 0 ? 'text-orange-500' : 'text-gray-500';
  const badgeColorClass = seriouslyLate ? 'bg-red-600' : 'bg-orange-500';

  return (
    <div className="relative">
      <button
        onClick={openModal}
        className={`relative p-2 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150 cursor-pointer ${iconColorClass} ${seriouslyLate ? 'animate-shake' : ''}`}
        aria-label="Tasks"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        {total > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none ${badgeColorClass}`}>
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <TasksButtonModal
          isAdmin={isAdmin}
          source={source}
          tasks={tasks}
          tasksLoading={tasksLoading}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
