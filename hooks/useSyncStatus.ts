'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatSyncDate } from '@/lib/utils/api';

type SyncJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | string;
  totalFetched: number;
  totalCreated: number;
  totalUpdated: number;
  error: string | null;
  finishedAt: string | null;
};

type ApiResponse = { success: boolean; message: string; errors?: string[] };
type SyncStatusResponse = { activeJob: SyncJob | null; lastSuccessfulJob: SyncJob | null; latestJob: SyncJob | null };
type SyncJobResponse = { job: SyncJob; alreadyRunning: boolean };

export type UseSyncStatusOptions = {
  syncStoreIds: string[];
  guard?: () => boolean;
  onError: (msg: string) => void;
};

export function useSyncStatus({ syncStoreIds, guard, onError }: UseSyncStatusOptions) {
  const [syncJob, setSyncJob] = useState<SyncJob | null>(null);
  const [lastSynced, setLastSynced] = useState('');
  const [syncRefreshNeeded, setSyncRefreshNeeded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const activeSyncJobIdRef = useRef<string | null>(null);
  const completedSyncJobIdRef = useRef<string | null>(null);

  const loadSyncStatus = useCallback(async (refreshAfterCompletion = false) => {
    const res = await fetch('/api/orders/sync');
    const json = (await res.json()) as ApiResponse & { data: SyncStatusResponse };

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to load Shopify order sync status');
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
      onError(json.data.latestJob.error || 'Shopify order sync failed');
      activeSyncJobIdRef.current = null;
    }
  }, [onError]);

  useEffect(() => {
    let cancelled = false;
    const fetch_ = async () => {
      try {
        await loadSyncStatus(false);
      } catch (err) {
        if (!cancelled) onError(err instanceof Error ? err.message : 'Failed to load Shopify order sync status');
      }
    };
    void fetch_();
    return () => { cancelled = true; };
  }, [loadSyncStatus, onError]);

  useEffect(() => {
    if (!syncJob || (syncJob.status !== 'queued' && syncJob.status !== 'running')) return;
    const timer = window.setInterval(() => {
      void loadSyncStatus(true).catch((err) => {
        onError(err instanceof Error ? err.message : 'Failed to load Shopify order sync status');
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [loadSyncStatus, syncJob, onError]);

  const triggerSync = async () => {
    if (guard?.()) return;
    const syncActive = syncJob?.status === 'queued' || syncJob?.status === 'running';
    if (syncActive) return;

    setSyncing(true);
    try {
      const { toast } = await import('react-toastify');
      const res = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeIds: syncStoreIds.length > 0 ? syncStoreIds : undefined }),
      });
      const json = (await res.json()) as ApiResponse & { data: SyncJobResponse };

      if ((!res.ok && res.status !== 409) || !json.success) {
        throw new Error(json.message || 'Failed to queue Shopify order sync');
      }

      setSyncJob(json.data.job);
      activeSyncJobIdRef.current = json.data.job.id;
      setSyncRefreshNeeded(false);
      if (json.data.alreadyRunning) {
        toast.info('A Shopify order sync is already running.');
      } else {
        toast.success('Shopify order sync queued.');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to queue Shopify order sync');
    } finally {
      setSyncing(false);
    }
  };

  const syncActive = syncJob?.status === 'queued' || syncJob?.status === 'running';

  return { syncJob, lastSynced, syncActive, syncRefreshNeeded, setSyncRefreshNeeded, syncing, triggerSync };
}
