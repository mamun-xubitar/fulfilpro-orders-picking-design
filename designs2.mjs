import { shell, rowsFor, CHECKED } from './designs.mjs';
import * as P from './parts.mjs';
import * as X from './extras.mjs';
import { ORDERS, byNo, totalQty, packedQty, productRows, need, shopifyUrl, STORES, PO_LABEL } from './data.mjs';
import { QUEUES, countOf } from './data.mjs';
const { ic, tile, CAP } = P;

export const CSS_D = `
.ob{background:var(--surf);border:1px solid var(--bd);border-radius:10px;box-shadow:var(--shadow);flex:none;overflow:hidden}
.oh{display:flex;align-items:center;gap:10px;height:34px;padding:0 8px 0 10px;background:var(--surf-m);border-bottom:1px solid var(--bd)}
.oh .sp{flex:1}
.oh .nm{display:flex;flex-direction:column;line-height:1.15;min-width:0}
.ols{padding:0 10px}
.sheet-body{flex:1;min-height:0;overflow:hidden;padding:8px;display:flex;flex-direction:column;gap:8px;position:relative}
.seg2{display:inline-flex;background:var(--div);border:1px solid var(--bd);border-radius:9px;padding:2px;gap:2px;flex:none}
.seg2 button{height:24px;padding:0 12px;border-radius:7px;font-size:11.5px;font-weight:700;color:var(--tx-m);display:flex;align-items:center;gap:5px}
.seg2 button.on{background:var(--surf);color:var(--tx);box-shadow:var(--shadow)}
.view{flex-direction:column;gap:6px;flex:1;min-height:0}
.selbar{display:flex;align-items:center;gap:8px;height:30px;padding:0 8px;flex:none;font-size:11px;color:var(--tx-b)}
.selbar .pill{background:var(--pri-soft);border:1px solid var(--pri-ring);color:var(--pri-ink);font-weight:700;border-radius:999px;padding:1px 8px}
.selbar .sp{flex:1}
`;

const ACTS = (r, cap) => {
  const a = [];
  if (cap.slip) a.push(P.slipBtn(r));
  if (cap.labels) a.push(P.labelBtn(r));
  a.push(`<button class="ib" title="Refresh order from Shopify">${ic('refresh', 'i')}</button>`);
  return a.join('');
};

/* the one primary action an order is ready for, per role: no hunting for it inside the row */
function nextAction(r, cap) {
  if (r.canceled || r.ful === 'full') return '';
  const done = packedQty(r) >= totalQty(r);
  if (!done && cap.pack) return `<button class="btn xs pri">${ic('check', 'i10')}Confirm packed</button>`;
  if (done && cap.ful) return `<button class="btn xs pri">Confirm fulfilment</button>`;
  return '';
}

