import type { PackingSlipLabel } from './types';
import { escapeHtml, getPackingSlipAddressLines } from './utils';

export { printDocumentInHiddenFrame } from '@/lib/print';

const buildPackingSlipSection = (label: PackingSlipLabel, origin: string) => {
const addressLines = getPackingSlipAddressLines(label);
const logoSrc = getPackingSlipLogoSrc(label.storeLogoPath, origin);
const storeUrl = formatStoreUrl(label.storeUrl, label.storeDomain);

return `
    <section class="page">
      <header class="slip-header">
        <div class="brand">
          ${logoSrc ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(label.storeName)} logo" />` : ''}
          <div class="store">${escapeHtml(label.storeName)}</div>
          ${storeUrl ? `<div class="url">${escapeHtml(storeUrl)}</div>` : ''}
        </div>
        <div class="order-number">#${escapeHtml(label.number)}</div>
      </header>

      <div class="content">
        <div class="label">Ship to</div>
        <div class="recipient">${escapeHtml(label.customer)}</div>
        <div class="address">
          ${addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
        </div>
        ${label.phone ? `<div class="phone">Phone: ${escapeHtml(label.phone)}</div>` : ''}
        ${label.note ? `<div class="note"><div class="note-label">Note</div>${escapeHtml(label.note)}</div>` : ''}
      </div>
    </section>
`;
};

export const buildPackingSlipsDocument = (labels: PackingSlipLabel[], origin: string) => {
const title = labels.length === 1 ? `Label ${escapeHtml(labels[0].number)}` : `Labels (${labels.length})`;

return `
  <!doctype html>
  <html>
    <head>
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; }
        .page { width: 4in; min-height: 6in; padding: .22in; display: flex; flex-direction: column; }
        .slip-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 16px; gap: 12px; }
        .brand { min-width: 0; }
        .logo { max-width: 1.15in; max-height: .55in; object-fit: contain; display: block; margin-bottom: 6px; }
        .store { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; overflow-wrap: anywhere; }
        .url { margin-top: 2px; color: #333; font-size: 10px; overflow-wrap: anywhere; }
        .order-number { font-size: 18px; font-weight: 800; white-space: nowrap; }
        .label { color: #555; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
        .recipient { font-size: 18px; font-weight: 800; line-height: 1.2; margin-bottom: 10px; overflow-wrap: anywhere; }
        .address { font-size: 20px; font-weight: 700; line-height: 1.32; overflow-wrap: anywhere; }
        .phone { margin-top: 14px; font-size: 16px; font-weight: 700; }
        .note { margin-top: 14px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 13px; font-weight: 700; line-height: 1.35; overflow-wrap: anywhere; white-space: pre-wrap; }
        .note-label { color: #555; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
        .content { flex: 1; }
        .page { break-after: page; }
        .page:last-child { break-after: auto; }
        @media print {
          @page { size: 4in 6in; margin: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .page { width: 4in; min-height: 6in; padding: .22in; }
        }
      </style>
    </head>
    <body>
    ${labels.map((label) => buildPackingSlipSection(label, origin)).join('')}
    </body>
  </html>
`;
};

export const buildPackingSlipDocument = (label: PackingSlipLabel, origin: string) =>
  buildPackingSlipsDocument([label], origin);

export const getPackingSlipLogoSrc = (logoPath: string | null, origin: string) => {
const filename = logoPath?.split('/').pop();
return filename ? `${origin}/api/uploads/logos/${encodeURIComponent(filename)}` : '';
};

export const formatStoreUrl = (storeUrl: string | null, storeDomain: string) => {
const value = storeUrl?.trim() || storeDomain.trim();
return "https://" + value.replace(/^https?:\/\//i, '').replace(/\/$/, '');
};
