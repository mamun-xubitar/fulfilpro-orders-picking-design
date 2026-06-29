'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { deriveTaskState } from '@/app/(shell)/tasks/modules/utils';

type Summary = { pending: number; overdue: number; seriouslyLate: number };
type TaskItem = { id: string; title: string; dueDate: string; status: string; state: string; assigneeName: string };

const POLL_INTERVAL_MS = 30_000;

export default function TaskReminderBubble() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary>({ pending: 0, overdue: 0, seriouslyLate: 0 });
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Drag state
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function loadSummary() {
    fetch('/api/tasks/my-summary')
      .then((r) => r.json() as Promise<{ success: boolean; data: Summary }>)
      .then((r) => { if (r.success) setSummary(r.data); })
      .catch(() => {});
  }

  useEffect(() => {
    loadSummary();
    const id = window.setInterval(loadSummary, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

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

  function togglePanel() {
    if (!panelOpen) loadTasks();
    setPanelOpen((prev) => !prev);
  }

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (bubbleRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setPanelOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const nx = e.clientX - dragOffset.current.x;
      const ny = e.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - (bubbleRef.current?.offsetWidth ?? 56);
      const maxY = window.innerHeight - (bubbleRef.current?.offsetHeight ?? 56);
      setPos({ x: Math.max(0, Math.min(nx, maxX)), y: Math.max(0, Math.min(ny, maxY)) });
    }
    function onMouseUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const total = summary.pending + summary.overdue + summary.seriouslyLate;
  if (total === 0) return null;

  const urgent = summary.seriouslyLate > 0;
  const overdue = summary.overdue > 0;

  return (
    <>
      {/* Bubble */}
      <div
        ref={bubbleRef}
        onMouseDown={onMouseDown}
        className="fixed z-[60] select-none"
        style={{ right: pos.x, bottom: pos.y }}
      >
        <button
          onClick={togglePanel}
          title="Open my tasks"
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center relative cursor-pointer transition-colors duration-150 ${
            urgent
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : overdue
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-white text-gray-900 text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow border border-gray-200">
            {total > 99 ? '99+' : total}
          </span>
        </button>
      </div>

      {/* Panel */}
      {panelOpen && (
        <div
          ref={panelRef}
          className="fixed z-[61] bg-white border border-gray-200 rounded-2xl shadow-2xl w-80 max-h-[420px] flex flex-col"
          style={{ right: pos.x + 64, bottom: pos.y }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <span className="text-sm font-semibold text-gray-900">My Open Tasks ({total})</span>
            <div className="flex gap-2 text-xs">
              {summary.overdue > 0 && (
                <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">{summary.overdue} overdue</span>
              )}
              {summary.seriouslyLate > 0 && (
                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">{summary.seriouslyLate} late</span>
              )}
            </div>
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
                  onClick={() => { setPanelOpen(false); router.push(`/tasks?openTask=${task.id}`); }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors duration-100 cursor-pointer ${rowBg}`}
                >
                  <p className="text-sm font-medium text-gray-900 leading-snug truncate">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Due {new Date(task.dueDate).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    {state === 'overdue' && <span className="ml-2 text-orange-600 font-semibold">Overdue</span>}
                    {state === 'seriously_late' && <span className="ml-2 text-red-600 font-semibold">Seriously Late</span>}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 shrink-0">
            <button
              onClick={() => { setPanelOpen(false); router.push('/tasks'); }}
              className="w-full text-center text-sm text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              View all tasks →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
