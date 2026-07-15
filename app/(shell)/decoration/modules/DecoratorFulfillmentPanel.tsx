'use client';

import type { OrderItem, OrderRow, WorkDraftState } from '../../orders/modules/types';
import { getFulfilledQty, getDecorationRowTint, getDecorationRelevantItems, getReferenceItems } from '../../orders/modules/utils';
import DecoratorWorkForm from './DecoratorWorkForm';
import ReferenceProductsSection from './ReferenceProductsSection';

type Props = {
  order: OrderRow;
  decoratorCategory: 'embroidery' | 'print' | null;
  currentUserId: string;
  requestingAccessKey: string | null;
  onRequestAccess: (order: OrderRow, item: OrderItem) => void;
  onDeleteWork: (order: OrderRow, item: OrderItem, workId: string) => void;
  getWorkDraft: (key: string, item: OrderItem) => WorkDraftState;
  onDraftQuantity: (key: string, item: OrderItem, value: string) => void;
  onDraftAddRow: (key: string, item: OrderItem) => void;
  onDraftRemoveRow: (key: string, item: OrderItem, index: number) => void;
  onDraftField: (key: string, item: OrderItem, index: number, field: 'sizes' | 'colors' | 'remarks' | 'location', value: string) => void;
  onDraftUpload: (key: string, item: OrderItem, index: number, files: FileList | null) => void;
  onDraftRemoveFile: (key: string, item: OrderItem, index: number, fileIndex: number) => void;
  onDraftSubmit: (order: OrderRow, item: OrderItem) => void;
  showAll?: boolean;
  canAssign?: boolean;
  onAssign?: (order: OrderRow, item: OrderItem) => void;
  isAdmin?: boolean;
};

const COMMENT_FIELDS: Array<{ key: 'sizes' | 'colors' | 'remarks' | 'location'; label: string }> = [
  { key: 'sizes', label: 'Sizes' },
  { key: 'colors', label: 'Colors' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'location', label: 'Location' },
];

