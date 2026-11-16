/* Concept L1 "Order Ledger": footer widgets, toolbar, popovers and the index notes.
   Colours are the client's FileMaker palette (--fm-* tokens in ledger.mjs). Pure renderers: data comes from ledger-data.mjs. */
import * as P from './parts.mjs';
import * as X from './extras.mjs';
import { ledgerOf, money, paymentTotals, METHODS } from './ledger-data.mjs';
import { packHistOf, confsOf, stockAdjOf, restockState, RESTOCK_LABEL, STORES } from './data.mjs';
import { P as ICONS } from './chrome-base.mjs';
const { ic, CAP, totalQty, packedQty } = P;

Object.assign(ICONS, {
  star: 'M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5z',
  receipt: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  note: 'M7 4h10a2 2 0 012 2v14l-4-3H7a2 2 0 01-2-2V6a2 2 0 012-2z M8 8h8 M8 12h5',
  minusCircle: 'M12 21a9 9 0 100-18 9 9 0 000 18z M8 12h8',
  listCheck: 'M3 6l2 2 3-3 M3 13l2 2 3-3 M11 6h10 M11 13h10 M3 20h18',
  zap: 'M13 2L4 14h8l-1 8 9-12h-8l1-8z',
  repeat: 'M17 2l4 4-4 4 M3 12V10a4 4 0 014-4h14 M7 22l-4-4 4-4 M21 12v2a4 4 0 01-4 4H3',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z',
  factory: 'M3 21h18 M4 21V10l5 3v-3l5 3V6l6 4v11 M8 17h1 M13 17h1 M17 17h1',
  hourglass: 'M6 3h12 M6 21h12 M7 3v3a5 5 0 0010 0V3 M7 21v-3a5 5 0 0110 0v3',
  megaphone: 'M3 10v4h3l6 4V6L6 10H3z M16 9a4 4 0 010 6 M19 6a8 8 0 010 12',
});

const btn = (cls, inner, attrs = '') => `<button class="${cls}"${attrs}>${inner}</button>`;
const dis = (off, tip) => (off ? ` disabled title="${tip}"` : '');