/* ======================================================================================== */
/* D · Order sheet: every order is a card, its product lines always visible                  */
/* ======================================================================================== */
/* detail strip of the one open card: everything the old expanded row held, in the same card */
function detailD(r, role) {
  const cap = CAP[role], bx = (icn, t, body) => `<div class="bx" style="flex:1 1 0;min-width:0">${P.secHead(icn, t)}<div class="in">${body}</div></div>`;
  const b = [];
  if (cap.pack) b.push(bx('check', 'Packing & slip', P.packBox(r, cap, { big: role === 'picker' })));
  if (cap.ful) b.push(bx('truck', 'Fulfilment', P.fulBox(r, cap)));
  if (cap.cust) b.push(bx('mapPin', 'Customer & shipping', P.custBox(r, cap)));
  if (role === 'picker') b.push(bx('mapPin', 'Pick route by bin', P.pickRoute(r)));
  b.push(`<div class="bx" style="flex:1.1 1 0;min-width:0">${P.secHead('chat', 'Notes & messages', `<span class="muted">${(r.notes || 0) + (r.msgs || 0)}</span>`)}${P.thread(r, cap)}</div>`);
  return `<div class="xp" style="border-top:1px solid var(--pri-ring)">${b.join('')}</div>`;
}
function blockD(r, role, checked, open = false) {
  const cap = CAP[role], per = role === 'picker';
  return `<div class="ob" ${open ? 'style="border-color:var(--pri)"' : ''}>
    <div class="oh"><span class="ck${checked ? ' on' : ''}"></span>
      <span class="cell"><b class="ono${X.lbl(r, cap)}" style="font-size:12.5px">#${r.no}</b>${P.storeChip(r.store)}${X.miniChips(r, cap)}${P.shortBadge(r, cap)}${r.canceled ? '<span class="bdg">Canceled</span>' : ''}</span>
      <span class="nm"><b class="strong" style="font-size:11.5px">${r.customer}</b><span class="muted" style="font-size:10px">${r.placed}</span></span>
      <span class="sp"></span>
      ${P.track(r, cap)}${P.packBar(r)}${P.flags(r, cap)}
      <span class="cell">${nextAction(r, cap)}</span>
      <span class="acts">${ACTS(r, cap)}</span></div>
    <div class="ols">${P.lines(r, cap, { rowH: per ? 42 : 34, sel: 0, skuSub: true })}</div>${EXTRAS_D.has(r.no) ? X.extrasBar(r, cap) + X.attachmentsStrip(r, cap) : ''}${open ? detailD(r, role) : ''}</div>`;
}
const EXTRAS_D = new Set(['4809', '1184']);
export function conceptD(role) {
  P.setRole(role);
  const cap = CAP[role];
  const ids = role === 'picker' ? ['4821', '2204', '4809'] : ['4821', '4809', '1184'], open = role === 'picker' ? '2204' : '4809';
  const content = `
    ${P.approvals(role)}
    ${P.toolbar(role, { refreshWarn: role === 'admin' })}
    <div class="qrow">${P.queueTabs(role, 'all')}<div class="r"><span class="muted" style="font-size:10.5px">Sort</span>${P.chip('', 'Newest first', 0)}${cap.labels ? `<button class="btn ghost">${ic('plus', 'i')}New invoice</button>` : ''}</div></div>
    <div class="card" style="flex:1"><div class="sheet-body">${ids.map((n) => blockD(byNo(n), role, CHECKED[role].includes(n), n === open)).join('')}${P.bulkBar(role, 3)}</div>${P.pager(rowsFor(role).length, true)}</div>`;
  return shell(role, content, { sub: 'Order sheet' });
}

/* ======================================================================================== */
/* E · Today's Orders table, refreshed                                                       */
/* ======================================================================================== */
const colsE = (cap) => (cap.ful
  ? `18px 28px 62px 108px minmax(120px,1fr) 112px ${Math.max(168, P.trackW(cap) + 24)}px 56px 140px 44px 108px`
  : `18px 62px 108px minmax(120px,1fr) 112px ${Math.max(132, P.trackW(cap) + 24)}px 92px 96px 44px 108px`);
const hdrE = (cap) => (cap.ful
  ? ['<span class="ck mix"></span>', '#', P.sortHead('Order'), 'Store', P.sortHead('Customer'), P.sortHead('Ordered at'), 'Status', 'Items', 'Fulfilment', 'Note', '<span style="text-align:right">Actions</span>']
  : ['<span class="ck mix"></span>', P.sortHead('Order'), 'Store', P.sortHead('Customer'), P.sortHead('Ordered at'), 'Status', 'Packed qty', 'Packed date', 'Note', '<span style="text-align:right">Actions</span>']);
