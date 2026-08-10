'use client';

import type { TabCounts, TaskDueType, TaskStateFilter, UserOption } from './types';
import { TAB_FILTERS, DUE_TYPE_OPTIONS } from './constants';

type Props = {
  tab: TaskStateFilter;
  setTab: (t: TaskStateFilter) => void;
  search: string;
  setSearch: (s: string) => void;
  filterAssigneeId: string;
  setFilterAssigneeId: (id: string) => void;
  filterDueType: '' | TaskDueType;
  setFilterDueType: (t: '' | TaskDueType) => void;
  tabCounts: TabCounts;
  users: UserOption[];
  onAdd: () => void;
  onChat: () => void;
};

function countFor(tab: TaskStateFilter, counts: TabCounts): number {
  if (tab === 'all') return counts.total;
  if (tab === 'pending') return counts.pending;
  if (tab === 'overdue') return counts.overdue;
  if (tab === 'seriously_late') return counts.seriouslyLate;
  return counts.completed;
}

export default function TasksToolbar({
  tab, setTab, search, setSearch, filterAssigneeId, setFilterAssigneeId,
  filterDueType, setFilterDueType, tabCounts, users, onAdd, onChat,
}: Props) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {TAB_FILTERS.map((t) => {
            const count = countFor(t.id, tabCounts);
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onChat}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
          >
            + Chat
          </button>
          <button
            onClick={onAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
          >
            + Assign Task
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by title, description, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[240px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterAssigneeId}
          onChange={(e) => setFilterAssigneeId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">All Users</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>{u.name || u.email}</option>
          ))}
        </select>
        <select
          value={filterDueType}
          onChange={(e) => setFilterDueType(e.target.value as '' | TaskDueType)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">All Types</option>
          {DUE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