/* ---------------- footer columns ---------------- */
/** Col 1: the client's status lights (#8 Production, #10 Pick & Pack) and the slip Remark. */
function lights(r, l, cap, role) {
  const prodTxt = l.prod ? `${l.prod.room} · ${l.prod.at}` : l.deco ? 'Set room date' : '';
  const prodTip = l.deco ? 'Lit automatically: the order has embroidery, print, setup fee or decoration. Click to record the date and time it went to the decoration room.' : 'No decoration on this order. Click to mark it for production.';
  const prod = cap.deco === 2
    ? btn(`lt prod${l.deco ? ' on' : ''}`, `${ic('factory', 'i12')}<b>Production</b>${prodTxt ? `<span class="lt-d">${prodTxt}</span>` : ''}`, ` data-l1-pop="prod-${role}" title="${prodTip}"`)
    : `<span class="lt prod ro${l.deco ? ' on' : ''}" title="${prodTip}">${ic('factory', 'i12')}<b>Production</b>${l.prod ? `<span class="lt-d">${prodTxt}</span>` : ''}</span>`;
  const pq = packedQty(r), tq = totalQty(r);
  const ppTxt = l.packedAll ? `Packed ${l.packedAt}` : pq ? `${pq}/${tq} packed` : 'Not actioned';
  const ppTip = l.packedAll ? 'Picked and packed. Click to see or cancel the packing confirmation.' : 'Orange until the order is picked and packed. Click to confirm packed (Full / Partial per line, then notify).';
  const pp = cap.pack
    ? btn(`lt pp${l.packedAll ? ' on' : ''}`, `${ic('package', 'i12')}<b>Pick &amp; Pack</b><span class="lt-d">${ppTxt}</span>`, ` data-l1-pp title="${ppTip}"`)
    : `<span class="lt pp ro${l.packedAll ? ' on' : ''}" title="${ppTip}">${ic('package', 'i12')}<b>Pick &amp; Pack</b><span class="lt-d">${ppTxt}</span></span>`;
  const rem = cap.slip ? btn('fb ink', `${ic('note', 'i12')}Remark${l.slipRemark ? '<i class="dot"></i>' : ''}`, ` title="${l.slipRemark ? 'Slip remark: ' + l.slipRemark : 'Add a remark that prints on the picking list'}"`) : '';
  return `<div class="fc">${prod}${pp}${rem}</div>`;
}
/** Col 2: lines shown, + Item, Urgent (#11) with need-by date, Repeat order (new), Picking list | P. */
function orderCtl(r, l, cap, role) {
  const n = r.items.length, edit = role !== 'picker';
  const urg = edit
    ? btn(`tg urg${l.urgent ? ' on' : ''}`, `${ic('zap', 'i12')}Urgent${l.urgent ? `<span class="tg-d">${l.urgent.slice(0, 5)}</span>` : ''}`, ` data-l1-pop="urg-${role}" title="Priority order: goes to the top of every list (orders, picking, decoration). Set the date the customer needs it."`)
    : `<span class="tg urg ro${l.urgent ? ' on' : ''}">${ic('zap', 'i12')}Urgent${l.urgent ? `<span class="tg-d">${l.urgent.slice(0, 5)}</span>` : ''}</span>`;
  const rep = edit
    ? btn(`tg rep${l.repeat ? ' on' : ''}`, `${ic('repeat', 'i12')}Repeat`, ' data-l1-tog title="Repeat order: check the previous order for remarks before starting"')
    : `<span class="tg rep ro${l.repeat ? ' on' : ''}">${ic('repeat', 'i12')}Repeat</span>`;
  const pl = cap.slip
    ? `<span class="seg brand"><button title="Print the picking list (per-line qty, Location, Remark)">${ic('printer', 'i12')}Picking list</button><button class="p${l.pickAt ? ' on' : ''}" title="${l.pickAt ? 'Printed ' + l.pickAt + ' · print again' : 'Not printed yet'}">P</button></span><span class="stp-d">${l.pickAt || 'Not printed'}</span>`
    : `<span class="stp-d">${l.pickAt ? `${ic('check', 'i10')}Picking list printed ${l.pickAt}` : 'Picking list not printed'}</span>`;
  return `<div class="fc">
    <div class="fr2">${btn('tg lines on', `${ic('eye', 'i12')}Lines ${n}/${n}`, ' data-l1-lines-show title="Show all lines, or hide shipped lines"')}${cap.lineEdit ? btn('tg add', `${ic('plus', 'i12')}Item`, ' title="Add a line item (or a custom item)"') : ''}</div>
    <div class="fr2">${urg}${rep}</div>
    <div class="fr2">${pl}</div></div>`;
}
/** Col 3: order totals, as the old ledger (Sub total, Discount, Shipping, Tax, Freight, Total) plus quantity. */
function totals(l) {
  const t = l.totals;
  return `<div class="fc tot"><dl class="tt">
    <dt>Sub total <span class="muted">· ${t.qty} pcs</span></dt><dd>${money(t.sub)}</dd>
    <dt>Discount</dt><dd class="neg">${t.disc ? '−' + money(t.disc) : '—'}</dd>
    <dt>Shipping</dt><dd>${t.ship ? money(t.ship) : 'Free'}</dd>
    <dt>Tax <span class="muted">GST incl.</span></dt><dd>${money(t.tax)}</dd>
    <dt>Freight</dt><dd>—</dd>
    <dt class="b">Total</dt><dd class="b">${money(t.total)}</dd></dl></div>`;
}
const STAR_TIP = { paid: 'Fully paid', yellow: 'Unpaid', orange: 'Partly paid, money owing', red: 'Shipped and money still owing', none: 'Canceled' };
/** Col 4: payment box, star (#13) in the client's payment colours, payment method, follow-up date. */
function payment(r, l, cap) {
  const ro = cap.req !== 'direct';
  return `<div class="fc pay"><div class="pbx">
      <div class="pr ok"><b>Paid by customer</b><span>${money(l.paid)}</span></div>
      <div class="pr rf"><span>Refunded</span><span>${l.refunded ? '−' + money(l.refunded) : '—'}</span></div>
      <div class="pr net"><b>Net payment</b><b>${money(l.net)}</b></div>
      <div class="pr ow${l.owing ? ' due' : ''}"><span>Amount owing</span><span>${money(l.owing)}</span></div>
    </div>
    <div class="pside"><button class="star s-${l.star}" title="${STAR_TIP[l.star]}${ro ? '' : ' · click to record a payment'}">${ic('star', 'i16')}</button>${ro ? '' : `<button class="ib" title="Refresh payment from Shopify">${ic('refresh', 'i12')}</button>`}</div>
    <div class="pm"><span class="mth" title="Payment method">${l.method}</span>${l.owing ? `<span class="fu" title="Payment follow-up date">${ic('calendar', 'i10')}Follow up ${l.followUp.slice(0, 5)}</span>` : ''}</div></div>`;
}
/** Col 5: design track (#14 + #16): Design sent › Design approved › Colours chosen, the field shows the active step's value; upload design. */
function design(r, l, cap) {
  const d = l.design, admin = cap.deco === 2;
  const S = [['sent', 'Design sent', 'Designer', 'Who is making the design'], ['approved', 'Design approved', 'Approved by', 'Who approved it'], ['colours', 'Colours chosen', 'Thread colours', 'e.g. 2045, 2150, 2726']];
  const act = d.colours ? 2 : d.approved ? 1 : 0;
  const steps = S.map(([k, t, lab, ph], i) => `<${admin ? 'button' : 'span'} class="stp${d[k] ? ' done' : ''}${i === act ? ' act' : ''}" data-l1-step data-lab="${lab}" data-val="${d[k] || ''}" data-ph="${ph}">${t}</${admin ? 'button' : 'span'}>`).join('');
  const [, , lab, ph] = S[act];
  const a = r.att || { design: 0 };
  return `<div class="fc dsg"><div class="steps">${steps}</div>
    <div class="dv"><span class="dv-l" data-l1-dvl>${lab}</span><span class="dv-v${d[S[act][0]] ? '' : ' ph'}" data-l1-dvv>${d[S[act][0]] || ph}</span></div>
    <div class="fr2"><span class="muted" style="font-size:9.5px">${ic('paperclip', 'i10')} Customer design${a.design ? ` <b class="strong">${a.design} file</b>` : ': none'}</span>${admin ? `<button class="lnk">${ic('upload', 'i10')}Upload design</button>` : ''}</div></div>`;
}
/** Col 6: FulfilPro actions the old system does not have (kept): fulfilment, history, stock, names. */
function fulfil(r, l, cap) {
  const locked = r.canceled || r.closed, done = l.ful === 'full', off = locked || done;
  const tip = locked ? 'Closed or canceled orders cannot be fulfilled' : 'Already fully fulfilled';
  const nConf = confsOf(r).length, nRestock = r.items.filter((x) => x.restock).length, nNames = r.items.filter((x) => x.nameAttr).length;
  const fh = nConf ? btn('fb gh', `Fulfilments${nConf > 1 ? ` (${nConf})` : ''}${ic('chevronRight', 'i10')}`, ' title="Fulfilment history: parcels, barcodes, edit / cancel"') : btn('fb gh', `Fulfilments${ic('chevronRight', 'i10')}`, ' disabled title="No fulfilments yet"');
  const rq = cap.reqStock && !r.canceled ? btn('fb gh', `Request stock${nRestock ? `<i class="cnt">${nRestock}</i>` : ''}`, ' title="Ask for a supplier restock (back in stock)"') : '';
  if (cap.actions) { // Staff: today's Actions block
    const c2 = done ? 'fb gh' : 'fb gh';
    return `<div class="fc ful">
      <div class="fr2">${btn(off ? 'fb gh' : 'fb br', locked ? 'Fulfilment locked' : 'Confirm fulfilment', dis(off, tip))}${btn('fb gh', `${ic('printer', 'i10')}&amp; Print`, dis(off, tip) || ' title="Confirm fulfilment and print the shipping label"')}</div>
      <div class="fr2">${btn(c2, `${ic('tag', 'i10')}Print label`, dis(done, 'Already fully fulfilled'))}${btn(c2, `${ic('chat', 'i10')}Message${r.msgs ? `<i class="cnt b">${r.msgs}</i>` : ''}`, dis(done, 'Messages are closed for fulfilled orders'))}</div>
      <div class="fr2">${fh}${rq}</div></div>`;
  }
  const sa = stockAdjOf(r);
  return `<div class="fc ful">
    <div class="fr2">${btn(off ? 'fb gh' : 'fb br', locked ? 'Fulfilment locked' : 'Confirm fulfilment', dis(off, tip))}${btn('fb gh', `${ic('printer', 'i10')}&amp; Confirm`, dis(off, tip) || ' title="Confirm fulfilment and print the shipping label"')}</div>
    <div class="fr2">${fh}${rq}</div>
    <div class="fr2">${cap.stockAdj ? btn('fb gh', `${ic('adjust', 'i10')}Stock out ${sa ? `${sa.managed}/${sa.total}` : '-'}`, ' title="Stock adjustment: take the packed quantities out of hub stock"') : ''}${cap.names && nNames ? btn('fb gh', `${ic('download', 'i10')}Names (${nNames})${ic('chevronDown', 'i10')}`, ' title="Export name attributes as CSV or print"') : ''}</div></div>`;
}
/** Col 7: marketing follow-ups (#17), all ticked on a new order; VIP added (manual). */
function marketing(l, cap) {
  const ed = cap.req === 'direct';
  const all = l.mkt.m1 && l.mkt.m3 && l.mkt.m6 && l.mkt.anniv;
  const box = (on, t, k, cls = '') => `<${ed ? 'button' : 'span'} class="mk${on ? ' on' : ''}${cls}"${ed ? ` data-l1-mk="${k}"` : ''}><span class="ck${on ? ' on' : ''}"></span>${t}</${ed ? 'button' : 'span'}>`;
  return `<div class="fc mkt"><div class="fl-t">${ic('megaphone', 'i10')}Marketing${ed ? '<button class="lnk" title="Open the marketing layout to write this customer\'s messages">Edit</button>' : ''}</div>
    <div class="mk-g">${box(all, 'All', 'all')}${box(l.mkt.m3, '3 months', 'm3')}${box(l.mkt.m1, '1 month', 'm1')}${box(l.mkt.m6, '6 months', 'm6')}${box(l.vip, `${ic('crown', 'i10')}VIP`, 'vip', ' vip')}${box(l.mkt.anniv, 'Anniversary', 'anniv')}</div>
    <button class="lnk" style="align-self:flex-start">${ic('history', 'i10')}History</button></div>`;
}
/** Picker: packing history (each confirmation cancellable) and the slip remark, in place of totals / payment / design / marketing. */
function pickerCols(r, l) {
  const hist = packHistOf(r);
  const list = hist.length ? hist.map((e) => `<div class="a3-hist" style="padding:2px 2px 2px 7px"><span><b>Packed ${e.at}</b> <span class="muted">· ${e.n} item${e.n === 1 ? '' : 's'}</span></span><button class="ib" title="Cancel confirmation (sends notification)" style="width:20px;height:20px">${ic('trash', 'i12')}</button></div>`).join('') : '<span class="muted" style="font-size:10px">No packing history yet.</span>';
  return `<div class="fc"><div class="fl-t">${ic('package', 'i10')}Packing history</div><div style="display:flex;flex-direction:column;gap:3px">${list}</div></div>
    <div class="fc"><div class="fl-t">${ic('note', 'i10')}Slip remark</div><span class="dv-v${l.slipRemark ? '' : ' ph'}" style="height:22px">${l.slipRemark || 'No remark on the picking list'}</span></div>`;
}
/** The footer panel, coloured by the order's stage (white / peach "to pick" / light "shipped" / dark "shipped a part"). */
export function footer(r, role) {
  const cap = CAP[role], l = ledgerOf(r);
  const cols = role === 'picker'
    ? [lights(r, l, cap, role), orderCtl(r, l, cap, role), pickerCols(r, l)]
    : [lights(r, l, cap, role), orderCtl(r, l, cap, role), totals(l), payment(r, l, cap), design(r, l, cap), fulfil(r, l, cap), marketing(l, cap)];
  return `<div class="lf f-${l.foot}" style="--fc:${role === 'picker' ? '176px 176px 300px 1fr' : '176px 160px 146px 200px minmax(210px,1fr) 186px 158px'}">${cols.join('')}</div>`;
}
/** One quiet line under the footer: customer note, shipping, last packing, Shopify admin (Admin, Staff). */
export function infoStrip(r, role) {
  const cap = CAP[role];
  if (!cap.cust) return '';
  const ship = (r.codes || []).includes('CLUB5') ? `${r.ship} · Free (CLUB5)` : `${r.ship} · Paid $${r.ship === 'Express' ? '14.00' : '10.69'}`;
  const h = packHistOf(r)[0];
  const parts = [
    r.note ? `<span class="is-n" title="Customer note (Shopify)"><b>Customer note</b>${r.note}</span>` : '',
    `<span><b>Shipping</b>${ship}</span>`,
    h ? `<span><b>Packed</b>${h.at} · ${h.n} item${h.n === 1 ? '' : 's'}</span>` : '',
    restockState(r) && cap.reqStock ? `<span><b>Back in stock</b>${RESTOCK_LABEL[restockState(r)]}</span>` : '',
  ].filter(Boolean);
  return `<div class="li">${parts.join('<i class="sep"></i>')}<span class="sp"></span><a class="lnk" href="#" title="${STORES[r.store].domain}/admin/orders">${ic('external', 'i10')}Open in Shopify admin</a></div>`;
}

