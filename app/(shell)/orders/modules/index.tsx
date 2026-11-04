'use client';

import { useEffect } from 'react';
import { usePageHeading } from '@/components/PageHeadingContext';
import { useZoom } from '@/components/ZoomContext';
import Pagination from '@/components/Pagination';
import { useOrdersPage } from './hooks/useOrdersPage';
import PageModals from './PageModals';
import ApprovalsStrip from './queue/ApprovalsStrip';
import QueueToolbar from './queue/QueueToolbar';
import QueueTabs from './queue/QueueTabs';
import QueueTable from './queue/QueueTable';
import BulkBar from './queue/BulkBar';

const PAGE_SIZES = [10, 20, 50, 100];

export default function OrdersPage() {
  const p = useOrdersPage();
  const { zoomPercent } = useZoom();
  const { setSuffix } = usePageHeading();
  useEffect(() => {
    setSuffix('Queue');
    return () => setSuffix(null);
  }, [setSuffix]);

  return (
    <main className="flex-1 space-y-1.5 bg-orders-canvas p-2 md:p-3" style={{ zoom: `${zoomPercent}%`, '--page-zoom': zoomPercent / 100 } as React.CSSProperties}>
      <ApprovalsStrip p={p} />
      <QueueToolbar p={p} />
      <QueueTabs p={p} />
      <div className="overflow-hidden rounded-xl border border-orders-border bg-orders-surface shadow-orders">
        <div className="overflow-x-auto">
          <QueueTable p={p} />
        </div>
        <Pagination
          pagination={p.pagination}
          loading={p.loading}
          pageNumbers={p.pageNumbers}
          onPageChange={p.goToPage}
          pageSizeOptions={PAGE_SIZES}
          onPageSizeChange={(size) => p.setPagination((prev) => ({ ...prev, pageSize: size, page: 1 }))}
        />
      </div>
      <BulkBar p={p} />
      <PageModals p={p} />
    </main>
  );
}
