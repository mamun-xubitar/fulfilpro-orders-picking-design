import { writeFileSync } from 'node:fs';
import { CSS } from './styles.mjs';
import * as D from './designs.mjs';
import * as D2 from './designs2.mjs';
import * as D3 from './designs3.mjs';
import * as L from './ledger.mjs';
import { ZOOM_JS } from './chrome.mjs';
import { CSS_X } from './extras.mjs';
import { buildDialogs } from './dialogs.mjs';

const ROLES = ['admin', 'staff', 'picker'];
const ROLE_LABEL = { admin: 'Admin', staff: 'Staff / Test user', picker: 'Order Picker', po: 'Admin · Create PO open' };
const ROLE_NOTE = {
  po: ['Admin only.', 'The “+ PO” button on a short line opens Inventory’s Create purchase order modal (concept A1: see dialogs.html card 16), prefilled with the product, variant and shortfall; the popover below is the archived concept D’s. It is created as Requested, like any PO today.'],
  admin: ['Sees everything from both of today’s pages, plus stock and purchasing.', 'Pending fulfilment requests sit in one collapsible amber section at the top (count, then Approve / Reject per request; today: a separate panel). The item table has separate Decoration (EMB / PRT) and Decorator (assignee, Mark done, View) columns, and Qty reads fulfilled / ordered. Slip, pack, fulfil, customer, labels, tracking, decoration, stock adjustment, attachments and approvals all live on one order. The print-slip icon turns green once printed. Filters: Store, Period, Status, Packed, Print and barcode search, as on today’s two pages.'],
  staff: ['Today’s Orders page, nothing more.', 'No picking slip or packing controls or filter; the stage track shows the Slip dot read-only. Select lines with Full / Partial, then Confirm fulfilment from the Actions block. Fulfilment edits and cancels stay request-and-approval (“Request edit”). Queue tabs follow packing status only. Filters are today’s Orders filters: Store, Period, Status and Packed (Not Packed, Partial Packed, Packed, Late Unpacked, Shipped Delayed). Request stock, decoration state and name export stay.'],
  picker: ['Today’s Picking List, nothing more.', 'No Store, Period or Sync filters, no fulfilment, no customer details, labels or invoices. Filters are today’s Picking List filters: Packed status (opens on Not Packed + Partial Packed), Print status and barcode search. Bin locations, slip printing, Full / Partial packing and the notify step stay.'],
};
const L1_NOTE = {
  admin: ['Sees the whole ledger.', 'Every order is the client’s FileMaker order: a header line coloured by status (what a collapsed order shows), the lines, and a footer with Production and Pick &amp; Pack lights, Urgent / Repeat, Picking list | P, totals, payment and star, the design track, FulfilPro’s fulfilment actions and Marketing + VIP. Admin also gets stock, PO, decorators, approvals, 17track and Delete (FulfilPro only). Try: click a header line, Collapse all, − to omit, Production, Urgent, the design steps, the Sync ••• button.'],
  staff: ['Today’s Orders scope, in the ledger layout.', 'Prices, totals and payment are read-only; Urgent, Repeat and line remarks are editable; Production, the design track and Marketing are read-only. Fulfilment uses today’s Actions (Confirm fulfilment, & Print, Print label, Message). No delete, no stock adjustment, no picking list, no customer email.'],
  picker: ['Today’s Picking List scope, in the ledger layout.', 'No prices, payment, marketing, customer contact, labels or invoices. The header line shows items, packed and the picking-list state; Pick &amp; Pack is Confirm packed; Picking list | P prints the slip; Urgent and Repeat are read-only flags; the footer lists the packing history.'],
};
const ALL_CONCEPTS = [
  { id: 'l1', fn: L.conceptL1, t: 'L1 · Order Ledger: the client’s FileMaker layout and colours, with every FulfilPro feature', rec: 'Proposed · for client approval · 1440 × 900',
    d: 'Built from the 13 Nov walkthrough of the client’s “Order Scheduler · Online Orders Ledger”. Each order keeps the client’s three bands: a <b>header line</b> (date, order, branch, name, email, ship to, PO, tracking, label and tax invoice with their <b>P</b> printed state) coloured with the client’s own legend, the <b>lines</b> (description, SKU, size, qty, price, shipped / refunded, stock, supplier · PO, packed, tracking, status, stock return, back order, remark), and a <b>footer panel</b> (Production and Pick &amp; Pack lights, Urgent and Repeat, Picking list | P, totals, payment with the star, Design sent › approved › colours, Marketing + VIP). FulfilPro’s extras sit in the same bands. Collapsed, an order is one coloured line, as in FileMaker.',
    notes: L1_NOTE, extra: L.ledgerDocs(),
    tags: [['Client’s colours and layout', 'good'], ['All FulfilPro features kept', 'good'], ['Needs new data fields (listed below)', 'warn']] },
  { id: 'a1', fn: D3.conceptA3, t: 'A1 · Current app: queue table, fits 1280px without sideways scroll', rec: 'Current app · for comparison',
    d: 'The queue-table page, re-laid so the table and an opened order fit about 1200px (1280px screen, sidebar collapsed) with no sideways scroll. Items is narrower and Packed and Fulfilment share one column; Decoration becomes Status with the old system’s badge set, laid out in two columns; every order is a group with a status-coloured left stripe and a gap. In the opened order the product name links to Shopify, the SKU is a short copy chip, EMB / PRT sit under each product, Confirm fulfilment and & Confirm live in the Order items action bar (no Fulfilment section), and Shipping sits under Packing & slip.',
    extra: D3.statusLegend(),
    tags: [['No horizontal scroll at 1280px', 'good'], ['Status stripe + gap between orders', 'good'], ['Rows grow with Status badges', 'warn']] },
  { id: 'a1-old', fn: D.conceptA2, t: 'A1 (original) · Queue table, expanded panel uses the space', rec: 'Superseded · gray/blue shell skin',
    d: 'Queue tabs with live counts, a four-step stage track, a green slip icon once the picking slip is printed, and a row that opens in place. The expanded order is laid out so no column stretches to fill blank space: items, fulfilment with packing, and customer details with the customer note with the full Shipping block from today’s Orders page (title, Free / Paid, codes, Price, Discounted).',
    tags: [['No empty block under short orders', 'good'], ['Shipping Price / Discounted restored', 'good'], ['Notes always in view', 'good']] },
  { id: 'b', fn: D.conceptB, t: 'B · Split queue with order inspector', rec: 'Recommended · gray/blue shell skin',
    d: 'A compact two-line order list on the left and a persistent inspector on the right. No expanding: one click (or J / K) opens an order, and its items, packing, fulfilment, customer and messages are all in view. For pickers the inspector becomes a large-target pack panel built for a tablet.',
    tags: [['Fewest clicks per order', 'good'], ['Best for tablets and scanners', 'good'], ['Fewer orders visible than A', 'warn']] },
  { id: 'c', fn: D.conceptC, t: 'C · Zoned workspace', rec: 'Same gray/blue colours · Inventory-style layout',
    d: 'The zoned, no-scroll workspace layout of Inventory, in the same gray/blue colours as the rest of the app: module tabs, a queue band that doubles as live counters, an order matrix, an order detail zone and action zones, each in its own panel. A shortlist zone keeps the next orders to print (or to fulfil) in sight.',
    tags: [['Matches the Inventory page', 'good'], ['Most information on one screen', 'good'], ['Most panels to keep aligned', 'warn']] },
  { id: 'd', fn: D2.conceptD, t: 'D · Order sheet, product lines always visible', rec: 'Recommended · gray/blue shell skin', d: 'Every order is a compact card whose product lines are always visible. Colour, Shopify link, available quantity and purchase-order status are readable without opening anything, and the one next action (Confirm packed or Confirm fulfilment) sits on the order header.', tags: [['Product info with zero clicks', 'good'], ['Best fit for stock and PO', 'good'], ['About four orders per screen', 'warn']] },
  { id: 'e', fn: D2.conceptE, t: 'E · Today’s Orders table, refreshed', rec: 'Closest to today · gray/blue shell skin', d: 'The current Orders page columns, search, dropdown filters, selection bar, pagination (with page size) and three-column expanded row, with the stage track, the green slip icon and short badges added. Pickers get today’s Picking List in the same style.', tags: [['Almost no retraining', 'good'], ['Same filters and actions as today', 'good'], ['Product info needs an expand', 'warn']] },
  { id: 'f', fn: D2.conceptF, t: 'F · Orders table with Orders / Products toggle', rec: 'Gray/blue shell skin', d: 'The same table shell as E, plus a Products view that groups open order lines by product: how many are needed across orders, packed so far, available, PO status and a bulk Create POs for admins. For pickers it becomes a bin-sorted pick list. Switch views with the toggle.', tags: [['Purchasing and picking meet', 'good'], ['Product-first planning', 'good'], ['A second view to learn', 'warn']] },
];
// Concept A1 (the former A2) is the chosen layout; the original A1 and B–F are archived in ./archive. Rebuild them with CONCEPTS=a1-old,b,c,d,e,f.
const ACTIVE = (process.env.CONCEPTS ?? 'l1,a1').split(',');
const CONCEPTS = ALL_CONCEPTS.filter((c) => ACTIVE.includes(c.id));

