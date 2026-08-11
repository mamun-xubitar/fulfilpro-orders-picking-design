'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useRequest from '@/hooks/useRequest';
import type { TaskRow } from '../types';

type ListResponse = { tasks: TaskRow[]; total: number };

export function useRecurringTasks(params: { active: boolean; queryString: string }) {
  const [parents, setParents] = useState<TaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [childrenByParent, setChildrenByParent] = useState<Record<string, TaskRow[]>>({});
  const [childrenLoading, setChildrenLoading] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [resolvedFetchKey, setResolvedFetchKey] = useState<string | null>(null);

  const fetchKey = `${params.queryString}|${refreshKey}`;
  const loading = params.active && fetchKey !== resolvedFetchKey;

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!params.active) return;
    const currentFetchKey = `${params.queryString}|${refreshKey}`;
    fetch(`/api/tasks/recurring?${params.queryString}`)
      .then((r) => r.json() as Promise<{ success: boolean; data: ListResponse }>)
      .then((r) => {
        if (r.success) {
          setParents(r.data.tasks);
          setTotal(r.data.total);
        }
        setResolvedFetchKey(currentFetchKey);
      })
      .catch(() => setResolvedFetchKey(currentFetchKey));
  }, [params.active, params.queryString, refreshKey]);

  const toggleExpand = useCallback((parentId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }, []);

  // Tracks which parentIds have an in-flight or completed children fetch. A ref (not
  // state) so it updates synchronously and never becomes an effect dependency itself —
  // depending on childrenByParent/childrenLoading here would re-run this effect every
  // time it sets them, and on any failed fetch neither ever gets marked "settled",
  // causing an endless refetch/loading-flicker loop.
  const fetchedParentIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    expandedIds.forEach((parentId) => {
      if (fetchedParentIds.current.has(parentId)) return;
      fetchedParentIds.current.add(parentId);

      setChildrenLoading((prev) => ({ ...prev, [parentId]: true }));
      fetch(`/api/tasks/recurring/${parentId}/children`)
        .then((r) => r.json() as Promise<{ success: boolean; data: TaskRow[] }>)
        .then((r) => {
          setChildrenByParent((prev) => ({ ...prev, [parentId]: r.success ? r.data : [] }));
        })
        .catch(() => {
          setChildrenByParent((prev) => ({ ...prev, [parentId]: [] }));
        })
        .finally(() => setChildrenLoading((prev) => ({ ...prev, [parentId]: false })));
    });
  }, [expandedIds]);

  const { request: requestStop } = useRequest();

  function stopRecurring(parentId: string) {
    void requestStop({
      url: `/api/tasks/recurring/${parentId}/stop`,
      method: 'POST',
      showToast: true,
      successMessage: 'Recurring task stopped',
      onSuccess: () => bumpRefresh(),
    });
  }

  return {
    recurringParents: parents,
    recurringTotal: total,
    recurringLoading: loading,
    expandedIds,
    childrenByParent,
    childrenLoading,
    toggleExpand,
    stopRecurring,
    bumpRecurringRefresh: bumpRefresh,
  };
}
