import type { TaskState } from './types';

export function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatAge(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '0m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.round((minutes % 1440) / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function deriveTaskState(status: string, dueDate: string): TaskState {
  if (status === 'COMPLETED') return 'completed';
  const lateMs = Date.now() - new Date(dueDate).getTime();
  if (lateMs <= 0) return 'pending';
  const lateDays = lateMs / 86_400_000;
  if (lateDays > 2) return 'seriously_late';
  return 'overdue';
}

export function taskRowKey(taskId: string): string {
  return `task-${taskId}`;
}
