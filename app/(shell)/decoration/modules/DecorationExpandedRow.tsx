'use client';

import type { OrderRow, OrderStockAdjustmentItem } from '../../orders/modules/types';
import type { useDecorationPage } from './hooks/useDecorationPage';
import DecoratorFulfillmentPanel from './DecoratorFulfillmentPanel';

type DecorationPageBundle = ReturnType<typeof useDecorationPage>;

type DecorationExpandedRowProps = {
  p: DecorationPageBundle;
  order: OrderRow;
  orderAddressLines: string[];
  isFullyFulfilled: boolean;
  restockItems: OrderStockAdjustmentItem[];
  hasRestock: boolean;
  hasDecorationWork: boolean;
};

export default function DecorationExpandedRow({
  p,
  order,
}: DecorationExpandedRowProps) {
  return (
    <tr className="border-l-4 border-l-blue-500">
      <td colSpan={p.ordersColSpan} className="p-0">
        <DecoratorFulfillmentPanel
          order={order}
          decoratorCategories={p.decoratorCategories}
          currentUserId={p.session?.user?.id ?? ''}
          requestingAccessKey={p.requestingAccessKey}
          onRequestAccess={p.requestEditAccess}
          onDeleteWork={p.deleteWorkRecord}
          getWorkDraft={p.getWorkDraft}
          onDraftQuantity={p.setDraftQuantity}
          onDraftAddRow={p.addDraftCommentRow}
          onDraftRemoveRow={p.removeDraftCommentRow}
          onDraftField={p.updateDraftCommentField}
          onDraftUpload={p.uploadDraftFiles}
          onDraftRemoveFile={p.removeDraftFile}
          onDraftSubmit={p.submitDraftWork}
          showAll={p.decoratorUnscoped}
          canAssign={p.userIsAdmin}
          isAdmin={p.userIsAdmin}
          onAssign={p.openAssignModal}
        />
      </td>
    </tr>
  );
}
