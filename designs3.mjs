/* Concept A1 (the former A2): the queue-table layout re-laid to fit 1280px (sidebar collapsed, ~1200px of table) without sideways scroll.
   The original A1 is retired (build id a1-old); this file only imports its helpers. Kept internal names: renderer `conceptA3`, classes prefixed `a3-`. */
import * as P from './parts.mjs';
import * as X from './extras.mjs';
import * as D from './designs.mjs';
import { packHistOf, confsOf, stockAdjOf, shopifyUrl, restockState, STORES } from './data.mjs';
const { ic, tile, CAP, byNo, totalQty, packedQty } = P;
/** Icons of the implemented Orders page (app/(shell)/orders/modules/queue/icons.tsx): its tax-invoice receipt and order-note glyphs, same markup as ic(). */
const APP_ICON = {
  receipt: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  note: 'M7 4h10a2 2 0 012 2v14l-4-3H7a2 2 0 01-2-2V6a2 2 0 012-2zM8 8h8M8 12h5',
};
const icA = (name, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${APP_ICON[name].split(' M').map((d, i) => `<path d="${i ? 'M' + d : d}"/>`).join('')}</svg>`;

export const CSS_A3 = `
.a3-grp{position:relative;margin-top:5px;border-left:3px solid var(--stripe,#d1d5db);border-bottom:1px solid var(--bd)}
.a3-h+.a3-grp{margin-top:0}
.a3-grp .tr{height:auto;min-height:40px;padding-top:4px;padding-bottom:4px;border-bottom:0}
.thead.a3-h{position:sticky;top:0;z-index:3;border-left:3px solid transparent}
.bdg.a3-solid{background:#2563eb;border-color:#2563eb;color:#fff}
.a3-st{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0}
.a3-st>span{display:flex;gap:3px;min-width:0}
.a3-pf{display:flex;flex-direction:column;gap:1px;min-width:0}
.a3-pf .pb{gap:5px}
.bdg .a3-n{display:inline-flex;align-items:center;justify-content:center;min-width:12px;height:12px;margin-right:-3px;padding:0 3px;border-radius:999px;background:rgba(255,255,255,.75);font-size:8.5px}
.a3-lg{margin:10px 60px 0;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;display:grid;grid-template-columns:150px 1fr;gap:7px 12px;align-items:center;font-size:11.5px;color:#4b5563}
.a3-lg h3{grid-column:1/-1;font-size:13px;color:#111827}.a3-lg>b{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280}
.a3-lg>div{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.a3-it{display:flex;align-items:center;gap:6px;min-width:0}
.a3-itx{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
.a3-nm{display:block;min-width:0;font-size:11.5px;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
a.a3-nm{color:var(--pri-ink);text-decoration:none}a.a3-nm:hover{text-decoration:underline}
.a3-sub{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--tx-s);min-width:0;white-space:nowrap}
.a3-sku{font:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9.5px;color:var(--tx-m);max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px dashed var(--bd-s);background:transparent;border-radius:4px;padding:0 3px;height:14px;line-height:12px;cursor:copy}
.a3-sku:hover{background:var(--surf-m);color:var(--tx)}.a3-sku.ok{border-style:solid;border-color:var(--e200);background:var(--e50);color:var(--e700)}
.a3-dk{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.a3-dk .dcl,.a3-dk .dcb .dcr{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.a3-grp .ln .bdg{max-width:100%;overflow:hidden;text-overflow:ellipsis}
.xbar.a3-bar{flex-wrap:wrap;row-gap:3px}
.a3-btns{display:flex;flex-direction:column;gap:5px}.a3-btns .btn{width:100%;height:28px}
.a3-hist{display:flex;align-items:center;justify-content:space-between;gap:4px;border:1px solid var(--bd);border-radius:7px;background:var(--surf-m);padding:3px 2px 3px 7px;font-size:10.5px;color:var(--tx-b)}
.a3-hist>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;
export const A3_JS = `<script>window.a3copy=window.a3copy||function(b){try{navigator.clipboard&&navigator.clipboard.writeText(b.dataset.copy)}catch(e){}var t=b.textContent;b.classList.add('ok');b.textContent='Copied';setTimeout(function(){b.classList.remove('ok');b.textContent=t},1200)};</script>`;

const STRIPE = { 'tone-red': '#ef4444', 'tone-gray': '#9ca3af', 'tone-amber': '#f59e0b', 'tone-blue': '#3b82f6', 'tone-green': '#22c55e', 'tone-restock': '#fbbf24', 'tone-emb': '#8b5cf6', 'tone-prt': '#0ea5e9' };

/* ---------------- main table ---------------- */
const actsW = (cap) => (4 + (cap.slip ? 1 : 0) + (cap.labels ? 1 : 0) + (cap.invoice ? 1 : 0) + (cap.track ? 1 : 0)) * 24 + 4;
const colsA3 = (cap) => `20px 96px 50px minmax(100px,1fr) ${cap.stockAdj ? '56px ' : ''}112px ${P.trackW(cap)}px ${cap.ful ? '112px' : '64px'} ${cap.packDate ? '116px' : '200px'} ${actsW(cap)}px`;

const stockAdjCell = (r) => {
  const a = stockAdjOf(r);
  return `<span class="cell" style="justify-content:center">${a ? `<span class="bdg ${a.status === 'managed' ? 'ok' : a.status === 'partial' ? 'warn' : 'bad'}" title="Stock adjustment: ${a.managed} of ${a.total} lines managed">${a.managed}/${a.total}</span>` : '<span class="muted">-</span>'}</span>`;
};
/** One column for packing and fulfilment (Admin, Staff): packed count + bar, then the first parcel's date and carrier · tracking. */
const packFulCell = (r) => {
  const f = confsOf(r)[0], n = confsOf(r).length;
  const line = f ? `<span class="ell strong" style="font-size:10.5px">${f.date.split(' · ')[0]}${n > 1 ? ` <span class="muted">+${n - 1}</span>` : ''}</span><span class="ell muted" style="font-size:10px">${f.carrier} · <span style="color:var(--pri)">${f.no}</span></span>` : '';
  return `<span class="a3-pf">${P.packBar(r).replace('class="pbar"', 'class="pbar" style="width:24px"')}${line}</span>`;
};
/** Every badge the Status column can show (also drawn in the legend under the artboards). Order of appearance = order of the list. */
const B = {
  canceled: '<span class="bdg bad" title="Order canceled">Canceled</span>',
  closed: '<span class="bdg" title="Order closed in Shopify">Closed</span>',
  fulfilled: '<span class="bdg a3-solid" title="Fully fulfilled">Fulfilled</span>',
  partialFul: '<span class="bdg warn" title="Some lines fulfilled">Partially Fulfilled</span>',
  unfulfilled: '<span class="bdg" style="background:#fff;border-color:var(--bd-s)" title="Nothing fulfilled yet">Unfulfilled</span>',
  request: `<span class="bdg warn" title="Fulfilment edit request awaiting approval">${ic('userLock', 'i10')}Request</span>`,
  packed: '<span class="bdg ok" title="Every line packed">Packed</span>',
  partialPacked: '<span class="bdg warn" title="Some lines packed">Partial Packed</span>',
  slip: `<span class="bdg ok" title="Picking slip printed">${ic('printer', 'i10')}Slip printed</span>`,
  label: `<span class="bdg ok" title="Shipping label printed">${ic('tag', 'i10')}Label</span>`,
  inTransit: '<span class="bdg info" title="17track: in transit">In transit</span>',
  outForDelivery: '<span class="bdg info" title="17track: out for delivery">Out for delivery</span>',
  delivered: '<span class="bdg ok" title="17track: delivered">Delivered</span>',
  needRestock: '<span class="bdg warn" title="Back-in-stock request">Need restock</span>',
  partRestock: '<span class="bdg warn" title="Back-in-stock request">Partly restocked</span>',
  restocked: '<span class="bdg ok" title="Back-in-stock request">Restocked</span>',
  emb: '<span class="bdg emb" title="Embroidery lines done / total">0/2 EMB<i class="a3-n" title="Decorators assigned">1</i></span>',
  prt: '<span class="bdg prt" title="Print lines done / total">1/2 PRT<i class="a3-n" title="Decorators assigned">2</i></span>',
};
/** Embroidery / print progress (lines done / total) plus how many different decorators are assigned, as the old Status column. */
const decoBadges = (r, cap) => (!cap.deco ? [] : ['EMB', 'PRT'].map((k) => {
  const lines = r.items.filter((x) => x.deco === k);
  if (!lines.length) return '';
  const done = lines.filter((x) => x.work && x.work.state === 'done').length, who = new Set(lines.filter((x) => x.work && x.work.who).map((x) => x.work.who)).size;
  return `<span class="bdg ${k === 'EMB' ? 'emb' : 'prt'}" title="${done} of ${lines.length} ${k === 'EMB' ? 'embroidery' : 'print'} lines done${who ? ` · ${who} decorator${who > 1 ? 's' : ''}` : ''}">${done}/${lines.length} ${k}${who ? `<i class="a3-n" title="Decorators assigned">${who}</i>` : ''}</span>`;
}).filter(Boolean));
/** Status column (was Decoration): the old Orders page's badges plus slip, tracking and decoration state, flowing inside 116px.
 *  Fulfilment chip first on its own line; "Short N" stays out (Avail / PO status on the lines say it). */
function statusCell(r, cap) {
  if (cap.packDate) return `<span class="cell"><span class="muted tn" style="font-size:10.5px">${packedQty(r) > 0 ? packHistOf(r)[0].at : '-'}</span></span>`;
  const fulfil = r.canceled ? B.canceled : r.closed ? B.closed : r.ful === 'full' ? B.fulfilled : r.ful === 'partial' ? B.partialFul : B.unfulfilled;
  const pq = packedQty(r), tq = totalQty(r), t = cap.ful && r.trk ? r.trk.st : '';
  const rs = r.ful !== 'full' && cap.reqStock ? restockState(r) : null;
  const chips = [
    r.req && B.request,
    pq >= tq ? B.packed : pq > 0 ? B.partialPacked : '',
    (cap.slip || cap.slipStatus) && r.slip != null && B.slip,
    cap.labels && r.label && B.label,
    t === 'Delivered' ? B.delivered : t === 'Out for delivery' ? B.outForDelivery : t ? B.inTransit : '',
    rs === 'back' ? B.restocked : rs === 'partial' ? B.partRestock : rs ? B.needRestock : '',
    ...decoBadges(r, cap),
  ].filter(Boolean);
  const all = [fulfil, ...chips]; // two badges per line, side by side
  return `<span class="a3-st">${Array.from({ length: Math.ceil(all.length / 2) }, (_, i) => `<span>${all.slice(i * 2, i * 2 + 2).join('')}</span>`).join('')}</span>`;
}
/** Legend of every Status badge, shown under the A1 artboard in index.html. */
export function statusLegend() {
  const g = (t, ...k) => `<b>${t}</b><div>${k.map((x) => B[x]).join('')}</div>`;
  return `<div class="a3-lg"><h3>Status column · every badge it can show</h3>
    ${g('Fulfilment (one)', 'unfulfilled', 'partialFul', 'fulfilled', 'closed', 'canceled')}
    ${g('Edit request', 'request')}${g('Packing', 'partialPacked', 'packed')}${g('Documents', 'slip', 'label')}
    ${g('Delivery (17track)', 'inTransit', 'outForDelivery', 'delivered')}${g('Back in stock', 'needRestock', 'partRestock', 'restocked')}
    ${g('Decoration', 'emb', 'prt')}
    <b>Who sees what</b><div>Slip printed: Admin, Staff (read-only). Label, delivery, restock, decoration: Admin and Staff. Packed date replaces Status for Order Picker. Shipped (Shopify status) uses the same blue chip as Fulfilled.</div></div>`;
}
const noteBtn = (r) => `<button class="ib" title="Order notes">${icA('note')}${r.notes ? `<i class="ct">${r.notes}</i>` : ''}</button>`;
function rowActs(r, cap, open) {
  const a = [];
  if (cap.slip) a.push(P.slipBtn(r));
  if (cap.labels) a.push(P.labelBtn(r));
  if (cap.invoice) a.push(`<button class="ib" title="Print tax invoice">${icA('receipt')}</button>`);
  a.push(noteBtn(r), P.msgBtn(r));
  if (cap.track) a.push(X.trackingIcon(r, cap, true));
  a.push(`<button class="ib" title="Refresh order from Shopify">${ic('refresh', 'i')}</button>`);
  a.push(`<button class="ib" title="${open ? 'Collapse' : 'View details'}">${ic(open ? 'chevUp' : 'chevronDown', 'i')}</button>`);
  return a.join('');
}
function rowA3(r, role, { open, checked }) {
  const cap = CAP[role];
  return `<div class="tr${open ? ' open' : ''}${checked ? ' sel' : ''}${r.canceled ? ' cx' : ''} ${P.rowTone(r, role)}" style="--cols:${colsA3(cap)}">
    <span class="ck${checked ? ' on' : ''}"></span>
    <span class="cell col"><span class="cell"><span class="ono${X.lbl(r, cap)}">#${r.no}</span></span><span class="muted ell" style="font-size:10px">${r.placed}</span></span>
    <span class="cell">${P.storeChip(r.store)}</span>
    <span class="cell"><b class="ell strong" style="font-size:11.5px">${r.customer}</b></span>
    ${cap.stockAdj ? stockAdjCell(r) : ''}
    <span class="cell" style="gap:5px">${P.thumbs(r, 3)}<span class="muted tn" style="font-size:10.5px;white-space:nowrap">${totalQty(r)} pcs</span></span>
    ${P.track(r, cap)}
    ${cap.ful ? packFulCell(r) : P.packBar(r).replace('class="pbar"', 'class="pbar" style="width:24px"')}
    ${statusCell(r, cap)}
    <span class="acts">${rowActs(r, cap, open)}</span>
  </div>`;
}

/* ---------------- expanded order ---------------- */
const lineCols = (cap, showWork) => {
  const c = [['item', 'minmax(200px,1fr)'], ['qty', cap.ful ? '54px' : '22px'], ['packed', '38px']];
  if (cap.packDate) c.push(['pdate', '96px']);
  if (cap.stock) c.push(['avail', '28px'], ['po', '108px']);
  if (cap.deco) c.push(['decorator', '132px']);
  if (cap.pack || cap.ful) c.push(['full', '42px'], ['part', '66px']);
  if (cap.lineEdit) c.push(['act', '46px']);
  return c;
};
function itemCell(r, x, cap) {
  const url = cap.shopify ? shopifyUrl(r, x) : '';
  const name = url ? `<a class="a3-nm" href="${url}" title="Open in Shopify admin · ${STORES[r.store].domain}/admin/products/${x.productId}">${x.name}</a>` : `<b class="a3-nm" title="${x.name}">${x.name}</b>`;
  const sku = x.sku ? `<button class="a3-sku" title="${x.sku} · click to copy" data-copy="${x.sku}" onclick="event.stopPropagation();a3copy(this)">${x.sku}</button>` : '';
  const chips = [X.nameChip(x, cap), cap.reqStock ? X.restockLine(x) : ''].filter(Boolean).join('');
  const deco = x.deco || cap.deco === 2 ? X.lineDeco(x, cap, { both: true }) : '';
  return `<span class="a3-it">${tile(x.kind, x.hex, 26)}<span class="a3-itx">${name}<span class="a3-sub">${P.swatch(x)}<span>· ${x.size}</span>${sku}</span>${chips ? `<span class="cell" style="gap:4px;margin-top:1px">${chips}</span>` : ''}</span>${deco ? `<span class="a3-dk">${deco}</span>` : ''}</span>`;
}
function linesA3(r, cap) {
  const cols = lineCols(cap, r.items.some((x) => x.deco || x.work)), css = cols.map((c) => c[1]).join(' '), lgap = cap.stock ? 4 : 8;
  const N = { item: 'Item', qty: cap.ful ? 'Fulfilled' : 'Qty', packed: 'Packed', pdate: 'Packed Date', avail: 'Avail', po: 'PO status', decorator: 'Decorator', full: 'Full', part: 'Partial', act: 'Actions' };
  const sel = 1, fullN = r.items.filter((x, i) => x.packed >= x.qty || (sel && i === 0)).length;
  const fullAll = r.items.length > 0 && fullN === r.items.length, fullMix = fullN > 0 && !fullAll;
  const head = cols.map(([k]) => k === 'full'
    ? `<span style="display:flex;align-items:center;justify-content:center;gap:3px">${N[k]}<span class="ck${fullAll ? ' on' : fullMix ? ' mix' : ''}" title="Mark every line Full"></span></span>`
    : `<span style="${['qty', 'packed', 'avail', 'act'].includes(k) ? 'text-align:center' : ''}">${N[k]}</span>`).join('');
  const rows = r.items.map((x, idx) => {
    const done = x.packed >= x.qty, part = x.packed > 0 && !done, fullOn = done || (sel && idx === 0);
    const fulQty = r.ful === 'full' || (r.ful === 'partial' && idx < r.items.length - 1) ? x.qty : 0;
    const picked = cap.ful && fulQty < x.qty && fullOn;
    const cell = {
      item: itemCell(r, x, cap),
      qty: cap.ful ? `<b class="tn" style="text-align:center" title="${fulQty} of ${x.qty} fulfilled">${fulQty}/${x.qty}</b>` : `<b class="tn" style="text-align:center">${x.qty}</b>`,
      packed: `<span class="pb" style="justify-content:center"><b class="tn" style="color:${done ? 'var(--e700)' : part ? 'var(--a800)' : 'var(--tx-s)'}">${x.packed}/${x.qty}</b></span>`,
      pdate: `<span class="muted tn" style="font-size:10.5px">${x.packed > 0 ? packHistOf(r)[0].at : '-'}</span>`,
      avail: `<span style="display:flex;justify-content:center">${cap.stock ? P.availCell(r, x) : ''}</span>`,
      po: cap.stock ? P.poCell(r, x, cap) : '',
      decorator: X.lineDecorator(x, cap),
      full: `<span style="display:flex;justify-content:center"><span class="ck${fullOn ? ' on' : ''}"></span></span>`,
      part: `<span class="step${fullOn ? ' dis' : ''}" style="justify-self:end"><button>−</button><span>${fullOn ? x.qty : idx === 1 && sel ? 2 : 0}</span><button>+</button></span>`,
      act: X.lineActions(r, x, r.ful === 'full' ? 'full' : r.ful === 'partial' && idx < r.items.length - 1 ? 'part' : '', cap),
    };
    return `<div class="ln${picked ? ' pick' : done ? ' done' : part ? ' part' : ''}" style="--lcols:${css};--lh:38px;--lgap:${lgap}px">${cols.map(([k]) => cell[k] || '<span></span>').join('')}</div>`;
  });
  return `<div class="lnh" style="--lcols:${css};--lgap:${lgap}px">${head}</div>${rows.join('')}`;
}
/** Order items action bar: A1's extras bar (X.extrasBar) plus Confirm fulfilment and [printer] & Confirm at its right end, so there is no Fulfilment section. */
function extrasBarA3(r, cap) {
  const chips = [X.labelChip(r, cap), X.restockChip(r, cap), X.decoProg(r, cap), X.closedBadge(r)].filter(Boolean).join('');
  const nNames = r.items.filter((x) => x.nameAttr).length, nRestock = r.items.filter((x) => x.restock).length, nConf = confsOf(r).length;
  const locked = r.canceled || r.closed, done = r.ful === 'full', off = locked || done;
  const fulBtn = cap.ful ? (nConf
    ? `<button class="btn xs ghost fulb" data-fh title="Fulfilment history: confirmations, barcodes and shipped lines">Fulfilments${nConf > 1 ? ` (${nConf})` : ''}${ic('chevronRight', 'i10')}</button>`
    : `<button class="btn xs ghost fulb" disabled title="No fulfilments yet">Fulfilments${ic('chevronRight', 'i10')}</button>`) : '';
  const tip = locked ? 'Closed or canceled orders cannot be fulfilled' : 'Already fully fulfilled';
  const confirm = cap.ful ? `<button class="btn xs ${off ? 'off' : 'pri'}"${off ? ` disabled title="${tip}"` : ''}>${locked ? 'Fulfilment locked' : 'Confirm fulfilment'}</button><button class="btn xs ${off ? 'off' : 'ghost'}"${off ? ' disabled' : ''} title="${off ? tip : 'Confirm fulfilment and print the shipping label'}">${ic('printer', 'i10')}&amp; Confirm</button>` : '';
  const acts = [
    cap.reqStock && !r.canceled ? `<button class="btn xs ghost" title="Ask for a supplier restock of lines that are out of stock">${ic('cube', 'i10')}Request stock${nRestock ? `<i class="cnt">${nRestock}</i>` : ''}</button>` : '',
    fulBtn,
    cap.stockAdj ? `<button class="btn xs ghost" title="Manage stock adjustment">${ic('adjust', 'i10')}Stock ${stockAdjOf(r) ? `${stockAdjOf(r).managed}/${stockAdjOf(r).total}` : '-'}</button>` : '',
    cap.names && nNames ? `<button class="btn xs ghost" title="Export name attributes as CSV or print">${ic('download', 'i10')}Export names (${nNames})${ic('chevronDown', 'i10')}</button>` : '',
    cap.lineEdit && !r.canceled && !r.closed ? `<button class="btn xs ghost">${ic('plus', 'i10')}Add line</button>` : '',
    X.trackingIcon(r, cap),
    confirm,
  ].filter(Boolean).join('');
  if (!chips && !acts) return '';
  return `<div class="xbar a3-bar">${chips}<span class="sp"></span>${acts}</div>`;
}
function packBoxA3(r, cap) {
  if (!cap.pack) return '';
  const all = packedQty(r) >= totalQty(r);
  const hist = packHistOf(r);
  const list = hist.length === 0 ? `<div class="hist muted">No packing history.</div>` : `<div style="display:flex;flex-direction:column;gap:4px;max-height:68px;overflow-y:auto">${hist.map((e) => `<div class="a3-hist"><span><b>Packed ${e.at}</b><br><span class="muted">${e.n} item${e.n === 1 ? '' : 's'}</span></span><button class="ib" title="Cancel confirmation (sends notification)" style="width:22px;height:22px">${ic('trash', 'i')}</button></div>`).join('')}</div>`;
  return `<div class="a3-btns">${all ? `<button class="btn off">${ic('check', 'i')}All ${totalQty(r)} items packed</button>` : `<button class="btn pri">${ic('check', 'i')}Confirm packed</button>`}</div>${list}`;
}
function expandedA3(r, role) {
  const cap = CAP[role], note = X.customerNote(r, cap);
  const items = `<div class="bx">${P.secHead('package', 'Order items', `<span class="muted tn">${totalQty(r)} pcs · ${packedQty(r)} packed</span>`)}${extrasBarA3(r, cap)}${linesA3(r, cap)}${X.fulHistory(r, cap)}</div>`;
  const noteBox = note ? `<div class="bx"><div class="in">${note}</div></div>` : '';
  const pack = cap.pack ? `<div class="bx">${P.secHead('check', 'Packing & slip')}<div class="in">${packBoxA3(r, cap)}</div></div>` : '';
  const ship = P.shipBox(r, cap); // already a titled card (Shipping)
  const cust = cap.cust ? `<div class="bx">${P.secHead('mapPin', 'Customer')}<div class="in">${P.custBox(r, cap, { method: false })}</div></div>` : '';
  const cols = [`<div class="col2" style="flex:1 1 0">${items}${noteBox}</div>`];
  if (pack + ship) cols.push(`<div class="col2" style="width:176px;flex:none">${pack}${ship}</div>`);
  if (cust) cols.push(`<div class="col2" style="width:224px;flex:none">${cust}</div>`);
  return `<div class="xp v2">${cols.join('')}</div>`;
}

/* ---------------- page ---------------- */
const OPEN_MORE = { admin: ['2188'], staff: ['0718'], picker: ['4821'] };
export function conceptA3(role) {
  P.setRole(role);
  const cap = CAP[role], rows = D.rowsFor(role), focus = D.FOCUS[role], chk = D.CHECKED[role];
  const take = role === 'picker' ? 6 : 7, idx = rows.findIndex((r) => r.no === focus);
  const start = role === 'admin' ? 3 : Math.max(0, idx - 3), lead = role === 'admin' ? [byNo('2188')] : [];
  const win = role === 'staff' ? [focus, ...OPEN_MORE[role]].map(byNo) : [...lead, ...rows.slice(start).filter((r) => !lead.includes(r))].slice(0, take);
  const isOpen = (r) => r.no === focus || (OPEN_MORE[role] ?? []).includes(r.no);
  const body = win.map((r) => {
    const tone = P.rowTone(r, role);
    return `<div class="a3-grp" style="--stripe:${STRIPE[tone] ?? '#d1d5db'}">${rowA3(r, role, { open: isOpen(r), checked: chk.includes(r.no) })}${X.underRow(r, cap, tone)}${isOpen(r) ? expandedA3(r, role) : ''}</div>`;
  }).join('');
  const content = `
    ${P.approvals(role)}
    ${P.toolbar(role, { refreshWarn: role === 'admin' })}
    <div class="qrow">${P.queueTabs(role, 'all')}<div class="r"><span class="muted" style="font-size:10.5px">Sort</span><button class="fchip" title="Sort by"><b>Date placed</b><span style="display:inline-flex;color:var(--pri)">${ic('chevronDown', 'i12')}</span></button>${cap.labels ? `<button class="btn ghost">${ic('plus', 'i')}New invoice</button>` : ''}<button class="btn ghost">${ic('expand', 'i')}Expand all</button></div></div>
    <div class="card" style="flex:1">
      <div class="tbody"><div class="tscroll thin"><div class="thead a3-h" style="--cols:${colsA3(cap)}"><span class="ck mix"></span><span>${P.sortHead('Order')}</span><span>Store</span><span>${P.sortHead('Customer')}</span>${cap.stockAdj ? '<span style="text-align:center" title="Stock adjustment">Stock adj.</span>' : ''}<span>Items</span>${P.trackHead(cap)}<span>${cap.ful ? 'Packed · Fulfilment' : 'Packed'}</span><span>${cap.packDate ? 'Packed date' : 'Status'}</span><span style="text-align:right">Actions</span></div>${body}</div>${P.bulkBar(role, 3, false, chk.reduce((a, n) => a + byNo(n).items.filter((x) => x.nameAttr).length, 0))}</div>
      ${P.pager(rows.length)}
    </div>`;
  return D.shell(role, content, { sub: 'Queue' }) + A3_JS;
}
