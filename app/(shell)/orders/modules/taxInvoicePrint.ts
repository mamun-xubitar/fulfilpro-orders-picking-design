import { DEFAULT_INVOICE_ACCENT } from '@/lib/invoice-defaults';
import type { TaxInvoice } from './types';
import { escapeHtml } from './utils';
import { getPackingSlipLogoSrc } from './packingSlipPrint';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Near-black or white, whichever reads better on the accent color (WCAG relative luminance). */
const readableTextColor = (hex: string) => {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.4 ? '#1f2937' : '#ffffff';
};

const formatMoney = (value: number, currencyCode: string) => {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: currencyCode }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currencyCode}`;
  }
};

const stripProtocol = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

const buildHeader = (invoice: TaxInvoice, origin: string) => {
  const { store } = invoice;
  const logoSrc = getPackingSlipLogoSrc(store.logoPath, origin);
  const brand = logoSrc
    ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(store.name)} logo" />`
    : `<div class="wordmark">${escapeHtml(store.name)}</div>`;
  const contact = [store.businessName, store.email, store.websiteUrl ? stripProtocol(store.websiteUrl) : null]
    .filter((line): line is string => Boolean(line))
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('');

  return `
    <header class="top">
      <div class="brand">${brand}</div>
      <div class="contact">${contact}</div>
    </header>
    <div class="title-bar"><span>TAX INVOICE</span><span class="number">${escapeHtml(invoice.invoiceNumber)}</span></div>`;
};

const buildParties = (invoice: TaxInvoice) => `
    <section class="parties">
      <div class="party bill"><span class="key">BILL TO :</span><span class="name">${escapeHtml(invoice.billTo)}</span></div>
      <div class="party ship">
        <span class="key">SHIP TO :</span>
        <div>
          <div class="name">${escapeHtml(invoice.shipTo.name)}</div>
          ${invoice.shipTo.lines.map((line) => `<div class="line">${escapeHtml(line)}</div>`).join('')}
        </div>
      </div>
      <div class="party date"><span class="key">DATE</span><span class="name">${escapeHtml(invoice.date)}</span></div>
    </section>`;