/* ---------------- toolbar ---------------- */
const FILTERS = {
  admin: () => P.chip('Status', 'All', 0) + P.chip('Packed', 'All', 0) + P.chip('Print', 'All', 0),
  staff: () => P.chip('Status', 'All', 0) + P.chip('Packed', 'All', 0),
  picker: () => P.chip('Packed', 'Not packed + Partial', 1) + P.chip('Print', 'All', 0),
};
export function toolbar(role) {
  const c = CAP[role];
  const sync = c.sync ? `<span class="muted" style="font-size:10px;white-space:nowrap">Synced 14:12 · 3 new</span><span class="split"><button class="btn ghost" title="Sync new orders from every store now">${ic('refresh', 'i')}Sync now</button><button class="btn ghost sd" data-l1-pop="sync-${role}" title="Sync options: date range, stores, new only, auto-sync">${ic('dots', 'i12')}</button></span>` : '';
  return `<div class="row-tb">${P.searchBox(role)}${c.store ? P.chip('Store', 'All stores', 0) : ''}${c.period ? P.chip('Period', 'All time', 0) : ''}${FILTERS[role]()}<span class="sp" style="flex:1"></span>${sync}<button class="btn ${c.sync ? 'warn' : 'ghost'}" title="Reload the list">${ic('refresh', 'i')}Refresh</button></div>`;
}
const QUICK = {
  admin: [['urg', 'zap', 'Urgent', 2], ['todo', 'calendar', 'To-do today', 4], ['pp', 'package', 'Pick & Pack', 9], ['prod', 'factory', 'Production', 11], ['bo', 'hourglass', 'Back order', 1], ['sr', 'corner', 'Stock return', 0], ['so', 'adjust', 'Stock out', 6], ['nopo', 'cube', 'No PO', 3], ['rep', 'repeat', 'Repeat', 4], ['vip', 'crown', 'VIP', 3]],
  staff: [['urg', 'zap', 'Urgent', 2], ['todo', 'calendar', 'To-do today', 4], ['pp', 'package', 'Pick & Pack', 9], ['prod', 'factory', 'Production', 11], ['bo', 'hourglass', 'Back order', 1], ['sr', 'corner', 'Stock return', 0], ['nopo', 'cube', 'No PO', 3], ['rep', 'repeat', 'Repeat', 4], ['vip', 'crown', 'VIP', 3]],
  picker: [['urg', 'zap', 'Urgent', 2], ['todo', 'calendar', 'To-do today', 4], ['pp', 'package', 'Pick & Pack', 9], ['prod', 'factory', 'Production', 6], ['bo', 'hourglass', 'Back order', 1], ['rep', 'repeat', 'Repeat', 3]],
};
/** Order colours (client legend), always in view at the right of the quick-filter row. */
export const LEGEND = [['late', 'Late'], ['paid', 'Paid'], ['ship', 'Shipped'], ['part', 'Part shipped'], ['purch', 'Purchased'], ['pick', 'To pick'], ['new', 'New']];
const LEGEND_TIP = { late: 'Red: slip printed over 24 h ago and not packed or shipped, or past the urgent need-by date (header line)', paid: 'Green: fully paid, not shipped yet (header line)', ship: 'Light blue: shipped (header, line and footer)', part: 'Dark blue: part of the order shipped (header, line and footer)', purch: 'Purple: a purchase order exists for the line (line)', pick: 'Peach: picking list printed, waiting to be picked (footer)', new: 'White: new, no PO, not shipped, not paid (header, line, footer)' };
export function quickRow(role) {
  const pills = QUICK[role].map(([k, i, t, n]) => `<button class="qp q-${k}" data-l1-tog title="Show only ${t.toLowerCase()} orders">${t}${n ? `<span class="n">${n}</span>` : ''}</button>`).join('');
  const lg = LEGEND.map(([k, t]) => `<span title="${LEGEND_TIP[k]}"><i class="sw-${k}"></i>${t}</span>`).join('');
  return `<div class="l1-r"><span class="l1-k">Quick</span>${pills}<span class="sp"></span><span class="lgd" title="Order colours, as in the client's ledger"><b>Colours</b>${lg}</span></div>`;
}
/** Bottom bar: total paid with the split by payment method (old ledger) + daily report + pager. Picker: quantity and pager only. */
export function bottomBar(role, rows) {
  const pager = `<span class="pg"><span>Showing <b data-l1-rng>1–20</b> of <b data-l1-found>${rows.length}</b></span><select class="pgsz" aria-label="Rows per page">${[10, 20, 50, 100].map((v) => `<option${v === 20 ? ' selected' : ''}>${v}</option>`).join('')}</select><span class="pgb">${ic('chevronLeft', 'i12')}</span><span class="pgb on">1</span><span class="pgb">2</span><span class="pgb">${ic('chevronRight', 'i12')}</span></span>`;
  if (role === 'picker') return `<div class="lbar"><span class="tp"><span>Total qty</span><b>${rows.reduce((a, r) => a + totalQty(r), 0)} pcs</b></span><span class="sp"></span>${pager}</div>`;
  const t = paymentTotals(rows);
  const SHORT = { 'American Express': 'Amex' };
  return `<div class="lbar"><span class="tp"><span>Total paid</span><b>${money(t.all)}</b></span><span class="pmx"><span class="k">Payment method</span>${METHODS.map((m) => `<span><i>${SHORT[m] || m}</i><b>${money(t.by[m])}</b></span>`).join('')}</span><span class="sp"></span>${role === 'admin' ? `<button class="lb-b" title="Print the daily sales report">${ic('chart', 'i12')}Daily report</button>` : ''}${pager}</div>`;
}

