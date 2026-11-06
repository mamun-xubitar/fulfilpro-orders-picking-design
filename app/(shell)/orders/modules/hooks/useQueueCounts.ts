import { useEffect, useState } from 'react';
import type { ApiResponse } from '../types';

export type QueueCounts = Record<'all' | 'open' | 'slip_not_printed' | 'slip_printed' | 'not_packed' | 'partial' | 'packed' | 'shipped' | 'issues', number>;

const EMPTY: QueueCounts = { all: 0, open: 0, slip_not_printed: 0, slip_printed: 0, not_packed: 0, partial: 0, packed: 0, shipped: 0, issues: 0 };
// The tab counts ignore paging, sorting, the queue tab and the Packed / Print filters.
const IGNORED_PARAMS = ['page', 'pageSize', 'sort', 'dir', 'queue', 'packingStatus', 'printStatus'];

const POLL_MS = 15000;

/** Live sizes of the queue tabs, refetched on filter / refresh changes and polled while the page is visible. */
export function useQueueCounts({ queryString, refreshToken }: { queryString: string; refreshToken: number }) {
  const [counts, setCounts] = useState<QueueCounts>(EMPTY);
  const params = new URLSearchParams(queryString);
  IGNORED_PARAMS.forEach((key) => params.delete(key));
  const baseQuery = params.toString();

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(`/api/orders/queue-counts?${baseQuery}`)
        .then((res) => res.json() as Promise<ApiResponse<{ counts: QueueCounts }>>)
        .then((json) => {
          if (!cancelled && json.success) setCounts(json.data.counts);
        })
        .catch(() => {});
    };
    const poll = () => {
      if (document.visibilityState === 'visible') load();
    };
    load();
    const timer = window.setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [baseQuery, refreshToken]);

  return counts;
}
