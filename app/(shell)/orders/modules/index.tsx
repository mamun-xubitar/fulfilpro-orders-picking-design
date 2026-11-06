'use client';

import { useEffect } from 'react';
import { usePageHeading } from '@/components/PageHeadingContext';
import { useZoom } from '@/components/ZoomContext';
import { useOrdersPage } from './hooks/useOrdersPage';
import PageModals from './PageModals';
import ApprovalsStrip from './queue/ApprovalsStrip';
import QueueToolbar from './queue/QueueToolbar';
import QueueTabs from './queue/QueueTabs';
import QueueTable from './queue/QueueTable';

export default function OrdersPage() {
  const p = useOrdersPage();
  const { zoomPercent } = useZoom();
  const { setSuffix } = usePageHeading();
  useEffect(() => {
    setSuffix('Queue');
    return () => setSuffix(null);
  }, [setSuffix]);

  return (
    <main className="flex-1 bg-orders-canvas p-2 text-[11.5px] xl:flex xl:min-h-0 xl:flex-col xl:gap-1.5 xl:overflow-hidden" style={{ zoom: `${zoomPercent}%`, '--page-zoom': zoomPercent / 100 } as React.CSSProperties}>
      <div className="flex flex-col gap-1.5 xl:contents">
        <ApprovalsStrip p={p} />
        <QueueToolbar p={p} />
        <QueueTabs p={p} />
      </div>
      <QueueTable p={p} />
      <PageModals p={p} />
    </main>
  );
}