export default function DecoratorFulfillmentPanel({
  order,
  decoratorCategory,
  currentUserId,
  requestingAccessKey,
  onRequestAccess,
  onDeleteWork,
  getWorkDraft,
  onDraftQuantity,
  onDraftAddRow,
  onDraftRemoveRow,
  onDraftField,
  onDraftUpload,
  onDraftRemoveFile,
  onDraftSubmit,
  showAll = false,
  canAssign = false,
  onAssign,
  isAdmin = false,
}: Props) {
  const opts = { decoratorCategory, currentUserId, showAll };
  const items = getDecorationRelevantItems(order, opts);
  const refItems = getReferenceItems(order, opts);

  return (
    <div className="bg-gray-100 border-b border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Product Fulfilment</h4>
        <span className="text-xs text-gray-400">Order {order.number} · {order.customer}</span>
      </div>
      
      <ReferenceProductsSection order={order} items={refItems} />

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No items for you on this order.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const d = item.decoration;
            const doneQty = d?.doneQty ?? 0;
            const remaining = d?.remaining ?? item.qty;
            const locked = isAdmin ? false : (d?.locked ?? false);
            const editable = !locked;
            const pending = d?.hasPendingRequest ?? false;
            const tint = getDecorationRowTint(item) ?? 'bg-white';
            const requestKey = `${order.id}:${item.id}`;
            const works = d?.works ?? [];

            return (
              <div key={item.id} className={`rounded-lg border border-gray-200 p-3 ${tint}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800">{item.name || item.title}</span>
                      {item.isEmbroidery && <span className="rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-semibold">Emb</span>}
                      {item.isPrint && <span className="rounded-full bg-sky-100 text-sky-700 px-1.5 py-0.5 text-[10px] font-semibold">Print</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                      {item.sku && <span className="font-mono">{item.sku}</span>}
                      <span>Qty <strong className="text-gray-700">{item.qty}</strong></span>
                      <span>Packed <strong className="text-gray-700">{item.packedQuantity ?? 0}/{item.qty}</strong></span>
                      <span>Fulfilled <strong className="text-gray-700">{getFulfilledQty(order, item.id)}/{item.qty}</strong></span>
                      <span>Done <strong className="text-gray-700">{doneQty}</strong></span>
                      <span>Left <strong className="text-gray-700">{remaining}</strong></span>
                    </div>
                    {(() => {
                      const myDue = (item.assignments ?? []).find(
                        (a) => a.assigneeId === currentUserId && a.dueDate
                      )?.dueDate;
                      if (!myDue) return null;
                      const overdue = myDue < new Date().toLocaleDateString('en-CA');
                      return (
                        <p className={`mt-0.5 text-[11px] ${overdue ? 'text-red-600 font-semibold' : 'text-amber-700'}`}>
                          {overdue ? '⚠ ' : ''}Complete by {myDue}{overdue ? ' (overdue)' : ''}
                        </p>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2">
                    {canAssign && onAssign && (
                      <button
                        type="button"
                        onClick={() => onAssign(order, item)}
                        className="rounded-lg border border-blue-300 text-blue-700 bg-white px-2.5 py-1 text-xs font-medium hover:bg-blue-50"
                      >
                        Assign decorator
                      </button>
                    )}
                    {locked && (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 text-gray-600 px-2 py-1 text-[11px] font-semibold">
                          🔒 Locked
                        </span>
                        {pending ? (
                          <span className="text-[11px] text-gray-500">Access requested</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRequestAccess(order, item)}
                            disabled={requestingAccessKey === requestKey}
                            className="rounded-lg border border-amber-300 text-amber-700 bg-white px-2.5 py-1 text-xs font-medium hover:bg-amber-50 disabled:opacity-50"
                          >
                            {requestingAccessKey === requestKey ? 'Requesting…' : 'Request edit access'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {!locked && remaining > 0 && (
                  <DecoratorWorkForm
                    draft={getWorkDraft(requestKey, item)}
                    item={item}
                    onQuantity={(v) => onDraftQuantity(requestKey, item, v)}
                    onAddRow={() => onDraftAddRow(requestKey, item)}
                    onRemoveRow={(i) => onDraftRemoveRow(requestKey, item, i)}
                    onField={(i, field, v) => onDraftField(requestKey, item, i, field, v)}
                    onUpload={(i, files) => onDraftUpload(requestKey, item, i, files)}
                    onRemoveFile={(i, fi) => onDraftRemoveFile(requestKey, item, i, fi)}
                    onSubmit={() => onDraftSubmit(order, item)}
                  />
                )}
                {!locked && remaining <= 0 && (
                  <p className="mt-2 text-xs text-emerald-600 font-medium">Already done or order fulfilled</p>
                )}

                {works.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-gray-200 pt-2">
                    {works.map((work) => (
                      <div key={work.id} className="rounded-md bg-white/70 border border-gray-100 px-2.5 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">
                            Done {work.quantityDone} · {new Date(work.createdAt).toLocaleString()}
                          </span>
                          {editable && (
                            <button
                              type="button"
                              onClick={() => onDeleteWork(order, item, work.id)}
                              className="text-[11px] text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {work.comments.length > 0 && (
                          <div className="mt-1.5 space-y-1.5">
                            {work.comments.map((comment, ci) => (
                              <div key={ci} className="text-[11px] text-gray-600">
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                  {COMMENT_FIELDS.map(({ key, label }) =>
                                    comment[key] ? (
                                      <span key={key}><span className="text-gray-400">{label}:</span> {comment[key]}</span>
                                    ) : null
                                  )}
                                </div>
                                {(comment.files ?? []).length > 0 && (
                                  <div className="mt-0.5 flex flex-wrap gap-2">
                                    {(comment.files ?? []).map((file, fi) => (
                                      <a
                                        key={fi}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                      >
                                        📎 {file.name}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
