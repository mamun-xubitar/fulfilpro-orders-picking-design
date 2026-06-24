'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, TrackingSyncJob, StoreOption } from '../types';
import { SYNC_PERIODS } from '../constants';

type UseTrackingSyncArgs = {
  stores: StoreOption[];
  bumpRefresh: () => void;
  setError: (msg: string) => void;
};

export function useTrackingSync({ stores, bumpRefresh, setError }: UseTrackingSyncArgs) {
  const [syncJob, setSyncJob] = useState<TrackingSyncJob | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMenuOpen, setSyncMenuOpen] = useState(false);
  const [syncDays, setSyncDays] = useState<(typeof SYNC_PERIODS)[number]['value']>(30);
  const [syncStoreIds, setSyncStoreIds] = useState<string[]>([]);
  const [lastSynced, setLastSynced] = useState('');
  const syncMenuRef = useRef<HTMLDivElement>(null);
  const activeSyncJobIdRef = useRef<string | null>(null);
  const completedSyncJobIdRef = useRef<string | null>(null);

  // Default syncStoreIds to all stores when stores load
  useEffect(() => {
    if (stores.length > 0 && syncStoreIds.length === 0) {
      setSyncStoreIds(stores.map((s) => s.id));
    }
  }, [stores, syncStoreIds.length]);

  // Outside-click to close sync menu
  useEffect(() => {
    if (!syncMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (syncMenuRef.current && !syncMenuRef.current.contains(e.target as Node)) {
        setSyncMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [syncMenuOpen]);

  const loadSyncStatus = useCallback(async (refreshAfterCompletion = false) => {
    const res = await fetch('/api/tracking/sync');
    const json = (await res.json()) as ApiResponse<{
      activeJob: TrackingSyncJob | null;
      lastSuccessfulJob: TrackingSyncJob | null;
      latestJob: TrackingSyncJob | null;
    }>;

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to load tracking sync status');
    }

    setSyncJob(json.data.activeJob);
    if (json.data.activeJob) {
      activeSyncJobIdRef.current = json.data.activeJob.id;
    }

    if (json.data.lastSuccessfulJob?.finishedAt) {
      const completedJobId = json.data.lastSuccessfulJob.id;
      const d = new Date(json.data.lastSuccessfulJob.finishedAt);
      setLastSynced(`Last synced: ${d.toLocaleString()}`);

      if (
        refreshAfterCompletion &&
        activeSyncJobIdRef.current === completedJobId &&
        completedSyncJobIdRef.current !== completedJobId
      ) {
        completedSyncJobIdRef.current = completedJobId;
        activeSyncJobIdRef.current = null;
        bumpRefresh();
        toast.success('Tracking status updated');
      }
    }

    if (
      refreshAfterCompletion &&
      json.data.latestJob?.status === 'failed' &&
      activeSyncJobIdRef.current === json.data.latestJob.id
    ) {
      setError(json.data.latestJob.error || 'Tracking status sync failed');
      activeSyncJobIdRef.current = null;
    }
  }, [bumpRefresh, setError]);

  useEffect(() => {
    let cancelled = false;

    const fetchSyncStatus = async () => {
      try {
        await loadSyncStatus(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tracking sync status');
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
        setError(err instanceof Error ? err.message : 'Failed to load tracking sync status');
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [loadSyncStatus, setError, syncJob]);

  const handleSync = async () => {
    if (syncJob && (syncJob.status === 'queued' || syncJob.status === 'running')) return;

    setSyncing(true);
    setSyncMenuOpen(false);
    setError('');
    try {
      const res = await fetch('/api/tracking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: syncDays, storeIds: syncStoreIds }),
      });
      const json = (await res.json()) as ApiResponse<{
        job: TrackingSyncJob;
        alreadyRunning: boolean;
      }>;

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to queue tracking status sync');
      }

      setSyncJob(json.data.job);
      activeSyncJobIdRef.current = json.data.job.id;
      if (json.data.alreadyRunning) {
        toast.info('A tracking status sync is already running.');
      } else {
        toast.success('Tracking status sync queued.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue tracking status sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncStoreToggle = (id: string) => {
    setSyncStoreIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const syncActive = syncJob?.status === 'queued' || syncJob?.status === 'running';
  const syncMessage = syncActive
    ? syncJob!.status === 'queued'
      ? 'Sync queued'
      : 'Syncing…'
    : lastSynced || 'Not synced yet';

  return {
    syncJob,
    syncing,
    syncMenuOpen,
    setSyncMenuOpen,
    syncDays,
    setSyncDays,
    syncStoreIds,
    syncMenuRef,
    lastSynced,
    syncActive,
    syncMessage,
    handleSync,
    handleSyncStoreToggle,
  };
}