/* ---------------- popovers and dialogs (hidden until opened; ledger.mjs L1_JS positions them) ---------------- */
export function popovers(role) {
  const c = CAP[role];
  const sync = c.sync ? `<div class="l1-pop sync" id="sync-${role}" data-fixed role="dialog" aria-label="Sync options">
    <div class="sy"><div class="sy-h">Select date range</div>
      <div class="sy-b"><div class="fr2"><span class="inp di">30/10/2026${ic('calendar', 'i12')}</span><span class="inp di ph">To${ic('calendar', 'i12')}</span></div>
      <span class="muted" style="font-size:9.5px">No range selected = sync everything</span>
      <span class="inp" style="justify-content:space-between;width:100%">List stores: All stores${ic('chevronDown', 'i10')}</span>
      <button class="mk" data-l1-mk="new"><span class="ck"></span>Sync new only</button>
      <button class="sy-go">${ic('refresh', 'i12')}Sync: All stores (after 30/10/2026)</button></div></div>
    <div class="sy"><div class="sy-h">Sync cycle</div>
      <div class="sy-b"><span class="muted" style="font-size:9.5px">Period</span><span class="inp" style="justify-content:space-between;width:100%">Every 15 minutes${ic('chevronDown', 'i10')}</span>
      <div class="fr2"><span class="run">Running</span><button class="fb br" style="flex:1">Apply</button></div>
      <span class="muted" style="font-size:9.5px;line-height:1.35">After each sync the next one runs at the sync time + the period.</span></div></div></div>` : '';
  const prod = c.deco === 2 ? `<div class="l1-pop sm" id="prod-${role}" role="dialog" aria-label="Production"><div class="pp-h"><b>${ic('factory', 'i12')}Given to the decoration room</b><button class="ib" data-l1-close>${ic('close', 'i12')}</button></div>
    <div class="pp-b"><div class="fr2"><span class="inp di">30/10/2026${ic('calendar', 'i12')}</span><span class="inp di">11:05${ic('clock', 'i12')}</span></div>
    <div class="fr2 segs"><button class="on">Embroidery</button><button>Print</button><button>Sewing</button></div>
    <span class="muted" style="font-size:9.5px;line-height:1.35">Lit automatically when a line says embroidery, setup fee, printing or decoration. The date and time show on the light, so you can tell a customer when it went in.</span></div>
    <div class="pp-f"><button class="fb gh" data-l1-close>Clear</button><button class="fb br" data-l1-close>Save</button></div></div>` : '';
  const urg = role !== 'picker' ? `<div class="l1-pop sm" id="urg-${role}" role="dialog" aria-label="Urgent"><div class="pp-h"><b>${ic('zap', 'i12')}Urgent order</b><button class="ib" data-l1-close>${ic('close', 'i12')}</button></div>
    <div class="pp-b"><span class="muted" style="font-size:9.5px">Date the customer needs the goods</span><span class="inp di">03/11/2026${ic('calendar', 'i12')}</span>
    <span class="muted" style="font-size:9.5px;line-height:1.35">Urgent orders go to the top of every list: orders, picking list and decoration.</span></div>
    <div class="pp-f"><button class="fb gh" data-l1-close data-l1-urg="off">Not urgent</button><button class="fb br" data-l1-close data-l1-urg="on">Mark urgent</button></div></div>` : '';
  const del = c.req === 'direct' ? `<div class="l1-scrim" id="del-${role}"><div class="dlg" style="width:380px"><div class="dh"><div><b>Delete order <span data-l1-delno></span>?</b><span class="muted">It is removed from FulfilPro only. Shopify keeps the order.</span></div><button class="ib" data-l1-close>${ic('close', 'i')}</button></div>
    <div class="db" style="font-size:11px;line-height:1.5">Its picking, packing and decoration records are deleted with it. A later sync will not bring it back unless you sync that date range again.</div>
    <div class="df"><button class="btn ghost" data-l1-close>Cancel</button><button class="btn" style="background:#e44030;color:#fff" data-l1-delok>${ic('trash', 'i')}Delete from FulfilPro</button></div></div></div>` : '';
  return sync + prod + urg + del + `<div class="l1-toast" role="status"><span data-l1-tmsg></span><button data-l1-undo>Undo</button></div>`;
}

