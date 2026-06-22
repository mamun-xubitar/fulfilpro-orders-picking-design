import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, OrderSyncJob } from '../types';
import { formatSyncDate } from '../utils';

type UseSyncArgs = {
  blockTestModeAction: () => boolean;
  setError: (msg: string) => void;
};

export function useSync({ blockTestModeAction, setError }: UseSyncArgs) {
  const [syncing, setSyncing] = useState(false);
  const [syncJob, setSyncJob] = useState<OrderSyncJob | null>(null);
  const [lastSynced, setLastSynced] = useState('');
  const [syncRefreshNeeded, setSyncRefreshNeeded] = useState(false);
  const [syncStoreIds, setSyncStoreIds] = useState<string[]>([]);
  const activeSyncJobIdRef = useRef<string | null>(null);
  const completedSyncJobIdRef = useRef<string | null>(null);

  const loadSyncStatus = useCallback(async (refreshAfterCompletion = false) => {
    const res = await fetch('/api/orders/sync');
    const json = (await res.json()) as ApiResponse<{
      activeJob: OrderSyncJob | null;
      lastSuccessfulJob: OrderSyncJob | null;
      latestJob: OrderSyncJob | null;
    }>;

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
      setError(json.data.latestJob.error || 'Shopify order sync failed');
      activeSyncJobIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSyncStatus = async () => {
      try {
        await loadSyncStatus(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Shopify order sync status');
        }
      }
    };

    void fetchSyncStatus();

    return () => {
      cancelled = true;
    };
  }, [loadSyncStatus]);

  useEffect(() => {
    if (!syncJob || (syncJob.status !== 'queued' && syncJob.status !== 'running')) return;

    const timer = window.setInterval(() => {
      void loadSyncStatus(true).catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load Shopify order sync status');
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [loadSyncStatus, syncJob]);

  const handleSync = async () => {
    if (blockTestModeAction()) return;
    if (syncJob && (syncJob.status === 'queued' || syncJob.status === 'running')) return;

    setSyncing(true);
    setError('');
    try {
      const res = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeIds: syncStoreIds.length > 0 ? syncStoreIds : undefined }),
      });
      const json = (await res.json()) as ApiResponse<{
        job: OrderSyncJob;
        alreadyRunning: boolean;
      }>;

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
      setError(err instanceof Error ? err.message : 'Failed to queue Shopify order sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncStoreToggle = (id: string) => {
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
    syncJob,
    syncActive,
    syncRefreshNeeded,
    setSyncRefreshNeeded,
    lastSynced,
    syncMessage,
    handleSync,
    syncStoreIds,
    setSyncStoreIds,
    handleSyncStoreToggle,
  };
}
