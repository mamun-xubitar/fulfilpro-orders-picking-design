'use client';

import { useZoom } from '@/components/ZoomContext';
import Pagination from '@/components/Pagination';
import { useOrdersPage } from './hooks/useOrdersPage';
import PendingRequestsPanel from './PendingRequestsPanel';
import PageModals from './PageModals';
import QueueToolbar from './queue/QueueToolbar';
import QueueTabs from './queue/QueueTabs';
import QueueTable from './queue/QueueTable';
import NamesStrip from './queue/NamesStrip';
import BulkBar from './queue/BulkBar';

const PAGE_SIZES = [10, 20, 50, 100];

export default function OrdersPage() {
  const p = useOrdersPage();
  const { zoomPercent } = useZoom();

  return (
    <main className="flex-1 space-y-1.5 bg-orders-canvas p-2 md:p-3" style={{ zoom: `${zoomPercent}%`, '--page-zoom': zoomPercent / 100 } as React.CSSProperties}>
      {p.userIsAdmin && (
        <PendingRequestsPanel
          pendingRequests={p.pendingRequests}
          open={p.pendingRequestsPanelOpen}
          onToggle={() => p.setPendingRequestsPanelOpen((prev) => !prev)}
          onApprove={(requestId) => void p.handleAdminApproveRequest(requestId)}
          onReject={(requestId) => void p.handleAdminRejectRequest(requestId)}
        />
      )}
      <QueueToolbar p={p} />
      <QueueTabs p={p} />
      {p.caps.names && <NamesStrip p={p} />}
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
