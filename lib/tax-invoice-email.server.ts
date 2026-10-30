import { DEFAULT_INVOICE_ACCENT } from '@/lib/invoice-defaults';
import type { TaxInvoice } from '@/lib/tax-invoice.server';
import { getPackingSlipLogoSrc } from '@/app/(shell)/orders/modules/packingSlipPrint';
import {
  HEX_COLOR,
  formatMoney,
  readableTextColor,
  stripProtocol,
} from '@/app/(shell)/orders/modules/taxInvoicePrint';
import { escapeHtml } from '@/app/(shell)/orders/modules/utils';

/**
 * The tax invoice as email HTML. Same layout and values as the printed document
 * (`buildTaxInvoiceDocument`), but built from tables with inline styles only: mail clients drop
 * <head> styles and don't support flexbox.
 */

const DASH = '1.5px dashed #555';

type Palette = { accent: string; onAccent: string };

const buildMessage = (message: string) =>
  message
    ? `<tr><td style="padding:0 0 24px;font-size:14px;white-space:pre-wrap;">${escapeHtml(message)}</td></tr>`
    : '';

const buildHeader = (invoice: TaxInvoice, logoBase: string, { accent, onAccent }: Palette) => {
  const { store } = invoice;
  const logoSrc = getPackingSlipLogoSrc(store.logoPath, logoBase);
  const brand = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(store.name)} logo" style="display:block;max-width:227px;max-height:76px;border:0;" />`
    : `<div style="font-size:30px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;">${escapeHtml(store.name)}</div>`;
  const contact = [store.businessName, store.email, store.websiteUrl ? stripProtocol(store.websiteUrl) : null]
    .filter((line): line is string => Boolean(line))
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('');

  return `
    <tr><td style="padding:0 0 10px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top">${brand}</td>
        <td valign="top" align="right" style="padding-left:16px;font-size:14px;font-weight:700;text-transform:uppercase;line-height:1.35;">${contact}</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="${accent}" style="background:${accent};color:${onAccent};padding:7px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="color:${onAccent};font-size:22px;font-weight:800;letter-spacing:.01em;">TAX INVOICE</td>
        <td align="right" style="color:${onAccent};font-size:16px;font-weight:600;opacity:.85;">${escapeHtml(invoice.invoiceNumber)}</td>
      </tr></table>
    </td></tr>`;
};

const KEY_STYLE = 'font-size:12px;color:#333;white-space:nowrap;';
const NAME_STYLE = 'font-size:15px;font-weight:800;text-transform:uppercase;';
const LINE_STYLE = 'font-size:14px;font-weight:700;text-transform:uppercase;line-height:1.4;';

