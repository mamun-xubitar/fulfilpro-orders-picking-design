'use client';

import type { OrderRow } from './types';
import type { OrdersPageBundle } from './ordersPageContext';
import OrderDecorationFiles from '../../decoration/modules/OrderDecorationFiles';

type OrderAttachmentsRowProps = {
  p: OrdersPageBundle;
  order: OrderRow;
};

export default function OrderAttachmentsRow({ p, order }: OrderAttachmentsRowProps) {
  return (
    <tr className="border-l-4 border-l-blue-500">
      <td colSpan={p.ordersColSpan} className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <OrderDecorationFiles
          attachments={order.decorationAttachments}
          remarksValue={p.getAttachmentRemarksValue(order)}
          uploadingFields={p.getUploadingAttachmentFields(order.id)}
          savingRemarks={p.isSavingAttachmentRemarks(order.id)}
          onUpload={(field, files) => p.uploadAttachmentFiles(order, field, files)}
          onRemoveFile={(field, index) => p.removeAttachmentFile(order, field, index)}
          onRemarksChange={(value) => p.setAttachmentRemarksDraft(order.id, value)}
          onRemarksBlur={() => p.commitAttachmentRemarks(order)}
        />
      </td>
    </tr>
  );
}
