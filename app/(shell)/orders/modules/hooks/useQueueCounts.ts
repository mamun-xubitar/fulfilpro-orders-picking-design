import { useEffect, useState } from 'react';
import type { ApiResponse } from '../types';

export type QueueCounts = Record<'all' | 'open' | 'slip_not_printed' | 'slip_printed' | 'not_packed' | 'partial' | 'packed' | 'shipped' | 'issues', number>;

const EMPTY: QueueCounts = { all: 0, open: 0, slip_not_printed: 0, slip_printed: 0, not_packed: 0, partial: 0, packed: 0, shipped: 0, issues: 0 };
// The tab counts ignore paging, sorting, the queue tab and the Packed / Print filters.
const IGNORED_PARAMS = ['page', 'pageSize', 'sort', 'dir', 'queue', 'packingStatus', 'printStatus'];

/** Live sizes of the queue tabs, refetched whenever the base filters or a refresh change. */
export function useQueueCounts({ queryString, refreshToken }: { queryString: string; refreshToken: number }) {
  const [counts, setCounts] = useState<QueueCounts>(EMPTY);
  const params = new URLSearchParams(queryString);
  IGNORED_PARAMS.forEach((key) => params.delete(key));
  const baseQuery = params.toString();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/queue-counts?${baseQuery}`)
      .then((res) => res.json() as Promise<ApiResponse<{ counts: QueueCounts }>>)
      .then((json) => {
        if (!cancelled && json.success) setCounts(json.data.counts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [baseQuery, refreshToken]);

  return counts;
}