function ffCell(r) {
  if (!r.trk) return '<span class="muted">—</span>';
  return `<span class="cell col"><span style="font-size:10.5px">Mon 26 Oct</span><span class="muted" style="font-size:10px">${r.trk.carrier} · <span class="mono">${r.trk.no.slice(0, 8)}…</span></span></span>`;
}
function rowE(r, role, { open = false, checked = false, idx = 0 }) {
  const cap = CAP[role], cx = r.canceled;
  const status = `<span class="cell col" style="gap:3px;align-items:flex-start">${P.track(r, cap)}<span class="cell" style="gap:3px">${P.shortBadge(r, cap)}${X.miniChips(r, cap)}${cx ? '<span class="bdg">Canceled</span>' : ''}${X.decoProg(r, cap)}</span></span>`;
  const note = P.flags(r, cap);
  const cells = cap.ful
    ? [`<span class="ck${checked ? ' on' : ''}"></span>`, `<span class="muted tn">${idx + 1}</span>`, `<b class="ono${X.lbl(r, cap)}">#${r.no}</b>`, P.storeChip(r.store), `<b class="ell strong" style="font-weight:600">${r.customer}</b>`, `<span class="muted" style="font-size:10.5px">${r.placed}</span>`, status, `<span class="tn" style="color:var(--pri-ink);font-weight:600">${r.items.length} item${r.items.length > 1 ? 's' : ''}</span>`, ffCell(r), note, `<span class="acts">${ACTS(r, cap)}<button class="ib">${ic(open ? 'chevUp' : 'chevronDown', 'i')}</button></span>`]
    : [`<span class="ck${checked ? ' on' : ''}"></span>`, `<b class="ono${X.lbl(r, cap)}">#${r.no}</b>`, P.storeChip(r.store), `<b class="ell strong" style="font-weight:600">${r.customer}</b>`, `<span class="muted" style="font-size:10.5px">${r.placed}</span>`, status, P.packBar(r), `<span class="muted" style="font-size:10.5px">${packedQty(r) ? 'Wed 14:02' : '—'}</span>`, note, `<span class="acts">${ACTS(r, cap)}<button class="ib">${ic(open ? 'chevUp' : 'chevronDown', 'i')}</button></span>`];
  return `<div class="tr${open ? ' open' : ''}${checked ? ' sel' : ''}${cx ? ' cx' : ''}" style="--cols:${colsE(cap)};--rh:42px">${cells.map((c) => `<span class="cell">${c}</span>`).join('')}</div>`;
}
function expandedE(r, role) {
  const cap = CAP[role], b = [];
  if (cap.cust) b.push(`<div class="bx" style="width:232px;flex:none">${P.secHead('mapPin', 'Customer & order')}<div class="in">${P.custBox(r, cap)}</div></div>`);
  b.push(`<div class="bx" style="flex:1 1 0;min-width:0">${P.secHead('package', cap.ful ? 'Product fulfilment' : 'Order items', `<span class="muted tn">${totalQty(r)} pcs · ${packedQty(r)} packed</span>`)}${X.extrasBar(r, cap)}${P.lines(r, cap, { rowH: role === 'picker' ? 42 : 34, skuSub: false })}${X.attachmentsStrip(r, cap)}<div class="hr"></div>${P.secHead('chat', 'Notes & messages', `<span class="muted">${(r.notes || 0) + (r.msgs || 0)}</span>`)}${P.thread(r, cap)}</div>`);
  const act = [];
  if (cap.pack) act.push(`<div class="in">${P.packBox(r, cap, { big: role === 'picker' })}</div>`);
  if (cap.ful) act.push(`<div class="in">${P.fulBox(r, cap)}</div>`);
  b.push(`<div class="bx" style="width:${role === 'picker' ? 272 : 232}px;flex:none">${P.secHead('check', 'Actions')}${act.join('<div class="hr"></div>')}</div>`);
  return `<div class="xp">${b.join('')}</div>`;
}
function toolbarE(role) {
  const c = CAP[role];
  return `<div class="row-tb">${P.searchBox(role)}
    ${c.store ? P.chip('Store', 'All', 0) : ''}${c.period ? P.chip('Period', 'All time', 0) : ''}
    ${c.ffilter ? P.chip('Fulfilment', 'All', 0) : ''}
    ${role === 'picker' ? P.chip('Packed', 'Not packed + Partial', 1) : P.chip('Packing', 'All', 0)}
    ${c.slip ? P.chip('Slip', 'Any', 0) : ''}
    <button class="btn ghost" style="color:var(--pri-ink)">Clear</button><span class="sp"></span>
    ${c.sync ? `<span class="muted" style="font-size:10px;white-space:nowrap">Synced 14:12</span><span class="split"><button class="btn ghost">${ic('refresh', 'i')}Sync</button><button class="btn ghost sd">${ic('chevronDown', 'i12')}</button></span>` : ''}
    <button class="btn ghost">${ic('refresh', 'i')}Refresh</button></div>`;
}
function selbarE(role, n = 3) {
  const c = CAP[role];
  return `<div class="selbar"><span class="ckl"><span class="ck"></span>Select all on this page</span>${c.names ? `<span class="ckl"><span class="ck"></span>Select all name attributes matching filters</span>` : ''}<span class="pill">${n} selected</span>
    ${c.labels ? `<button class="btn sm ghost">${ic('printer', 'i')}Print labels (${n})</button>` : ''}${c.slip ? `<button class="btn sm ghost">${ic('printer', 'i')}Print picking slips (${n})</button>` : ''}
    <button class="btn sm ghost" style="border-color:transparent">Clear</button><span class="sp"></span>
    ${c.labels ? `<button class="btn sm ghost">${ic('plus', 'i')}New invoice</button>` : ''}${c.names ? `<button class="btn sm ghost">${ic('download', 'i')}Export attributes (2)${ic('chevronDown', 'i10')}</button>` : ''}<button class="btn sm ghost">${ic('expand', 'i')}Expand all</button></div>`;
}
export function tableE(role, { take = 7 } = {}) {
  const cap = CAP[role], rows = rowsFor(role), focus = role === 'picker' ? '2204' : role === 'admin' ? '4809' : '1184';
  const idx = rows.findIndex((r) => r.no === focus), start = role === 'admin' ? 0 : Math.max(0, idx - 2), win = rows.slice(start, start + take);
  const body = win.map((r, i) => rowE(r, role, { open: r.no === focus, checked: CHECKED[role].includes(r.no), idx: start + i }) + (r.no === focus ? expandedE(r, role) : '')).join('');
  return `<div class="card" style="flex:1">
    <div class="thead" style="--cols:${colsE(cap)}">${hdrE(cap).map((h) => `<span>${h}</span>`).join('')}</div>
    <div class="tbody">${body}</div>${P.pager(rows.length, true)}</div>`;
}
export function conceptE(role) {
  P.setRole(role);
  return shell(role, `${P.approvals(role)}${toolbarE(role)}${selbarE(role)}${tableE(role, { take: role === 'picker' ? 6 : role === 'staff' ? 8 : 5 })}`, { sub: 'Orders' });
}