const buildParty = (label: string, name: string, lines: string[]) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="top" style="${KEY_STYLE}padding-right:6px;">${label}</td>
    <td valign="top">
      <div style="${NAME_STYLE}">${escapeHtml(name)}</div>
      ${lines.map((line) => `<div style="${LINE_STYLE}">${escapeHtml(line)}</div>`).join('')}
    </td>
  </tr></table>`;

const buildParties = (invoice: TaxInvoice) => {
  const meta = [
    ['DATE', invoice.date],
    ['DUE DATE', invoice.dueDate],
    ['ORDER / PO #', invoice.orderRef],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `<div style="${KEY_STYLE}padding-top:2px;">${key}</div><div style="${NAME_STYLE}padding-top:2px;">${escapeHtml(value)}</div>`)
    .join('');

  return `
    <tr><td style="padding:12px 4px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top">${buildParty('BILL TO :', invoice.billTo, invoice.billToLines)}</td>
        <td valign="top" style="padding-left:24px;">${buildParty('SHIP TO :', invoice.shipTo.name, invoice.shipTo.lines)}</td>
        <td valign="top" align="right" style="padding-left:16px;">${meta}</td>
      </tr></table>
    </td></tr>`;
};

const buildItems = (invoice: TaxInvoice, { accent }: Palette) => {
  const money = (value: number) => formatMoney(value, invoice.currencyCode);
  const th = (label: string, align = 'left', width = '') =>
    `<th align="${align}" ${width}style="text-align:${align};font-size:11px;font-weight:800;padding:6px 8px;border-bottom:2px solid ${accent};">${label}</th>`;
  const td = (value: string, align = 'left', width = '') =>
    `<td valign="top" align="${align}" ${width}style="text-align:${align};padding:7px 8px;font-size:14px;text-transform:uppercase;border-bottom:1px solid #eee;${align === 'right' ? 'white-space:nowrap;' : ''}">${value}</td>`;

  const rows = invoice.items
    .map((item) => `<tr>${td(escapeHtml(item.qty), 'left', 'width="48" ')}${td(escapeHtml(item.title))}${td(escapeHtml(item.size))}${td(money(item.price), 'right')}${td(item.discountPercent > 0 ? `${item.discountPercent}%` : '', 'right')}${td(money(item.amount), 'right')}</tr>`)
    .join('');

  return `
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>${th('QTY.', 'left', 'width="48" ')}${th('ITEM')}${th('SIZE')}${th('PRICE', 'right')}${th('DIS%', 'right')}${th('AMOUNT', 'right')}</tr>
        ${rows}
      </table>
    </td></tr>`;
};

const buildSummary = (invoice: TaxInvoice) => {
  const { totals, payment } = invoice;
  const money = (value: number) => formatMoney(value, invoice.currencyCode);
  const row = (label: string, value: string, color = '') =>
    `<tr><td style="padding:3px 0;font-size:14px;font-weight:800;">${label}</td><td align="right" style="padding:3px 0 3px 12px;font-size:14px;font-weight:800;${color ? `color:${color};` : ''}">${value}</td></tr>`;

  const paymentBody =
    payment.lines.map((line) => `<div>${escapeHtml(line)}</div>`).join('') +
    (payment.instructions
      ? `<div style="white-space:pre-wrap;${payment.lines.length ? 'margin-top:10px;' : ''}">${escapeHtml(payment.instructions)}</div>`
      : '');

  return `
    <tr><td style="padding-top:16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top" style="border-top:${DASH};border-right:${DASH};padding:10px 16px 10px 4px;">
          <div style="font-size:15px;font-weight:800;color:#555;margin-bottom:8px;letter-spacing:.02em;">PAYMENT METHOD</div>
          <div style="font-size:14px;font-weight:700;line-height:1.4;text-transform:uppercase;">${paymentBody}</div>
        </td>
        <td valign="top" width="265" style="border-top:${DASH};padding:10px 4px 10px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${row('SUB', money(totals.sub))}
            ${row('DISCOUNT', money(totals.discount))}
            ${row('SHIPPING', money(totals.shipping))}
            ${row(totals.taxRate > 0 ? `TAX (INCL. ${totals.taxRate}%)` : 'TAX', money(totals.tax))}
            ${row('TOTAL', money(totals.total))}
            ${row('APPLIED', money(totals.applied))}
            ${row('BALANCE', money(totals.balance), '#e03a1e')}
          </table>
        </td>
      </tr></table>
    </td></tr>`;
};

const buildBand = (invoice: TaxInvoice, { accent, onAccent }: Palette) => {
  const { store } = invoice;
  const parts = [
    escapeHtml(store.name) + (store.abn ? `&nbsp; ABN ${escapeHtml(store.abn)}.` : ''),
    store.businessName ? escapeHtml(store.businessName) : '',
  ].filter(Boolean);
  return `
    <tr><td height="24" style="height:24px;line-height:24px;font-size:1px;">&nbsp;</td></tr>
    <tr><td bgcolor="${accent}" align="center" style="background:${accent};color:${onAccent};padding:14px 12px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.02em;">${parts.join(' ')}</td></tr>`;
};

const buildTerms = (invoice: TaxInvoice) =>
  invoice.terms
    ? `<tr><td style="padding-top:8px;text-transform:uppercase;"><span style="font-size:12px;font-weight:800;color:#555;letter-spacing:.02em;">Terms:</span> <span style="font-size:12px;line-height:1.4;white-space:pre-wrap;">${escapeHtml(invoice.terms)}</span></td></tr>`
    : '';

/** An email carrying only the typed message, for sends that leave the invoice out. */
export function buildMessageOnlyEmailHtml(message: string) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
    <table role="presentation" width="720" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:720px;">
      ${buildMessage(message)}
    </table>
  </body>
</html>`;
}

export function buildTaxInvoiceEmailHtml(invoice: TaxInvoice, logoBase: string, message: string) {
  const accent = HEX_COLOR.test(invoice.store.accentColor) ? invoice.store.accentColor : DEFAULT_INVOICE_ACCENT;
  const palette = { accent, onAccent: readableTextColor(accent) };

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tax Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
    <table role="presentation" width="720" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:720px;">
      ${buildMessage(message)}
      ${buildHeader(invoice, logoBase, palette)}
      ${buildParties(invoice)}
      ${buildItems(invoice, palette)}
      ${buildSummary(invoice)}
      ${buildBand(invoice, palette)}
      ${buildTerms(invoice)}
    </table>
  </body>
</html>`;
}