/* ---------------- index.html notes under the L1 artboards ---------------- */
const SW = { late: '#f4c4c4', paid: '#b8e874', ship: '#dcf0f8', part: '#b3d1ef', purch: '#e4ccfc', pick: '#f8e0a0', new: '#ffffff', cx: '#eceaf2' };
export function ledgerDocs() {
  const sw = (h) => `<i style="background:${h}"></i>`;
  const tr = (cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
  const colours = [
    [sw(SW.late), '<b>Red · Late</b>', '#f4c4c4', 'Header line', 'Slip printed over 24 h ago and not packed / not shipped (today’s Late Unpacked, Shipped Delayed), or past the Urgent need-by date'],
    [sw(SW.paid), '<b>Green · Paid</b>', '#b8e874', 'Header line', 'Fully paid and not shipped yet'],
    [sw(SW.ship), '<b>Light · Shipped</b>', '#dcf0f8', 'Header, line, footer', 'Fulfilled (whole order, or that line)'],
    [sw(SW.part), '<b>Dark · Shipped a part</b>', '#b3d1ef <span class="q">to confirm</span>', 'Header, line, footer', 'Partially fulfilled'],
    [sw(SW.purch), '<b>Purple · Purchased</b>', '#e4ccfc', 'Line', 'A purchase order exists for the line'],
    [sw(SW.pick), '<b>Peach · To pick</b>', '#f8e0a0 <span class="q">to confirm</span>', 'Footer', 'Picking list printed, not fully packed (seen in the video, not in the legend)'],
    [sw(SW.new), '<b>None · New</b>', '#ffffff', 'Header, line, footer', 'No PO, not shipped, not paid'],
    [sw(SW.cx), '<b>Grey · Canceled / closed</b>', '#eceaf2 <span class="q">proposal</span>', 'Header line', 'New: red already means Late, so canceled orders are grey with the number struck through'],
  ].map(tr).join('');
  const star = `<span class="l1-st"><span class="star s-paid">${ic('star', 'i16')}</span>Paid (clear)</span><span class="l1-st"><span class="star s-yellow">${ic('star', 'i16')}</span>Unpaid</span><span class="l1-st"><span class="star s-orange">${ic('star', 'i16')}</span>Partly paid</span><span class="l1-st"><span class="star s-red">${ic('star', 'i16')}</span>Shipped, money owing</span>`;
  const M = (n, old, d, txt) => tr([`<b>${n}</b>`, old, `<span class="dc ${{ New: 'new', Merged: 'merged', Removed: 'removed' }[d] || 'mix'}">${d}</span>`, txt]);
  const map = [
    M('0', '(−) at the start of the order', 'New', 'Omit: hides the order from the current found set only (Undo toast). Nothing is deleted'),
    M('1', 'Tick above “Online Order”', 'Merged', 'The checkbox in the column-title row selects the <b>whole found set</b> (not just the page) for the bulk bar'),
    M('2', 'Order tick (lines)', 'Merged', 'No separate icon: the tick in the line header ticks every line (Full)'),
    M('3', 'Eye + magnifier next to the name', 'Kept / removed', 'Eye opens our Customer record; the magnifier is removed'),
    M('4', 'Task / Problem', 'Removed', 'FulfilPro already has Tasks'),
    M('4·5', 'Label | P, Tax invoice | P', 'Merged', 'Our label and tax-invoice print. The <b>P</b> segment fills with the button colour once printed'),
    M('6', 'Delete (bin)', 'New', 'Admin only. Deletes the order from FulfilPro, never from Shopify, after a confirm dialog'),
    M('7', 'Take from', 'Removed', 'Not used'),
    M('8', 'Production', 'New', 'Lights green automatically on embroidery / setup fee / printing / decoration. Click: date + time it went to the decoration room (shown on the light)'),
    M('9', 'Pick to do date, (Paid) payment follow-up', 'Removed / moved', 'Pick-to-do date removed (summary). The payment follow-up date shows in the payment box when money is owing'),
    M('10', 'Pick &amp; Pack', 'Merged', 'Orange until picked and packed, then green with the date. It is our Confirm packed (Full / Partial per line, notify)'),
    M('11', 'Urgent', 'New', 'Toggle + date the customer needs the goods; urgent orders go to the top of every list. <b>Repeat order</b> added next to it'),
    M('12', 'Supplier', 'Removed', 'Not used; supplier and PO live on each line'),
    M('13', 'Star', 'New', 'Payment state, in the client’s colours (below)'),
    M('14·16', 'Design sent › Design approved › Colours chosen + name field', 'New', 'Three steps, each goes green when done; the field shows the clicked step’s value (designer, who approved, thread numbers). Customer design upload next to it'),
    M('15', 'A4 / Label (orange), Booking Ship, Emb / Print date', 'Removed / moved', 'The old courier service is gone. The decoration-room date is on the Production light (#8)'),
    M('17', 'Marketing: All, One month, Three / Six months, Anniversary, Edit, History', 'New', 'All ticked on a new order. <b>VIP</b> added (manual). Edit opens the marketing layout'),
    M('18', '≡ master select (On time)', 'Merged', 'The tick in the line header selects every line (Full)'),
    M('—', 'Order’s remark', 'Merged', 'Our Order notes (note icon with count in the header line)'),
    M('—', 'Stock return, Back order, Remark per line', 'New', 'Per line: return, back-order quantity and a free-text remark (e.g. “used 1105 from stock”)'),
    M('—', 'Sync now ••• (date range, stores, new only, sync cycle)', 'New', 'Popover on our Sync button'),
    M('—', 'Quick buttons (Urgent, To-do today, Pick &amp; Pack, Production, Back order, Stock return, Stock out, No PO)', 'New', 'Quick-filter row, plus Repeat and VIP; the colour legend sits at its right'),
    M('—', 'Total paid + payment-method totals, Daily report', 'New', 'Purple bottom bar (Admin, Staff)'),
  ].join('');
  const kept = ['Search with field picker and barcode', 'Store, Period, Status, Packed, Print filters, queue tabs, sort', 'Approvals strip', 'Per line: Avail, PO status / Purchase (+ PO), Decorator (assign, mark done, view), Partial', 'Request stock, Fulfilments history, Confirm fulfilment, & Confirm', 'Stock adjustment (as Stock out), Export names', 'Notes, Messages, 17track, per-order refresh', 'Customer note, Shipping, packing history (info line)', 'Decoration attachments strip (Files, Customer design, Photo, Customer remarks), visible without expanding', 'Bulk bar, pager with rows per page, zoom 50–150%'];
  const need = ['<b>Order</b>: financial status + outstanding (Shopify <code>displayFinancialStatus</code>, <code>totalOutstandingSet</code>), tags, urgent + need-by date, repeat order, soft delete, tax-invoice printed time, decoration-room date + time, design track (designer, approved by, thread colours), payment follow-up date, payment recorded by staff', '<b>Customer</b>: marketing preferences (1 / 3 / 6 months, anniversary), VIP; a link from Order to Customer for the eye', '<b>Order line</b>: remark, stock-return and back-order quantities; supplier / PO link per line', '<b>Omit</b>: per-user view state (not stored on the order)', '<b>Sync</b>: date range, new-only, auto-sync period'];
  const roles = [['Omit, expand / collapse, quick filters, colour legend', 1, 1, 1], ['Urgent / Repeat', 'edit', 'edit', 'read'], ['Prices, totals, payment, star, payment-method totals', 'edit', 'read', '—'], ['Production light + room date, design track', 'edit', 'read', 'read (Production)'], ['Pick &amp; Pack (Confirm packed), Picking list | P, slip Remark', 1, 'read', 1], ['Label | P, Tax invoice | P', 1, 1, '—'], ['Marketing + VIP', 'edit', 'read', '—'], ['Line remark, Stock return, Back order', 'edit', 'edit', 'read (remark)'], ['Delete order (FulfilPro only)', 1, '—', '—']].map(([t, ...v]) => `<tr><td>${t}</td>${v.map((x) => `<td class="${x === '—' ? 'n' : 'y'}">${x === 1 ? '✓' : x}</td>`).join('')}</tr>`).join('');
  const qs = ['What exactly is “Dark = shipped a part” (we used a deeper blue, #b3d1ef), and does the <b>peach</b> footer mean “picking list printed, not picked yet”?', 'Canceled orders: grey with the order number struck through, since red already means Late?', 'Is it fine to drop the <b>Pick to do date</b>, keeping the payment follow-up date (shown when money is owing)?', 'What makes an order <b>Late</b>? Proposed: slip printed over 24 h ago and not packed / not shipped, or past the urgent need-by date.', 'Should Staff be able to change Marketing and VIP, or only Admin?', 'Should the header turn <b>Paid</b> green from Shopify’s payment status, or only when your team records the payment?', 'Do you still need the line <b>Due date</b> and <b>Purchase status</b> columns, or is the PO status with its ETA (in Supplier · PO) enough?'];
  return `<div class="l1-doc">
    <div class="l1-dc"><h3>Order colours · the client’s legend, where each one shows</h3><table><tr><th></th><th>Colour</th><th>Hex</th><th>Where</th><th>Rule in FulfilPro</th></tr>${colours}</table>
      <div class="l1-dn"><b>Payment star</b>${star}</div>
      <div class="l1-dn"><b>Left border</b><span>Every order has a 4px left border in its header-line status, in a stronger shade so it reads at a glance when collapsed: <b style="color:#e44030">red</b> Late, <b style="color:#2f8f45">green</b> Paid, <b style="color:#2f86d6">sky</b> Shipped, <b style="color:#3474a0">dark blue</b> Shipped a part, grey New, muted grey Canceled / closed.</span></div>
      <div class="l1-dn"><b>Lights</b><span>Production: pale, then <b style="color:#1f6b2d">green</b> when the order has decoration (with the room date). Pick &amp; Pack: <b style="color:#9a5a10">orange</b> until packed, then green. Picking list / Label / Tax invoice: the <b>P</b> fills in once printed.</span></div>
      <div class="l1-dn"><b>Palette</b><span>Measured from the client’s screenshots: brand purple #5c44d8, deep purple #482ca0, lavender #8c74f4, plum #6c1498, orchid #cc7cf4, magenta #9c20e4, lime #b8e874, light blue #dcf0f8, shipped cell #3474a0, green #64c878, teal #74d8c4, orange #ec9c3c, yellow #f4d458, title grey #c0c0c0. Text-bearing blue (Label) is deepened to #3a78c2 so white text stays readable.</span></div></div>
    <div class="l1-dc"><h3>The client’s numbered controls (client-old-system-marking.png) → this design</h3><table><tr><th>#</th><th>Old system</th><th>Decision</th><th>In the Ledger</th></tr>${map}</table></div>
    <div class="l1-two"><div class="l1-dc"><h3>Kept from FulfilPro (not in the old system)</h3><ul>${kept.map((k) => `<li>${k}</li>`).join('')}</ul></div>
      <div class="l1-dc"><h3>Who gets the new controls (proposal)</h3><table class="rm"><tr><th>Control</th><th>Admin</th><th>Staff</th><th>Picker</th></tr>${roles}</table></div></div>
    <div class="l1-two"><div class="l1-dc"><h3>Data the build round needs (not in FulfilPro today)</h3><ul>${need.map((k) => `<li>${k}</li>`).join('')}</ul></div>
      <div class="l1-dc"><h3>Questions for the client</h3><ol>${qs.map((k) => `<li>${k}</li>`).join('')}</ol></div></div>
  </div>`;
}
export { X };
