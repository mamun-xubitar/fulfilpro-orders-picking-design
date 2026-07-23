'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, ProductSyncJob } from '../types';
import { formatSyncDate } from '../utils';

type UseInventorySyncArgs = {
  setError: (msg: string) => void;
};

export function useInventorySync({ setError }: UseInventorySyncArgs) {
  const [syncing, setSyncing] = useState(false);
  const [syncJob, setSyncJob] = useState<ProductSyncJob | null>(null);
  const [lastSynced, setLastSynced] = useState('');
  const [syncRefreshNeeded, setSyncRefreshNeeded] = useState(false);
  const [syncStoreIds, setSyncStoreIds] = useState<string[]>([]);
  const [syncStoreDropdownOpen, setSyncStoreDropdownOpen] = useState(false);
  const syncStoreDropdownRef = useRef<HTMLDivElement>(null);
  const activeSyncJobIdRef = useRef<string | null>(null);
  const completedSyncJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (syncStoreDropdownRef.current && !syncStoreDropdownRef.current.contains(e.target as Node)) {
        setSyncStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSyncStatus = useCallback(async (refreshAfterCompletion = false) => {
    const res = await fetch('/api/inventory/sync');
    const json = (await res.json()) as ApiResponse<{
      activeJob: ProductSyncJob | null;
      lastSuccessfulJob: ProductSyncJob | null;
      latestJob: ProductSyncJob | null;
    }>;

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to load product sync status');
    }

    setSyncJob(json.data.activeJob);
    if (json.data.activeJob) {
      activeSyncJobIdRef.current = json.data.activeJob.id;
    }

    if (json.data.lastSuccessfulJob?.finishedAt) {
      const completedJobId = json.data.lastSuccessfulJob.id;
      setLastSynced(`Last synced: ${formatSyncDate(json.data.lastSuccessfulJob.finishedAt)}`);

      if (
        refreshAfterCompletion &&
        activeSyncJobIdRef.current === completedJobId &&
        completedSyncJobIdRef.current !== completedJobId
      ) {
        completedSyncJobIdRef.current = completedJobId;
        activeSyncJobIdRef.current = null;
        setSyncRefreshNeeded(
          json.data.lastSuccessfulJob.totalCreated > 0 || json.data.lastSuccessfulJob.totalUpdated > 0
        );
      }
    }

    if (
      refreshAfterCompletion &&
      json.data.latestJob?.status === 'failed' &&
      activeSyncJobIdRef.current === json.data.latestJob.id
    ) {
      setError(json.data.latestJob.error || 'Product sync failed');
      activeSyncJobIdRef.current = null;
    }
  }, [setError]);

  useEffect(() => {
    let cancelled = false;

    const fetchSyncStatus = async () => {
      try {
        await loadSyncStatus(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load product sync status');
        }
      }
    };

    void fetchSyncStatus();

    return () => {
      cancelled = true;
    };
  }, [loadSyncStatus, setError]);

  useEffect(() => {
    if (!syncJob || (syncJob.status !== 'queued' && syncJob.status !== 'running')) return;

    const timer = window.setInterval(() => {
      void loadSyncStatus(true).catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load product sync status');
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [loadSyncStatus, syncJob, setError]);

  const handleSync = async () => {
    if (syncJob && (syncJob.status === 'queued' || syncJob.status === 'running')) return;

    setSyncing(true);
    setError('');
    try {
      const res = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeIds: syncStoreIds.length > 0 ? syncStoreIds : undefined }),
      });
      const json = (await res.json()) as ApiResponse<{ job: ProductSyncJob; alreadyRunning: boolean }>;

      if ((!res.ok && res.status !== 409) || !json.success) {
        throw new Error(json.message || 'Failed to queue product sync');
      }

      setSyncJob(json.data.job);
      activeSyncJobIdRef.current = json.data.job.id;
      setSyncRefreshNeeded(false);
      if (json.data.alreadyRunning) {
        toast.info('A product sync is already running.');
      } else {
        toast.success('Product sync queued.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue product sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncStoreToggle = (id: string) => {
    if (id === '__clear__') {
      setSyncStoreIds([]);
      return;
    }
    setSyncStoreIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const syncActive = syncJob?.status === 'queued' || syncJob?.status === 'running';
  const syncMessage = syncActive
    ? syncJob.status === 'queued'
      ? 'Sync queued'
      : `Syncing: ${syncJob.totalFetched} fetched`
    : lastSynced || 'Not synced yet';

  return {
    syncing,
    syncActive,
    syncStoreDropdownOpen,
    setSyncStoreDropdownOpen,
    syncStoreDropdownRef,
    syncRefreshNeeded,
    setSyncRefreshNeeded,
    syncMessage,
    handleSync,
    syncStoreIds,
    setSyncStoreIds,
    handleSyncStoreToggle,
  };
}