const buildItems = (invoice: TaxInvoice) => {
  const money = (value: number) => formatMoney(value, invoice.currencyCode);
  const rows = invoice.items
    .map((item) => `
        <tr>
          <td class="qty">${escapeHtml(item.qty)}</td>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.size)}</td>
          <td class="num">${money(item.price)}</td>
          <td class="num"></td>
          <td class="num">${money(item.amount)}</td>
        </tr>`)
    .join('');

  return `
    <table class="items">
      <thead>
        <tr><th class="qty">QTY.</th><th>ITEM</th><th>SIZE</th><th class="num">PRICE</th><th class="num">DIS%</th><th class="num">AMOUNT</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

const buildSummary = (invoice: TaxInvoice) => {
  const { totals, payment } = invoice;
  const money = (value: number) => formatMoney(value, invoice.currencyCode);
  const row = (label: string, value: string, className = '') =>
    `<div class="total-row ${className}"><span>${label}</span><span>${value}</span></div>`;

  // No whitespace between the parts: only the instructions text keeps its own line breaks.
  const paymentBody =
    payment.lines.map((line) => `<div class="payment-line">${escapeHtml(line)}</div>`).join('') +
    (payment.instructions ? `<div class="payment-instructions">${escapeHtml(payment.instructions)}</div>` : '');

  return `
    <section class="summary">
      <div class="payment">
        <div class="payment-title">PAYMENT METHOD</div>
        <div class="payment-body">${paymentBody}</div>
      </div>
      <div class="totals">
        ${row('SUB', money(totals.sub))}
        ${row('DISCOUNT', money(totals.discount))}
        ${row('SHIPPING', money(totals.shipping))}
        ${row(totals.taxesIncluded ? 'TAX (INCL.)' : 'TAX', money(totals.tax))}
        ${row('TOTAL', money(totals.total))}
        ${row('APPLIED', money(totals.applied))}
        ${row('BALANCE', money(totals.balance), 'balance')}
      </div>
    </section>`;
};

const buildFooter = (invoice: TaxInvoice) => {
  const { store } = invoice;
  const parts = [
    escapeHtml(store.name) + (store.abn ? `&nbsp; ABN ${escapeHtml(store.abn)}.` : ''),
    store.businessName ? escapeHtml(store.businessName) : '',
  ].filter(Boolean);
  return `<footer class="band">${parts.join(' ')}</footer>`;
};

export const buildTaxInvoiceDocument = (invoice: TaxInvoice, origin: string) => {
  const accent = HEX_COLOR.test(invoice.store.accentColor) ? invoice.store.accentColor : DEFAULT_INVOICE_ACCENT;
  const onAccent = readableTextColor(accent);

  return `
  <!doctype html>
  <html>
    <head>
      <title>Tax Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; }
        .page { min-height: 268mm; display: flex; flex-direction: column; }
        .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 10px; }
        .logo { max-width: 60mm; max-height: 20mm; object-fit: contain; display: block; }
        .wordmark { font-size: 30px; font-weight: 800; letter-spacing: .02em; text-transform: uppercase; overflow-wrap: anywhere; }
        .contact { text-align: right; font-size: 14px; font-weight: 700; text-transform: uppercase; line-height: 1.35; overflow-wrap: anywhere; }
        .title-bar { display: flex; justify-content: space-between; align-items: center; background: ${accent}; color: ${onAccent}; padding: 7px 12px; font-size: 22px; font-weight: 800; letter-spacing: .01em; }
        .title-bar .number { font-size: 16px; font-weight: 600; opacity: .85; }
        .parties { display: flex; justify-content: space-between; gap: 16px; padding: 12px 4px 18px; }
        .party { display: flex; gap: 6px; align-items: baseline; }
        .party.ship { flex: 1; margin-left: 24px; align-items: flex-start; }
        .party.date { flex-direction: column; align-items: flex-end; gap: 2px; }
        .key { font-size: 12px; color: #333; white-space: nowrap; }
        .name { font-size: 15px; font-weight: 800; text-transform: uppercase; }
        .line { font-size: 14px; font-weight: 700; text-transform: uppercase; line-height: 1.4; }
        .items { width: 100%; border-collapse: collapse; }
        .items thead { display: table-header-group; }
        .items th { text-align: left; font-size: 11px; font-weight: 800; padding: 6px 8px; border-bottom: 2px solid ${accent}; }
        .items td { padding: 7px 8px; font-size: 14px; text-transform: uppercase; vertical-align: top; border-bottom: 1px solid #eee; }
        .items tr { break-inside: avoid; }
        .items .qty { width: 48px; }
        .items .num { text-align: right; white-space: nowrap; }
        .summary { display: flex; margin-top: 16px; border-top: 1.5px dashed #555; break-inside: avoid; }
        .payment { flex: 1; padding: 10px 16px 10px 4px; border-right: 1.5px dashed #555; }
        .payment-title { font-size: 15px; font-weight: 800; color: #555; margin-bottom: 8px; letter-spacing: .02em; }
        .payment-body { font-size: 14px; font-weight: 700; line-height: 1.4; text-transform: uppercase; overflow-wrap: anywhere; }
        .payment-instructions { white-space: pre-wrap; }
        .payment-line + .payment-instructions { margin-top: 10px; }
        .totals { width: 70mm; padding: 10px 4px 10px 16px; }
        .total-row { display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; font-size: 14px; font-weight: 800; }
        .total-row.balance span:last-child { color: #e03a1e; }
        .band { margin-top: auto; background: ${accent}; color: ${onAccent}; padding: 14px 12px; text-align: center; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .02em; }
        @media print {
          @page { size: A4; margin: 12mm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        ${buildHeader(invoice, origin)}
        ${buildParties(invoice)}
        ${buildItems(invoice)}
        ${buildSummary(invoice)}
        <div style="height: 24px"></div>
        ${buildFooter(invoice)}
      </div>
    </body>
  </html>
`;
};
