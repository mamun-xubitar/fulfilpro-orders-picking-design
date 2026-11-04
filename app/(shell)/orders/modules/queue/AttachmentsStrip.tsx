'use client';

import { useEffect, useRef, useState } from 'react';
import type { FileAttachmentField, OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { getRowTone } from './queueUtils';
import { Icon } from './icons';

const FIELDS: Array<{ field: FileAttachmentField; label: string; one: string; many: string; accept?: string }> = [
  { field: 'files', label: 'Files', one: 'file', many: 'files' },
  { field: 'customerDesign', label: 'Customer design', one: 'file', many: 'files' },
  { field: 'photos', label: 'Photo', one: 'photo', many: 'photos', accept: 'image/*' },
];

function FileField({ p, order, cfg }: { p: OrdersPageBundle; order: OrderRow; cfg: (typeof FIELDS)[number] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const files = order.decorationAttachments[cfg.field];
  const uploading = p.getUploadingAttachmentFields(order.id).has(cfg.field);
  return (
    <span ref={ref} className="relative flex flex-none items-center gap-1.5">
      <b className="text-[9.5px] font-normal text-orders-text-subtle">{cfg.label}</b>
      {files.length > 0 && (
        <button type="button" aria-expanded={open} title={`Show the ${cfg.many}`} onClick={() => setOpen((v) => !v)} className="font-bold text-orders-text-body hover:underline cursor-pointer">{files.length} {files.length === 1 ? cfg.one : cfg.many} ·</button>
      )}
      <label className="inline-flex cursor-pointer items-center gap-[3px] text-[10px] font-bold text-orders-primary-ink hover:underline">
        <input type="file" multiple accept={cfg.accept} className="hidden" onChange={(e) => { p.uploadAttachmentFiles(order, cfg.field, e.target.files); e.target.value = ''; }} />
        <Icon name="paperclip" className="h-2.5 w-2.5" />{uploading ? 'Uploading…' : 'Add files'}
      </label>
      {open && (
        <span className="absolute left-0 top-full z-30 mt-1 flex w-60 flex-col rounded-xl border border-orders-border bg-orders-surface py-1 shadow-orders-md">
          {files.map((file, i) => (
            <span key={`${file.url}-${i}`} className="flex items-center justify-between gap-2 px-3 py-1 text-[10.5px] text-orders-text-body">
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate text-orders-primary hover:underline">{file.name}</a>
              <button type="button" aria-label={`Remove ${file.name}`} onClick={() => p.removeAttachmentFile(order, cfg.field, i)} className="text-orders-text-subtle hover:text-orders-danger cursor-pointer"><Icon name="close" className="h-3 w-3" /></button>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/** Strip under a decorated order's row, no expanding needed (Admin; prototype `underRow`): files, customer design,
 * photos and the customer remarks for the decorator. */
export default function AttachmentsStrip({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const tone = getRowTone(order, p.caps).split(' ')[0];
  return (
    <div className={`flex min-h-8 items-center gap-4 overflow-visible whitespace-nowrap border-b border-orders-divider py-[3px] pl-[38px] pr-2.5 text-[10.5px] text-orders-text-body ${tone}`}>
      {FIELDS.map((cfg) => <FileField key={cfg.field} p={p} order={order} cfg={cfg} />)}
      <span className="flex min-w-[150px] flex-1 items-center gap-1.5">
        <b className="text-[9.5px] font-normal text-orders-text-subtle">Customer remarks</b>
        <input value={p.getAttachmentRemarksValue(order)} disabled={p.isSavingAttachmentRemarks(order.id)} onChange={(e) => p.setAttachmentRemarksDraft(order.id, e.target.value)} onBlur={() => p.commitAttachmentRemarks(order)} placeholder="Add a remark for the decorator…" aria-label="Customer remarks" className="h-[22px] min-w-0 flex-1 rounded-md border border-orders-border bg-orders-surface px-2 text-[10.5px] text-orders-text-body outline-none placeholder:text-orders-text-subtle focus:border-orders-primary" />
      </span>
    </div>
  );
}