/* ======================================================================================== */
/* F · Orders table with an Orders / Products toggle                                         */
/* ======================================================================================== */
const colsF = (cap) => (cap.stock ? '18px minmax(190px,1.3fr) 118px 78px 56px 56px 50px 150px 88px' : '18px minmax(190px,1.3fr) 56px 118px 78px 62px 62px');
function prodTabs(role) {
  const rows = productRows(), n = (f) => rows.filter(f).length;
  const tabs = cap => cap;
  const T = role === 'picker' ? [['All', rows.length, 1], ['Slip printed', n((x) => x.orders.some((o) => o.slipped))]] : [['All', rows.length, 1], ['Short', n((x) => x.short)], ['On order', n((x) => x.po && x.po.status !== 'RECEIVED')], ['No PO', n((x) => x.short && !x.po)], ['Covered', n((x) => !x.short)]];
  return `<div class="qtabs">${T.map(([t, c, on]) => `<button class="qt${t === 'Short' ? ' hot' : ''}${on ? ' on' : ''}">${t}<span class="qn">${c}</span></button>`).join('')}</div>`;
}
function storeLinks(x) {
  const multi = x.stores.length > 1;
  return `<span class="cell" style="gap:3px">${x.stores.map(P.storeChip).join('')}</span>`;
}
function prodRow(x, role, { open = false, checked = false }) {
  const cap = CAP[role], toPick = x.qty - x.packed;
  const link = cap.shopify ? `<span class="shl" title="Open in Shopify admin (${x.stores.length > 1 ? 'choose store' : STORES[x.stores[0]].domain})" style="width:auto;padding:0 3px;gap:2px">${ic('external', 'i10')}${x.stores.length > 1 ? `<span style="font-size:9px;font-weight:700">${x.stores.length}</span>` : ''}</span>` : '';
  const prod = `<span class="cell">${tile(x.kind, x.hex, 26)}<span class="cell col" style="min-width:0"><span class="cell" style="gap:4px"><b class="strong ell" style="font-size:11.5px">${x.name}</b>${link}${cap.reqStock ? X.restockLine(x) : ''}</span><span class="muted ell" style="font-size:10px;display:flex;align-items:center;gap:4px">${P.swatch(x)}<span>· ${x.size}</span><span class="mono">· ${x.sku}</span></span></span></span>`;
  const ord = `<button class="btn xs ghost" style="gap:3px">${x.orders.length} order${x.orders.length > 1 ? 's' : ''}${ic(open ? 'chevUp' : 'chevronDown', 'i10')}</button>`;
  const cells = cap.stock
    ? [`<span class="ck${checked ? ' on' : ''}"></span>`, prod, storeLinks(x), ord, `<b class="tn">${x.qty}</b>`, `<b class="tn" style="color:${x.packed >= x.qty ? 'var(--e700)' : x.packed ? 'var(--a800)' : 'var(--tx-s)'}">${x.packed}</b>`, `<span class="av-n tn ${x.avail < toPick ? 'bad' : x.avail === toPick ? 'low' : ''}">${x.avail}</span>`, P.poCell({ canceled: false, ful: null }, x, cap), `<span class="acts"></span>`]
    : [`<span class="ck${checked ? ' on' : ''}"></span>`, prod, `<span class="bin">${x.bin}</span>`, storeLinks(x), ord, `<b class="tn">${toPick}</b>`, `<b class="tn">${x.packed}</b>`];
  return `<div class="tr${open ? ' open' : ''}${checked ? ' sel' : ''}" style="--cols:${colsF(cap)};--rh:40px">${cells.map((c) => `<span class="cell">${c}</span>`).join('')}</div>`;
}
function prodExpanded(x, role) {
  const cap = CAP[role], short = Math.max(1, x.qty - x.packed - x.avail);
  const rows = x.orders.map((o) => `<div class="ln" style="--lcols:70px 70px minmax(0,1fr) 56px 56px 90px 80px;--lh:30px"><b class="ono">#${o.no}</b>${P.storeChip(o.store)}<span class="ell">${cap.cust ? o.customer : o.placed}</span><b class="tn" style="text-align:center">${o.qty}</b><b class="tn" style="text-align:center">${o.packed}</b><span class="cell">${cap.slip && o.slipped ? `<span class="ib printed ro" title="Picking slip printed">${ic('printer', 'i')}</span>` : ''}<span class="bdg ${o.packed >= o.qty ? 'ok' : o.packed ? 'warn' : ''}">${o.packed >= o.qty ? 'Packed' : o.packed ? 'Partial' : 'Not packed'}</span></span><button class="btn xs ghost">Open order</button></div>`).join('');
  const head = `<div class="lnh" style="--lcols:70px 70px minmax(0,1fr) 56px 56px 90px 80px"><span>Order</span><span>Store</span><span>${cap.cust ? 'Customer' : 'Placed'}</span><span style="text-align:center">Qty</span><span style="text-align:center">Packed</span><span>Status</span><span></span></div>`;
  const reorder = cap.poCreate ? `<div class="bx" style="width:250px;flex:none">${P.secHead('package', 'Purchase')}<div class="in"><dl class="kv"><dt>Supplier</dt><dd><b class="strong">${x.supplier}</b></dd><dt>Available</dt><dd><span class="av-n tn ${x.avail < x.qty - x.packed ? 'bad' : ''}">${x.avail}</span> <span class="muted">of ${x.qty - x.packed} needed</span></dd><dt>Shortfall</dt><dd><b>${Math.max(0, x.qty - x.packed - x.avail)}</b></dd></dl>${x.po ? `<div class="row-b"><span class="bdg ${P.poBadgeCls[x.po.status]}">#${x.po.no} · ${PO_LABEL[x.po.status]}</span><span class="muted" style="font-size:10px">ETA ${x.po.eta}</span></div>` : ''}<button class="btn pri" style="width:100%">${ic('plus', 'i')}Create PO · ${short} pcs</button></div></div>` : '';
  return `<div class="xp" style="align-items:flex-start"><div class="bx" style="flex:1 1 0;min-width:0">${P.secHead('layers', `Open orders needing this product`, `<span class="muted tn">${x.orders.length}</span>`)}${head}${rows}</div>${reorder}</div>`;
}
function productsView(role) {
  const cap = CAP[role], rows = productRows(), focus = rows.find((r) => r.sku === (role === 'picker' ? 'TEE-MAR-XL' : 'POL-WHI-S')) || rows[0];
  const idx = rows.indexOf(focus), start = Math.max(0, idx - 2), win = rows.slice(start, start + 8);
  const hdr = cap.stock ? ['<span class="ck mix"></span>', P.sortHead('Product'), 'Stores', 'Orders', 'Needed', 'Packed', 'Avail', 'PO status', ''] : ['<span class="ck mix"></span>', P.sortHead('Product'), 'Bin', 'Stores', 'Orders', 'To pick', 'Packed'];
  const chk = new Set(cap.poCreate ? ['VIS-WHI-OS', 'TEE-SKY-L', 'POL-SKY-L'] : []);
  const bulk = cap.poCreate
    ? `<div class="bulk"><b>3 selected</b><span class="sep"></span><button class="btn pri" style="height:26px">${ic('plus', 'i')}Create POs (2 suppliers)</button><button class="btn ghost">${ic('download', 'i')}Export</button><span class="sep"></span><button class="x ib">${ic('close', 'i')}</button></div>`
    : `<div class="bulk"><b>3 selected</b><span class="sep"></span><button class="btn ghost">${ic('download', 'i')}Export</button>${cap.reqStock ? `<button class="btn ghost">${ic('cube', 'i')}Request stock</button>` : ''}${cap.slip ? `<button class="btn ghost">${ic('printer', 'i')}Print pick list</button>` : ''}<span class="sep"></span><button class="x ib">${ic('close', 'i')}</button></div>`;
  return `<div class="row-tb">${`<div class="srch">${ic('search', 'i')}<span class="fld">All fields${ic('chevronDown', 'i10')}</span><span class="ph">Search product, SKU, colour, barcode…</span>${ic('scan', 'i')}<kbd>/</kbd></div>`}
      ${cap.store ? P.chip('Store', 'All 4', 0) : ''}${P.chip('Colour', 'Any', 0)}${cap.stock ? P.chip('Stock', 'Any', 0) + P.chip('PO', 'Any', 0) : P.chip('Bin', 'Any', 0)}
      <button class="btn ghost" style="color:var(--pri-ink)">Clear filters</button><span class="sp"></span>${cap.sync ? `<span class="muted" style="font-size:10px">Synced 14:12</span>` : ''}<button class="btn ghost">${ic('refresh', 'i')}Refresh</button></div>
    <div class="qrow">${prodTabs(role)}<div class="r"><span class="muted" style="font-size:10.5px">Sort</span>${P.chip('', role === 'picker' ? 'By bin' : 'Shortfall first', 0)}</div></div>
    <div class="card" style="flex:1"><div class="thead" style="--cols:${colsF(cap)}">${hdr.map((h) => `<span>${h}</span>`).join('')}</div>
      <div class="tbody">${win.map((x) => prodRow(x, role, { open: x === focus, checked: chk.has(x.sku) }) + (x === focus ? prodExpanded(x, role) : '')).join('')}${bulk}</div>${P.pager(rows.length, 'products')}</div>`;
}
export function conceptF(role) {
  P.setRole(role);
  const cap = CAP[role];
  const toggle = `<div class="row-tb"><div class="seg2"><button data-vt="orders">${ic('navOrders', 'i')}Orders</button><button data-vt="products" class="on">${ic('cube', 'i')}Products</button></div><span class="muted" style="font-size:10.5px">${role === 'picker' ? 'Products view is your pick list: what to take from each bin, across all open orders.' : 'Products view: open order lines grouped by product. Buy what is short, then pick.'}</span></div>`;
  const body = `${toggle}
    <div class="view" data-view="orders" style="display:none">${toolbarE(role)}${selbarE(role)}${tableE(role, { take: 6 })}</div>
    <div class="view" data-view="products" style="display:flex">${productsView(role)}</div>`;
  return shell(role, `${P.approvals(role)}${body}`, { sub: 'Orders · Products' });
}

/* PO flow artboard: concept D, admin, with the Create PO popover open on the short Sun Visor line */
export function conceptDPo() {
  P.setRole('admin');
  const r = byNo('1184'), x = r.items.find((i) => i.sku === 'VIS-WHI-OS');
  const html = conceptD('admin');
  return html.replace(/<\/div>$/, P.poPopover(r, x, { left: 636, top: 440, caretTop: 231 }) + '</div>');
}
