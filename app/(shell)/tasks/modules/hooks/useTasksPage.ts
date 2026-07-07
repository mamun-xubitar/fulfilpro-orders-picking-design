'use client';

import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useTasksFilters } from './useTasksFilters';
import { useTasksData } from './useTasksData';
import { useTaskMutations } from './useTaskMutations';
import { useTaskMessages } from './useTaskMessages';
import { useTaskReport } from './useTaskReport';

export function useTasksPage() {
  const { data: session } = useSession();
  const userIsAdmin = session?.user?.role === 'admin';
  const searchParams = useSearchParams();
  const openTaskId = searchParams.get('openTask');
  const openTaskHandled = useRef<string | null>(null);

  const filters = useTasksFilters();

  const listQs = filters.buildQueryString();
  const countQs = filters.buildCountQueryString();

  const data = useTasksData({ queryString: listQs, countQueryString: countQs });
  const mutations = useTaskMutations({ bumpRefresh: data.bumpRefresh, setTasks: data.setTasks });
  const messages = useTaskMessages(data.setTasks);
  const report = useTaskReport(filters.tab === 'completed');

  // Deep-link: open messages modal when ?openTask=<id> is in the URL
  useEffect(() => {
    if (!openTaskId || openTaskId === openTaskHandled.current) return;
    if (data.tasks.length === 0) return;
    const task = data.tasks.find((t) => t.id === openTaskId);
    if (task) {
      openTaskHandled.current = openTaskId;
      messages.openMessages(task);
    }
  }, [openTaskId, data.tasks, messages]);

  return {
    session,
    userIsAdmin,
    // filters
    tab: filters.tab,
    setTab: filters.setTab,
    search: filters.search,
    setSearch: filters.setSearch,
    filterAssigneeId: filters.filterAssigneeId,
    setFilterAssigneeId: filters.setFilterAssigneeId,
    filterDueType: filters.filterDueType,
    setFilterDueType: filters.setFilterDueType,
    page: filters.page,
    setPage: filters.setPage,
    // data
    tasks: data.tasks,
    total: data.total,
    tabCounts: data.tabCounts,
    dataLoading: data.loading,
    bumpRefresh: data.bumpRefresh,
    // mutations
    ...mutations,
    // messages
    ...messages,
    // report
    report: report.report,
    reportLoading: report.loading,
  };
}
