'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TabCounts, TaskRow } from '../types';

type ListResponse = { tasks: TaskRow[]; total: number };

export function useTasksData(params: {
  active: boolean;
  queryString: string;
  countQueryString: string;
}) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState<TabCounts>({ total: 0, pending: 0, overdue: 0, seriouslyLate: 0, completed: 0, recurring: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [resolvedFetchKey, setResolvedFetchKey] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchKey = `${params.queryString}|${refreshKey}`;
  const loading = params.active && fetchKey !== resolvedFetchKey;

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!params.active) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const currentFetchKey = `${params.queryString}|${refreshKey}`;

    fetch(`/api/tasks?${params.queryString}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<{ success: boolean; data: ListResponse }>)
      .then((r) => {
        if (r.success) {
          setTasks(r.data.tasks);
          setTotal(r.data.total);
        }
        setResolvedFetchKey(currentFetchKey);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== 'AbortError') setResolvedFetchKey(currentFetchKey);
      });

    return () => ctrl.abort();
  }, [params.active, params.queryString, refreshKey]);

  useEffect(() => {
    const qs = params.countQueryString;
    fetch(`/api/tasks/tab-counts${qs ? `?${qs}` : ''}`)
      .then((r) => r.json() as Promise<{ success: boolean; data: TabCounts }>)
      .then((r) => { if (r.success) setTabCounts(r.data); })
      .catch(() => {});
  }, [params.countQueryString, refreshKey]);

  return { tasks, setTasks, total, tabCounts, loading, bumpRefresh };
}
