'use client';

import { useLayoutEffect, useRef } from 'react';
import type { FileAttachmentField, OrderAttachmentField, OrderDecorationAttachments } from '../../orders/modules/types';

type OrderDecorationFilesProps = {
  attachments: OrderDecorationAttachments;
  remarksValue: string;
  uploadingFields: Set<OrderAttachmentField>;
  savingRemarks: boolean;
  onUpload: (field: FileAttachmentField, files: FileList | null) => void;
  onRemoveFile: (field: FileAttachmentField, index: number) => void;
  onRemarksChange: (value: string) => void;
  onRemarksBlur: () => void;
};

function FileField({
  label,
  field,
  accept,
  attachments,
  uploading,
  onUpload,
  onRemoveFile,
}: {
  label: string;
  field: FileAttachmentField;
  accept?: string;
  attachments: OrderDecorationAttachments;
  uploading: boolean;
  onUpload: (field: FileAttachmentField, files: FileList | null) => void;
  onRemoveFile: (field: FileAttachmentField, index: number) => void;
}) {
  return (
    <div className="min-w-[140px]">
      <label className="block text-[11px] text-gray-500 mb-1">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1 cursor-pointer text-xs text-blue-600 hover:text-blue-800">
          <input
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(e) => { onUpload(field, e.target.files); e.target.value = ''; }}
          />
          📎 Add files
        </label>
        {uploading && <span className="text-[11px] text-gray-400">Uploading…</span>}
        {attachments[field].map((file, fi) => (
          <span key={fi} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
            <button type="button" onClick={() => onRemoveFile(field, fi)} className="text-gray-400 hover:text-red-500 cursor-pointer">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function AutoGrowTextarea({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="w-full resize-none overflow-hidden border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

export default function OrderDecorationFiles({
  attachments,
  remarksValue,
  uploadingFields,
  savingRemarks,
  onUpload,
  onRemoveFile,
  onRemarksChange,
  onRemarksBlur,
}: OrderDecorationFilesProps) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <FileField
        label="Files"
        field="files"
        attachments={attachments}
        uploading={uploadingFields.has('files')}
        onUpload={onUpload}
        onRemoveFile={onRemoveFile}
      />
      <FileField
        label="Customer design"
        field="customerDesign"
        attachments={attachments}
        uploading={uploadingFields.has('customerDesign')}
        onUpload={onUpload}
        onRemoveFile={onRemoveFile}
      />
      <FileField
        label="Photo"
        field="photos"
        accept="image/*"
        attachments={attachments}
        uploading={uploadingFields.has('photos')}
        onUpload={onUpload}
        onRemoveFile={onRemoveFile}
      />
      <div className="allow-copy min-w-[200px] flex-1">
        <label className="block text-[11px] text-gray-500 mb-1">
          Customer remarks{savingRemarks && <span className="text-gray-400"> (saving…)</span>}
        </label>
        <AutoGrowTextarea value={remarksValue} onChange={onRemarksChange} onBlur={onRemarksBlur} />
      </div>
    </div>
  );
}