const FILE_CSS = CSS + D.CSS2 + D.CSS_B + D.CSS_C + D.CSS_A2 + D2.CSS_D + CSS_X + L.CSS_L1;
const arts = {};
for (const c of CONCEPTS) for (const r of ROLES) {
  arts[c.id + r] = c.fn(r);
  writeFileSync(new URL(`./concept-${c.id}-${r}.html`, import.meta.url), D.wrapDoc(`Concept ${c.id.toUpperCase()} · ${ROLE_LABEL[r]}`, FILE_CSS + (c.id === 'a1' || c.id === 'l1' ? D3.CSS_A3 : '') + '.art{border:0;border-radius:0;box-shadow:none}', arts[c.id + r]));
}

const INDEX_CSS = `
body{background:#e9edf3}
.sheet{width:1560px;margin:0 auto;padding:36px 0 60px}
.sh-hd{padding:0 60px 22px}.sh-hd h1{font-size:24px;letter-spacing:-.3px}
.sh-hd p{font-size:13px;color:#4b5563;margin-top:7px;line-height:1.55;max-width:1040px}
.mx{margin:16px 60px 6px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:11.5px}
.mx table{width:100%;border-collapse:collapse}.mx th,.mx td{padding:6px 10px;border-bottom:1px solid #f3f4f6;text-align:left}
.mx th{background:#f9fafb;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280}.mx td:not(:first-child),.mx th:not(:first-child){text-align:center;width:150px}
.mx .y{color:#047857;font-weight:700}.mx .n{color:#9ca3af}
.case{padding:26px 60px 0}
.case-hd{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}
.case-no{width:28px;height:28px;border-radius:8px;background:#111827;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.case-t{font-size:17px;font-weight:700;letter-spacing:-.2px;display:flex;align-items:center;gap:8px}
.rec{font-size:10px;font-weight:700;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:2px 8px}
.case-d{font-size:12.5px;color:#4b5563;margin-top:4px;line-height:1.55;max-width:1000px}
.tags{display:flex;gap:6px;margin-top:8px}.tg{font-size:10px;font-weight:700;padding:2.5px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;color:#4b5563}
.tg.good{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.tg.warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
.rs{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.rs button{font:700 12px Arial;padding:6px 12px;border-radius:8px;border:1px solid #d1d5db;background:#fff;color:#374151;cursor:pointer}
.rs button.on{background:#111827;border-color:#111827;color:#fff}
.rs .note{font-size:12px;color:#4b5563;margin-left:6px}.rs .note b{color:#111827}
.pane{display:none}.pane.on{display:block}
.faq{margin:30px 60px 0;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;font-size:12.5px;line-height:1.6;color:#374151}
.faq h2{font-size:14px;margin-bottom:6px}.faq li{margin-left:18px;margin-top:3px}
`;
const row = (l, a, s, p) => `<tr><td>${l}</td>${[a, s, p].map((v) => `<td class="${v ? 'y' : 'n'}">${v ? '✓' : '—'}</td>`).join('')}</tr>`;
const matrix = `<div class="mx"><table><tr><th>Capability (unchanged from today)</th><th>Admin</th><th>Staff / Test</th><th>Order Picker</th></tr>
${row('Store, Period filters and Sync', 1, 1, 0)}${row('Fulfilment status, fulfilment column, tracking link', 1, 1, 0)}${row('Print status filter, green printed icon, print picking slip (bin, remark)', 1, 0, 1)}
${row('Packing: Full / Partial, Confirm packed, notify, cancel confirmation', 1, 0, 1)}${row('Customer details, labels, tax invoice, name export, new invoice', 1, 1, 0)}
${row('Confirm fulfilment; edit / cancel fulfilment', 1, 1, 0)}${row('Pending-request approvals, stock adjustment, decoration assign / mark done, line-item edit, attachments', 1, 0, 0)}${row('Request stock (back in stock), decoration state, name-attribute export, label-printed state', 1, 1, 0)}${row('Notes, messages, refresh order', 1, 1, 1)}${row('Product colour swatch and name', 1, 1, 1)}${row('Product link to Shopify admin', 1, 1, 0)}${row('Available quantity and purchase-order status on each line', 1, 1, 0)}${row('Create purchase order (+ PO), prefilled with the shortfall', 1, 0, 0)}${row('Copy protection (text selection blocked) on order surfaces', 0, 1, 1)}</table></div>`;

