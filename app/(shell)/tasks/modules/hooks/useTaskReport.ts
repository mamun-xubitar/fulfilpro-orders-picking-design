'use client';

import { useState, useEffect } from 'react';
import type { ReportData } from '../types';

export function useTaskReport(enabled: boolean) {
  const [report, setReport] = useState<ReportData | null>(null);

  useEffect(() => {
    if (!enabled) return;
    fetch('/api/tasks/report')
      .then((r) => r.json() as Promise<{ success: boolean; data: ReportData }>)
      .then((r) => { if (r.success) setReport(r.data); })
      .catch(() => {});
  }, [enabled]);

  return { report, loading: enabled && report === null };
}