const withPo = ACTIVE.includes('d');
if (withPo) {
  arts.dpo = D2.conceptDPo();
  writeFileSync(new URL('./concept-d-admin-po.html', import.meta.url), D.wrapDoc('Concept D · Create PO', FILE_CSS + '.art{border:0;border-radius:0;box-shadow:none}', arts.dpo));
}
const rolesOf = (c) => (c.id === 'd' && withPo ? [...ROLES, 'po'] : ROLES);
const noteOf = (c, r) => (c.notes && c.notes[r]) || ROLE_NOTE[r];
const caseHtml = (c) => `<section class="case" data-case="${c.id}"><div class="case-hd"><div class="case-no">${c.id.toUpperCase()}</div><div><div class="case-t">${c.t}<span class="rec">${c.rec}</span></div><div class="case-d">${c.d}</div><div class="tags">${c.tags.map(([l, k]) => `<span class="tg ${k}">${l}</span>`).join('')}</div></div></div>
<div class="rs">${rolesOf(c).map((r, i) => `<button data-r="${r}" class="${i ? '' : 'on'}">${ROLE_LABEL[r]}</button>`).join('')}<span class="note" data-note></span></div>
${rolesOf(c).map((r, i) => `<div class="pane${i ? '' : ' on'}" data-r="${r}" data-n="${noteOf(c, r)[0]}||${noteOf(c, r)[1]}">${r === 'po' ? arts.dpo : arts[c.id + r]}</div>`).join('')}${c.extra ?? ''}</section>`;
const index =`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FulfilPro · Orders · L1 Order Ledger (proposed) + A1 (current)</title><style>${FILE_CSS}${D3.CSS_A3}${INDEX_CSS}</style></head><body><div class="sheet">
${ACTIVE.includes('l1') ? `<div class="sh-hd" style="padding-bottom:4px"><h1>Orders page, round 19: L1 Order Ledger (proposed, for client approval)</h1>
<p>The Orders page redesigned around the client’s FileMaker <b>Online Orders Ledger</b>: the same three bands per order (header line, lines, footer panel), the client’s <b>own colours</b> (measured from their screenshots, so the staff read the page the way they read FileMaker today), and <b>every FulfilPro feature kept</b> inside those bands. Each of the client’s 18 numbered controls is mapped below the artboards (kept, merged, removed or new), followed by the colour legend, the role split, the data the build round needs and the open questions. Artboards are 1440 × 900 (sidebar collapsed) and are interactive: expand / collapse, omit, select the found set, Urgent, Production, Pick &amp; Pack, the design steps, Marketing, the Sync ••• popover and Delete all respond. The <b>current app (A1)</b> stays further down for comparison.</p></div>${caseHtml(CONCEPTS.find((c) => c.id === 'l1'))}` : ''}
<div class="sh-hd"><h1>${ACTIVE.includes('l1') ? 'Current app: Concept A1 (for comparison)' : 'Orders + Picking List: one page, Concept A1 (chosen)'}</h1>
<p>The chosen way to merge the Orders page and the Picking List into one compact page (the other six concepts are archived). It is shown for the three roles that reach it today, so you can see exactly what each person gets and what stays hidden. Every order line now also shows the <b>product colour</b>, a <b>Shopify admin link</b> and, for Admin and Staff, the <b>available quantity</b> and <b>purchase order status</b>; Admin gets a <b>+ PO</b> button on short lines. The layout is built on these ideas: queue tabs with live counts, one smart search, filters as chips, a stage track per order, <b>today’s filters</b> (Store, Period, Status, Packed, Print) and a <b>green printer icon</b> once the picking slip is printed, one bulk bar, and the zoom control from Inventory (50–150%, Ctrl +/−/0; try it on any screen). Artboards are 1280 × 800 and need no page scroll; the order list scrolls inside its card, with two orders opened on every role.</p>
<p style="font-size:12.5px;color:#4b5563">Concept A1 is the queue table re-laid so the queue and an opened order fit 1280&nbsp;px without sideways scroll (the original, wider A1 and concepts B–F are archived in <b>archive/</b>).</p><p style="font-size:11.5px;color:#6b7280">All orders, customers and numbers on these screens are synthetic samples. Round 3 added what the first rounds left out (request stock, decoration, attachments, name export, fulfilment depth, picking-slip and notify dialogs): see <a href="dialogs.html" style="color:#1d4ed8;font-weight:700">dialogs.html</a> for the dialogs and menus and <b>PARITY.md</b> for the full old-vs-new checklist.</p></div>
${matrix}
${CONCEPTS.filter((c) => c.id !== 'l1').map(caseHtml).join('')}
<div class="faq"><h2>${ACTIVE.includes('l1') ? 'Questions from the earlier rounds (A1)' : 'Questions for the client'}</h2><ul>
<li>Should <b>barcode search</b> open up to Staff? Today only the Picking List has it.</li>
<li>Is a separate <b>“Picked”</b> stage needed? Today “picked” is implied by printing the slip.</li>
<li>Filters are now exactly today’s, including Late Unpacked / Shipped Delayed in the Packed menu. Keep them, or retire the 24 h late rule?</li>
<li>Is “Print packing slip” the <b>picking slip</b> (Picking List) or the <b>shipping label</b> (Orders)? The green icon is built for the picking slip.</li>
<li>Request stock (free-text supplier) and Purchase Orders overlap. Keep both for now, or move Request stock onto POs later?</li>
<li>Route name: keep <b>/orders</b> for everyone, or introduce a new route and redirect both old pages?</li>
<li>Should pickers see a simple <b>“short, on PO”</b> hint? Today pickers have no access to Inventory, so it is left out.</li>
<li>Should the + PO button prefill the <b>shortfall</b> (shown) or the supplier’s usual reorder quantity?</li>
<li>Should the product link also offer the <b>storefront page</b>, or is Shopify admin enough?</li>
<li>Pickers keep their current home page behaviour (they land on this page, not on a separate list).</li></ul></div>
</div>${ZOOM_JS}<script>
document.querySelectorAll('.case').forEach(function(c){
  function show(r){c.querySelectorAll('.pane').forEach(function(p){p.classList.toggle('on',p.dataset.r===r)});
    c.querySelectorAll('.rs button').forEach(function(b){b.classList.toggle('on',b.dataset.r===r)});
    var p=c.querySelector('.pane.on').dataset.n.split('||');c.querySelector('[data-note]').innerHTML='<b>'+p[0]+'</b> '+p[1];}
  c.querySelectorAll('.rs button').forEach(function(b){b.addEventListener('click',function(){show(b.dataset.r)})});show('admin');});
</script></body></html>`;
writeFileSync(new URL('./index.html', import.meta.url), index);
writeFileSync(new URL('./dialogs.html', import.meta.url), buildDialogs());
console.log(`built index.html, dialogs.html + ${CONCEPTS.length * ROLES.length + (withPo ? 1 : 0)} artboards`);
