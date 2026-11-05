import { ic, tile } from './chrome.mjs';
import * as X from './extras.mjs';
import { packHistOf, restockState, RECIPIENTS, contactOf, confsOf, STORES, ORDERS, QUEUES, countOf, queueFor, stage, totalQty, packedQty, slipOver24, byNo, shopifyUrl, shipLineOf, need, isShort, shortCount, PO_LABEL } from './data.mjs';
let ROLE = 'admin';
export const setRole = (r) => { ROLE = r; };

/** What each role can see / do. Mirrors today's pages exactly (proxy.ts + page code). */
export const CAP = {
  // deco: 2 = manage (assign, toggle, mark done), 1 = read-only state. round 3 adds reqStock, stockAdj, names, lineEdit, attach.
  admin:  { shopify: 1, stock: 1, poCreate: 1, store: 1, period: 1, sync: 1, ffilter: 1, slip: 1, pack: 1, ful: 1, cust: 1, contact: 1, labels: 1, req: 'direct', approvals: 1, deco: 2, bin: 0, track: 1, invoice: 1, reqStock: 1, stockAdj: 1, names: 1, lineEdit: 1, attach: 1, packDate: 0 },
  staff:  { slipStatus: 1, shopify: 1, stock: 1, poCreate: 0, store: 1, period: 1, sync: 1, ffilter: 1, slip: 0, pack: 0, ful: 1, cust: 1, contact: 0, labels: 1, req: 'request', approvals: 0, deco: 1, bin: 0, track: 0, invoice: 1, reqStock: 1, stockAdj: 0, names: 1, lineEdit: 0, attach: 0, packDate: 0, actions: 1 },
  picker: { shopify: 0, stock: 0, poCreate: 0, store: 0, period: 0, sync: 0, ffilter: 0, slip: 1, pack: 1, ful: 0, cust: 0, contact: 0, labels: 0, req: null, approvals: 0, deco: 0, bin: 0, track: 0, invoice: 0, reqStock: 0, stockAdj: 0, names: 0, lineEdit: 0, attach: 0, packDate: 1 },
};

/** Row background by status. Same priority as today's table (back-in-stock, then status, then decoration), with canceled / closed first. */
export function rowTone(r, role) {
  const cap = CAP[role];
  if (r.canceled) return 'tone-red';
  if (r.closed) return 'tone-gray';
  if (cap.reqStock && restockState(r) && r.ful !== 'full') return 'tone-restock';
  if (r.req) return 'tone-amber';
  if (r.ful === 'full') return 'tone-blue';
  if (r.ful === 'partial') return 'tone-amber';
  if (packedQty(r) >= totalQty(r)) return 'tone-green';
  if (cap.deco && r.items.some((x) => x.deco === 'EMB')) return 'tone-emb';
  if (cap.deco && r.items.some((x) => x.deco === 'PRT')) return 'tone-prt';
  return '';
}
export const storeChip = (c) => `<span class="store"><i style="background:${STORES[c].hue}"></i>${c}</span>`;
/** Print-picking-slip button: neutral until printed, then green with a tick (no time-based "late" state any more). */
export const slipTitle = (r) => (r.slip != null ? `Picking slip printed ${r.slip < 24 ? Math.max(1, Math.round(r.slip)) + ' h ago' : Math.round(r.slip / 24) + ' d ago'} · print again` : 'Print picking slip');
export const slipText = (r, cls = '', style = '') => `<button class="btn ${r.slip != null ? 'printed' : 'ghost'} ${cls}" style="${style}" title="${slipTitle(r)}">${ic(r.slip != null ? 'check' : 'printer', 'i')}${r.slip != null ? 'Slip printed · Reprint' : 'Picking slip'}</button>`;
/** Print-label action: turns green once the shipping label is printed (same rule as the slip). */
export const labelBtn = (r) => `<button class="ib${r.label ? ' printed' : ''}" title="${r.label ? 'Shipping label printed, print again' : 'Print label'}">${ic('tag', 'i')}</button>`;
export const slipBtn = (r) => `<button class="ib${r.slip != null ? ' printed' : ''}" title="${slipTitle(r)}">${ic('printer', 'i')}</button>`;
/** Read-only twin for dense lists where the button itself does not fit. */
export const slipDot = (r) => (r.slip != null ? `<span class="ib printed ro" title="${slipTitle(r)}">${ic('printer', 'i')}</span>` : '');

/* ---------- stage track: nodes are role-shaped (staff never sees the slip, picker never sees fulfilment) ---------- */
export function stageNodes(cap) {
  return [(cap.slip || cap.slipStatus) && ['slip', 'Slip'], ['packed', 'Pack'], cap.ful && ['ful', 'Fulfil'], cap.ful && ['trk', 'Track']].filter(Boolean);
}
export function track(r, cap, lg = false) {
  const s = stage(r), nodes = stageNodes(cap);
  const st = (k) => (k === 'slip' ? (s.slip ? 'done' : 'none') : s[k]);
  const out = nodes.map(([k], i) => {
    const v = st(k), green = k === 'slip' || k === 'ful' || k === 'trk';
    const cls = v === 'done' ? 'done' + (green ? ' g' : '') : v === 'part' ? 'part' : '';
    const mark = v === 'done' ? ic('check', 'i') : '';
    const cn = i ? `<span class="cn ${st(k) === 'done' ? (green ? 'g' : 'done') : ''}"></span>` : '';
    return cn + `<span class="nd ${cls}" title="${nodes[i][1]}">${mark}</span>`;
  });
  return `<span class="trk${lg ? ' lg' : ''}">${out.join('')}</span>`;
}
export const trackHead = (cap) => {
  const n = stageNodes(cap).length;
  return `<span class="trk-l">${stageNodes(cap).map(([, t]) => `<span style="width:34px;overflow:visible;white-space:nowrap">${t}</span>`).join('')}</span>`;
};
export const trackW = (cap) => stageNodes(cap).length * 34 + 4;

export function packBar(r) {
  const p = packedQty(r), t = totalQty(r), pct = Math.round((p / t) * 100);
  return `<span class="pb"><b class="tn">${p}/${t}</b><span class="pbar"><i class="${p >= t ? 'done' : p ? 'part' : ''}" style="width:${pct}%"></i></span></span>`;
}
export const thumbs = (r, n = 3) => {
  const its = r.items.slice(0, n), more = r.items.length - n;
  return `<span class="stack">${its.map((x) => tile(x.kind, x.hex, 22)).join('')}</span>${more > 0 ? `<span class="muted tn">+${more}</span>` : ''}`;
};
export const decoBadges = (r) => {
  if (ROLE === 'picker') return ''; // today's Picking List shows no decoration state
  const e = r.items.some((x) => x.deco === 'EMB'), p = r.items.some((x) => x.deco === 'PRT');
  return (e ? '<span class="bdg emb">EMB</span>' : '') + (p ? '<span class="bdg prt">PRT</span>' : '');
};
export const decoMini = (r) => {
  if (ROLE === 'picker') return '';
  const e = r.items.some((x) => x.deco === 'EMB'), q = r.items.some((x) => x.deco === 'PRT');
  return (e ? '<span class="bdg emb" title="Embroidery" style="padding:0 4px">E</span>' : '') + (q ? '<span class="bdg prt" title="Print" style="padding:0 4px">P</span>' : '');
};
export const flags = (r, cap) => {
  const b = (icn, n, tip, red) => (n ? `<span class="ib" title="${tip}" style="width:20px">${ic(icn, 'i')}<i class="ct${red ? ' ' + (red === 1 ? 'red' : red) : ''}">${n}</i></span>` : '');
  return `<span class="cell" style="gap:2px">${b('document', r.notes, 'Order notes')}${b('chat', r.msgs, 'Messages')}${b('userLock', r.req ? 1 : 0, 'Fulfilment edit request awaiting approval', 'amber')}</span>`;
};
/** Notes column: order-note icon (always shown so a first note can be added) + pending-request flag. Opens the Notes modal. */
export const noteFlags = (r) => {
  const ct = (n, cls = '') => (n ? `<i class="ct${cls}">${n}</i>` : '');
  return `<span class="cell" style="gap:2px"><span class="ib" title="Order notes" style="width:20px">${ic('document', 'i')}${ct(r.notes)}</span>${r.req ? `<span class="ib" title="Fulfilment edit request awaiting approval" style="width:20px">${ic('userLock', 'i')}<i class="ct amber">1</i></span>` : ''}</span>`;
};
/** Actions column: message icon (always shown so a first message can be sent). Opens the Messages modal. */
/** The order's Message action is closed once a picker's order is fully packed or a staff order is fulfilled (Admin never). */
export const msgOff = (r) => (ROLE === 'picker' ? totalQty(r) > 0 && packedQty(r) >= totalQty(r) : ROLE !== 'admin' && r.ful === 'full');
export const msgBtn = (r) => `<button class="ib${msgOff(r) ? ' off' : ''}"${msgOff(r) ? ' disabled style="opacity:.4;cursor:not-allowed"' : ''} title="${msgOff(r) ? 'Messages are closed for this order' : 'Messages'}">${ic('chat', 'i')}${r.msgs ? `<i class="ct">${r.msgs}</i>` : ''}</button>`;
/** Actions column: tax invoice icon. */
export const invoiceBtn = () => `<button class="ib" title="Print tax invoice">${ic('document', 'i')}</button>`;
export const sortHead =(t) => `<span class="srt">${t}${ic('sort', 'i10')}</span>`;

/* ---------- toolbar: filters are chips, not dropdown stacks ---------- */
export const chip = (k, v, on, ro) => `<button class="fchip${on ? ' on' : ''}${ro ? ' ro' : ''}"><span class="k">${k}</span><b>${v}</b>${ic('chevronDown', 'i12')}</button>`;
export function searchBox(role) {
  // Staff and Picker keep the old field lists: Orders has no Barcode field, Picking List adds it.
  const ph = role === 'picker' ? 'Scan barcode or search order, customer, product…' : role === 'staff' ? 'Search order, customer, address, product…' : 'Scan barcode or search order, customer, address, product…';
  const tip = role === 'staff' ? 'Search by order number, customer name, customer address or product' : 'Search by order number, customer, address, product or barcode';
  return `<div class="srch" title="${tip}">${ic('search', 'i')}<span class="fld">All fields${ic('chevronDown', 'i10')}</span><span class="ph">${ph}</span>${role === 'staff' ? '' : ic('scan', 'i')}<kbd>/</kbd></div>`;
}
/** Every role uses the filters of today's pages (OrdersToolbar, PickingListFilters). Admin sees both pages, so gets the union. */
function oldFilters(role) {
  if (role === 'admin') return chip('Status', 'All', 0) + chip('Packed', 'All', 0) + chip('Print', 'All', 0);
  if (role === 'staff') return chip('Status', 'All', 0) + chip('Packed', 'All', 0);
  if (role === 'picker') return chip('Packed', 'Not packed + Partial', 1) + chip('Print', 'All', 0) + `<button class="btn xs ghost" style="border-color:transparent;color:var(--pri-ink)">${ic('close', 'i10')}Clear filters</button>`;
  return '';
}
export function toolbar(role, { extra = '', refreshWarn = false } = {}) {
  const c = CAP[role];
  return `<div class="row-tb">
    ${searchBox(role)}
    ${c.store ? chip('Store', 'All stores', 0) : ''}
    ${c.period ? chip('Period', 'All time', 0) : ''}
    ${oldFilters(role)}
    ${extra}
    <span class="sp"></span>
    ${c.sync ? `<span class="muted" style="font-size:10px;white-space:nowrap">${refreshWarn ? 'Synced 14:12 · 3 new' : 'Synced 14:12'}</span><span class="split"><button class="btn ghost">${ic('refresh', 'i')}Sync</button><button class="btn ghost sd" title="Choose stores to sync">${ic('chevronDown', 'i12')}</button></span>` : ''}
    <button class="btn ${refreshWarn ? 'warn' : 'ghost'}" title="${refreshWarn ? 'A sync finished: refresh to see the changes' : 'Reload the list'}">${ic('refresh', 'i')}Refresh</button>
  </div>`;
}
export function queueTabs(role, active) {
  return `<div class="qtabs" role="tablist">${QUEUES[role]
    .map(([k, t]) => `<button class="qt${k === active ? ' on' : ''}" role="tab">${t}<span class="qn">${countOf(k, role)}</span></button>`)
    .join('')}</div>`;
}
export const activeChips = (role) =>
  `<span class="rmv">Unfulfilled ${ic('close', 'i10')}</span>${CAP[role].period ? `<span class="rmv">This month ${ic('close', 'i10')}</span>` : ''}<button class="btn xs ghost" style="border-color:transparent;color:var(--pri-ink)">Clear all</button>`;

/** Collapsible amber section (implemented page): count pill + chevron; open it to approve or reject each request. `open` draws the expanded state. */
export function approvals(role, { open = false } = {}) {
  if (!CAP[role].approvals) return '';
  const req = `<div class="apr-b"><div><p><b>Staff</b> — Edit fulfilment <span class="muted" style="font-size:10.5px;margin-left:8px"><b class="strong">Order #0702</b> • 30/10/2026, 11:42:08</span></p><p class="apr-r">“Wrong carrier, parcel not yet scanned”</p></div><span class="cell" style="gap:6px"><button class="btn xs ghost">View order</button><button class="btn xs pri">Approve</button><button class="btn xs dngr">Reject</button></span></div>`;
  return `<div class="appr2"><button class="apr-h" aria-expanded="${open}">${ic('userLock', 'i')}<i class="apr-n">1</i><b>Fulfilment request awaiting approval</b>${ic('chevronDown', 'i')}</button>${open ? req : ''}</div>`;
}

export const swatch = (x) => `<span class="sw"><i style="background:${x.hex}"></i>${x.colour}</span>`;
export const shopifyLink = (r, x) => `<a class="shln" title="Open in Shopify admin · ${STORES[r.store].domain}/admin/products/${x.productId}" href="${shopifyUrl(r, x)}">${ic('external', 'i10')}</a>`;
export const availCell = (r, x) => {
  const n = need(x), cls = r.canceled || r.ful === 'full' ? '' : x.avail < n ? 'bad' : x.avail === n ? 'low' : '';
  return `<span class="av-n tn ${cls}" title="Available = on hand − allocated (hub pool, shared by all stores)">${x.avail}</span>`;
};
const PO_SHORT = { REQUESTED: 'Requested', PARTIALLY_RECEIVED: 'Part received', RECEIVED: 'Received', CANCELLED: 'Cancelled' };
export const poBadgeCls = { REQUESTED: 'info', PARTIALLY_RECEIVED: 'warn', RECEIVED: 'ok', CANCELLED: '' };
export function poCell(r, x, cap) {
  const short = isShort(r, x) || (x.avail <= 2 && !x.po);
  if (x.po) {
    const p = x.po, sub = p.status === 'RECEIVED' ? `${p.received}/${p.ordered} in` : p.status === 'PARTIALLY_RECEIVED' ? `${p.received}/${p.ordered} in · ETA ${p.eta}` : `${p.ordered} on PO · ETA ${p.eta}`;
    return `<span class="cell col" style="gap:2px"><span class="bdg ${poBadgeCls[p.status]}" title="Purchase order #${p.no} · ${PO_LABEL[p.status]}">#${p.no} ${PO_SHORT[p.status]}</span><span class="muted" style="font-size:10.5px">${sub}</span></span>`;
  }
  if (!short) return `<span class="muted">—</span>`;
  return cap.poCreate ? `<button class="btn xs soft" title="Create a purchase order for ${x.supplier}">${ic('plus', 'i10')}PO</button>` : `<span class="cell"><span class="bdg bad">No PO</span></span>`;
}
export function shortBadge(r, cap) {
  const n = cap.stock ? shortCount(r) : 0;
  return n ? `<span class="bdg warn" title="${n} line${n > 1 ? 's' : ''} not covered by available stock">Short ${n}</span>` : '';
}

/* ---------- pack lines ---------- */
export function lineCols(cap, dense = false, work = false, showWork = work, decoBoth = false) {
  if (decoBoth) {
    // A2 = the implemented Orders page: Decoration (EMB / PRT) and Decorator (assignee + Mark done / View) are two columns
    const c = [['item', 'minmax(120px,1.4fr)'], ['sku', cap.stock ? 'minmax(64px,.5fr)' : '96px']];
    if (cap.deco) c.push(['deco', '104px']);
    c.push(['qty', cap.ful ? '38px' : '22px'], ['packed', '38px']);
    if (cap.packDate) c.push(['pdate', '96px']);
    if (cap.stock) c.push(['avail', '28px'], ['po', '86px']);
    if (cap.deco && showWork) c.push(['decorator', '132px']);
    if (cap.pack || cap.ful) c.push(['full', '42px'], ['part', '66px']);
    if (cap.lineEdit) c.push(['act', '46px']);
    return c;
  }
  const cols = [['item', 'minmax(0,1fr)']];
  if (!cap.stock) cols.push(['sku', '96px']);
  else if (work) cols.push(['sku', '62px']);
  if (cap.bin && !dense && !(work && cap.stock)) cols.push(['bin', '44px']);
  if (cap.deco && !dense) cols.push(['deco', work && cap.stock ? '60px' : '68px']);
  cols.push(['qty', work ? '22px' : '28px'], ['packed', work ? '38px' : '52px']);
  if (cap.packDate) cols.push(['pdate', '96px']);
  if (cap.stock) cols.push(['avail', work ? '28px' : '40px'], ['po', work ? '98px' : '136px']);
  if (showWork && cap.deco) cols.push(['work', '34px']);
  if (cap.pack) cols.push(['full', work ? '42px' : '48px'], ['part', work ? '72px' : '96px']);
  if (work && cap.lineEdit) cols.push(['act', '46px']);
  return cols;
}
const colsCss = (cols) => cols.map((c) => c[1]).join(' ');
const xchips = (x, cap) => { const c = [X.nameChip(x, cap), cap.reqStock ? X.restockLine(x) : ''].filter(Boolean).join(''); return c ? `<span class="cell" style="gap:4px;margin-top:1px">${c}</span>` : ''; };
export function lines(r, cap, { rowH = 36, sel = 1, skuSub = true, head: showHead = true, dense = false, workCol = false, decoBoth = false } = {}) {
  const hasWork = decoBoth ? r.items.some((x) => x.deco || x.work) : workCol && r.items.some((x) => x.work);
  const cols = lineCols(cap, dense, workCol, hasWork, decoBoth), css = colsCss(cols), lgap = workCol && cap.stock ? 4 : 8, N = { pdate: 'Packed Date', item: 'Item', sku: 'SKU', bin: 'Bin', deco: decoBoth ? 'Decoration' : 'Deco', decorator: 'Decorator', work: 'Work', act: 'Actions', qty: 'Qty', packed: 'Packed', avail: 'Avail', po: 'PO status', full: 'Full', part: 'Partial' };
  const fullN = r.items.filter((x, idx) => x.packed >= x.qty || (sel && idx === 0)).length;
  const fullAll = r.items.length > 0 && fullN === r.items.length, fullMix = fullN > 0 && !fullAll;
  const headCell = (k) => k === 'full'
    ? `<span style="display:flex;align-items:center;justify-content:center;gap:3px">${N[k]}<span class="ck${fullAll ? ' on' : fullMix ? ' mix' : ''}" title="Mark every line Full"></span></span>`
    : `<span style="${['qty', 'packed', 'avail', 'act'].includes(k) ? 'text-align:center' : ''}">${N[k]}</span>`;
  const head = `<div class="lnh" style="--lcols:${css};--lgap:${lgap}px">${cols.map(([k]) => headCell(k)).join('')}</div>`;
  const rows = r.items.map((x, idx) => {
    const done = x.packed >= x.qty, part = x.packed > 0 && !done, fullOn = done || (sel && idx === 0);
    // fulfilled quantity of the line (fully fulfilled order, or a partial one that left the last line open)
    const fulQty = r.ful === 'full' || (r.ful === 'partial' && idx < r.items.length - 1) ? x.qty : 0;
    const picked = decoBoth && cap.ful && fulQty < x.qty && fullOn;
    const cell = {
      item: `<span class="cell">${tile(x.kind, x.hex, rowH > 40 ? 32 : 26)}<span class="cell col" style="min-width:0" title="${x.sku}"><span class="cell" style="gap:4px;max-width:100%"><b class="strong ell" style="font-size:11.5px">${x.name}</b>${cap.shopify ? shopifyLink(r, x) : ''}</span><span class="muted ell" style="font-size:10px;display:flex;align-items:center;gap:4px">${swatch(x)}<span>· ${x.size}</span>${cap.stock && skuSub ? `<span class="mono">· ${x.sku}</span>` : ''}${dense && cap.bin ? `<span class="bin">${x.bin}</span>` : ''}</span>${xchips(x, cap)}</span></span>`,
      sku: cap.stock ? `<span class="cell col" style="gap:2px;align-items:flex-start;min-width:0"><span class="mono muted ell" style="font-size:10px;max-width:100%">${x.sku || '-'}</span></span>` : `<span class="mono muted">${x.sku}</span>`,
      work: X.lineWork(x, cap),
      decorator: X.lineDecorator(x, cap),
      act: X.lineActions(r, x, r.ful === 'full' ? 'full' : r.ful === 'partial' && idx < r.items.length - 1 ? 'part' : '', cap),
      bin: `<span class="bin">${x.bin}</span>`,
      deco: X.lineDeco(x, cap, { both: decoBoth }),
      qty: decoBoth && cap.ful ? `<b class="tn" style="text-align:center" title="${fulQty} of ${x.qty} fulfilled">${fulQty}/${x.qty}</b>` : `<b class="tn" style="text-align:center">${x.qty}</b>`,
      avail: `<span style="display:flex;justify-content:center">${cap.stock ? availCell(r, x) : ''}</span>`,
      po: cap.stock ? poCell(r, x, cap) : '',
      pdate: `<span class="muted tn" style="font-size:10.5px">${x.packed > 0 ? packHistOf(r)[0].at : '-'}</span>`,
      packed: `<span class="pb" style="justify-content:center"><b class="tn" style="color:${done ? 'var(--e700)' : part ? 'var(--a800)' : 'var(--tx-s)'}">${x.packed}/${x.qty}</b></span>`,
      full: `<span style="display:flex;justify-content:center"><span class="ck${fullOn ? ' on' : ''}"></span></span>`,
      part: `<span class="step${fullOn ? ' dis' : ''}" style="justify-self:end"><button>−</button><span>${fullOn ? x.qty : idx === 1 && sel ? 2 : 0}</span><button>+</button></span>`,
    };
    return `<div class="ln${picked ? ' pick' : done ? ' done' : part ? ' part' : ''}" style="--lcols:${css};--lh:${rowH}px;--lgap:${lgap}px">${cols.map(([k]) => cell[k] || '<span></span>').join('')}</div>`;
  });
  const body = (showHead ? head : '') + rows.join('');
  if (!decoBoth) return body;
  // Implemented page: the item table keeps its column minimums and scrolls sideways when the three boxes do not fit.
  const min = cols.reduce((n, c) => n + (parseFloat(c[1].replace('minmax(', '')) || 0), 0) + (cols.length - 1) * lgap + 16;
  return `<div class="lscroll thin"><div style="min-width:${Math.ceil(min)}px">${body}</div></div>`;
}

/* ---------- role-gated side boxes (shared by A expanded row, B inspector, C detail zone) ---------- */
export function packBox(r, cap, { big = false } = {}) {
  if (!cap.pack) return '';
  const allPacked = packedQty(r) >= totalQty(r);
  const entry = (e) => `<div class="hist"><span><b>Packed ${e.at}</b> · ${e.n} item${e.n === 1 && cap.packDate ? '' : 's'}</span><button class="ib" title="Cancel confirmation (sends notification)">${ic('trash', 'i')}</button></div>`;
  // Implemented page: every (non-canceled) confirmation, each with its own cancel icon, in a short scroll list (all roles).
  const hist = packedQty(r) === 0 ? `<div class="hist muted">No packing history.</div>` : `<div style="display:flex;flex-direction:column;gap:4px;max-height:68px;overflow-y:auto">${packHistOf(r).map(entry).join('')}</div>`;
  const h = big ? 38 : 28;
  return `<div style="display:flex;flex-direction:column;gap:6px">
    <div style="display:flex;gap:5px">
      ${allPacked ? `<button class="btn off" style="flex:1;height:${h}px">${ic('check', 'i')}All ${totalQty(r)} items packed</button>` : `<button class="btn pri" style="flex:1;height:${h}px;font-size:${big ? 13 : 11}px">${ic('check', 'i')}Confirm packed</button>`}
      <button class="btn ${r.slip != null ? 'printed' : 'soft'}" style="flex:none;height:${h}px" title="${slipTitle(r)}">${ic(r.slip != null ? 'check' : 'printer', 'i')}${r.slip != null ? 'Reprint Slip' : 'Print Slip'}</button>
    </div>
    ${hist}
  </div>`;
}
/** Print Label + Message under the confirm buttons, as today's Actions column (message count badge; both locked once fully fulfilled). */
const fulMsg = (r, cap) => {
  const cls = r.ful === 'full' ? 'off' : 'ghost';
  return `<div style="display:flex;gap:5px">${cap.labels ? `<button class="btn ${cls}" style="flex:1;height:26px" title="Print the 4×6 shipping label">${ic('printer', 'i')}Print Label</button>` : ''}<button class="btn ${cls}" style="flex:1;height:26px" title="Message the admins about this order">${ic('chat', 'i')}Message${r.msgs ? `<span style="background:var(--pri);color:#fff;border-radius:999px;font-size:9px;font-weight:700;padding:0 5px;line-height:14px;margin-left:2px">${r.msgs}</span>` : ''}</button></div>`;
};
/** Today's expanded "Actions" column (Staff): always shown, buttons disabled once fully fulfilled, canceled or closed. */
export function actionsBox(r, cap) {
  const locked = r.canceled || r.closed, done = r.ful === 'full', noConfirm = locked || done;
  const h = 28, st = `flex:1;height:${h}px`;
  const confirmLbl = (t) => (locked ? 'Fulfilment locked' : t);
  const cls = done ? 'off' : 'ghost';
  return `<div style="display:flex;flex-direction:column;gap:5px">
    <div style="display:flex;gap:5px"><button class="btn ${noConfirm ? 'off' : 'pri'}" style="${st}"${noConfirm ? ' disabled' : ''}>${confirmLbl('Confirm Fulfilment')}</button><button class="btn ${noConfirm ? 'off' : 'sky'}" style="${st}"${noConfirm ? ' disabled' : ''} title="Confirm fulfilment and print the shipping label">${confirmLbl('Confirm & Print')}</button></div>
    <div style="display:flex;gap:5px"><button class="btn ${cls}" style="${st}"${done ? ' disabled' : ''} title="Print the 4×6 shipping label">Print Label</button><button class="btn ${cls}" style="${st}"${done ? ' disabled' : ''} title="Message the admins about this order">Message${r.msgs ? `<span style="background:var(--pri);color:#fff;border-radius:999px;font-size:9px;font-weight:700;padding:0 5px;line-height:14px;margin-left:2px">${r.msgs}</span>` : ''}</button></div>
  </div>`;
}
export function fulBox(r, cap, { confirm = true } = {}) {
  if (!cap.ful) return '';
  if (cap.actions) confirm = false;
  const locked = r.canceled || r.closed;
  const lockNote = locked ? `<div class="lockb">${ic('lock', 'i')}<span><b class="strong">Fulfilment locked</b><br>${r.canceled ? 'Canceled' : 'Closed'} orders cannot be fulfilled.</span></div>` : '';
  if (locked && !r.ful) return lockNote;
  const cs = confsOf(r), fulfilled = r.ful === 'full', ready = packedQty(r) >= totalQty(r);
  const left = r.ful === 'partial' ? r.items.length - 1 : 0;
  const head = locked && !cs.length ? '' : `<div class="row-b"><span class="bdg ${fulfilled ? 'ok' : cs.length ? 'warn' : ready ? 'info' : 'warn'}">${fulfilled ? 'Fulfilled' : cs.length ? 'Partial' : ready ? 'Ready to fulfil' : 'Not fully packed'}</span><span class="muted tn" style="font-size:10px">${fulfilled ? '' : cs.length ? `${left} line${left === 1 ? '' : 's'} still to fulfil` : ready ? 'All lines packed' : packedQty(r) + '/' + totalQty(r) + ' packed'}</span></div>`;
  // Admin: Confirm buttons stay (disabled once fulfilled). Carrier, tracking and Edit / Cancel moved into the Fulfilments modal.
  const adminBtns = !locked && cap.req === 'direct' ? `<div style="display:flex;gap:5px"><button class="btn ${fulfilled ? 'off' : 'pri'}" style="flex:1;height:26px"${fulfilled ? ' disabled title="Already fully fulfilled"' : ''}>Confirm fulfilment</button><button class="btn ${fulfilled ? 'off' : 'ghost'}" style="flex:1;height:26px"${fulfilled ? ' disabled' : ''} title="${fulfilled ? 'Already fully fulfilled' : 'Confirm fulfilment and print the shipping label'}">${ic('printer', 'i')}Confirm & Print</button></div>${fulMsg(r, cap)}` : '';
  return `<div style="display:flex;flex-direction:column;gap:6px">${lockNote}${head}${confirm ? adminBtns : ''}</div>`;
}
/** Today's "Shipping" block (Orders page): title, Free / Paid pill, discount codes, then Price and Discounted. */
export function shipBox(r, cap) {
  if (!cap.cust) return '';
  const s = shipLineOf(r), free = s.final <= 0, $ = (n) => '$' + n.toFixed(2);
  return `<div class="shipb"><div class="shh">Shipping</div>
    <div class="shln"><div class="cell" style="flex-wrap:wrap;gap:5px"><b class="strong">${s.title}</b><span class="bdg ${free ? 'ok' : ''}">${free ? 'Free' : 'Paid'}</span>${s.codes.map((c) => `<span class="bdg warn mono" title="Discount code">${c}</span>`).join('')}</div>
    <div class="muted tn" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:3px;font-size:10.5px"><span>Price: ${$(s.price)}</span><span>Discounted: ${$(s.final)}</span></div></div>
    <div class="muted" style="font-size:10.5px">${STORES[r.store].name} · #${r.no}</div></div>`;
}
export function custBox(r, cap, { method = true } = {}) {
  if (!cap.cust) return '';
  const meth = method ? `<dt>Method</dt><dd><span class="cell" style="flex-wrap:wrap"><span class="bdg ${r.ship === 'Express' ? 'warn' : 'ok'}">${r.ship} · ${r.ship === 'Express' ? 'Paid $14' : 'Free'}</span>${(r.codes || []).map((c) => `<span class="bdg info" title="Discount code">${c}</span>`).join('')}</span></dd>` : '';
  return `<div style="display:flex;flex-direction:column;gap:6px">
    <dl class="kv" style="grid-template-columns:58px 1fr"><dt>Customer</dt><dd><b class="strong">${r.customer}</b></dd>${cap.contact ? `<dt>Email</dt><dd style="overflow-wrap:anywhere;font-size:10.5px">${contactOf(r).email}</dd><dt>Phone</dt><dd class="tn">${contactOf(r).phone}</dd>` : ''}<dt>Ship to</dt><dd>${contactOf(r).lines.join('<br>')}</dd>${meth}</dl>
    ${r.notes ? `<div class="note-a"><b>Order note</b> · Please hold until the team captain collects the box.</div>` : ''}
  </div>`;
}
export function thread(r, cap) {
  const mine = cap.pack && !cap.cust; // picker sees picker-type messages only; staff/admin see admin-type
  const a = r.notes ? `<div class="msg"><span class="av">S</span><div><b>Staff</b> <span class="muted">· Order note · Wed 15:10</span><br>Captain collects Saturday, keep the box sealed with the club label.</div></div>` : '';
  const b = r.msgs ? (mine
    ? `<div class="msg"><span class="av p">P</span><div><b>Picker</b> <span class="muted">· To admin · Thu 08:42</span><br>Bin ${r.items[0].bin} is short by 1, can the last piece come from the stock room?</div></div>`
    : `<div class="msg"><span class="av a">A</span><div><b>Admin</b> <span class="muted">· Message · Thu 08:42</span><br>Hold until the club coordinator confirms the final head count.</div></div>`) : '';
  const empty = !a && !b ? `<div class="muted" style="font-size:10.5px">No notes or messages on this order yet.</div>` : '';
  return `<div class="thr">${a}${b}${empty}<div class="row-b" style="gap:5px"><span class="inp" style="flex:1;color:var(--g500)">Add a note or message…</span><button class="btn sm soft">${ic('chat', 'i')}Send</button></div></div>`;
}
export function pickRoute(r) {
  const seq = [...r.items].sort((a, b) => a.bin.localeCompare(b.bin));
  return `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:8px">${seq.map((x, i) => `${i ? `<span class="muted">${ic('chevronRight', 'i12')}</span>` : ''}<span class="hist" style="padding:3px 8px 3px 4px;gap:6px;background:var(--surf)"><span class="bin">${x.bin}</span>${tile(x.kind, x.hex, 20)}<b class="tn">× ${x.qty - x.packed || x.qty}</b></span>`).join('')}</div>`;
}
export const secHead = (icn, t, right = '') => `<div class="sh"><h4>${ic(icn, 'i12')}${t}</h4><span>${right}</span></div>`;

export function bulkBar(role, n = 3, compact = false, names = null) {
  const c = CAP[role];
  const L = compact ? { s: 'Slips', l: 'Labels', e: 'Names' } : { s: 'Print picking slips', l: 'Print labels', e: 'Export names' };
  const cnt = names == null ? '' : ` (${names})`;
  return `<div class="bulk"><b>${n} selected</b><span class="sep"></span>
    ${c.slip ? `<button class="btn ghost">${ic('printer', 'i')}${L.s}</button>` : ''}
    ${c.labels ? `<button class="btn ghost">${ic('printer', 'i')}${L.l}</button>` : ''}
    ${c.names ? `<button class="btn ghost" title="Export name attributes as CSV or print">${ic('download', 'i')}${L.e}${cnt}${ic('chevronDown', 'i10')}</button>` : ''}
    <span class="sep"></span><button class="x ib" title="Clear selection">${ic('close', 'i')}</button></div>`;
}
export const pager = (n = 21, size = true) => {
  const sel = `<select class="pgsz" aria-label="Rows per page" onchange="this.closest('.foot').querySelector('[data-rng]').textContent='1–'+Math.min(${n},+this.value)">${[10, 20, 50, 100].map((v) => `<option${v === 20 ? ' selected' : ''}>${v}</option>`).join('')}</select>`;
  return `<div class="foot"><span style="display:flex;align-items:center;gap:12px"><span>Showing <b class="tn strong" data-rng>1–${Math.min(n, 20)}</b> of <b class="tn strong">${n}</b> ${size === 'products' ? 'products' : 'orders'}</span><span class="row-b" style="gap:5px"><span class="muted">Rows per page</span>${sel}</span></span><div class="pager"><span>${ic('chevronLeft', 'i12')}</span><span class="on">1</span>${n > 20 ? '<span>2</span>' : ''}<span>${ic('chevronRight', 'i12')}</span></div></div>`;
};
/** Create-PO popover (admin only). Created as REQUESTED, prefilled with the shortfall. */
export function poPopover(r, x, { left, top, caretTop = 60 }) {
  const short = Math.max(1, need(x) - x.avail);
  return `<div class="pop" style="left:${left}px;top:${top}px" role="dialog" aria-label="Create purchase order"><i class="caret r" style="top:${caretTop}px"></i>
    <div class="ph2"><b>Create purchase order</b><button class="ib">${ic('close', 'i')}</button></div>
    <div class="fb">
      <div class="fr"><label>Supplier</label><span class="inp" style="justify-content:space-between;height:28px">${x.supplier}${ic('chevronDown', 'i10')}</span></div>
      <div class="fr"><label>Product</label><span class="cell" style="gap:8px">${tile(x.kind, x.hex, 30)}<span class="cell col"><b class="strong">${x.name}</b><span class="muted" style="font-size:10.5px;display:flex;gap:4px;align-items:center">${swatch(x)}<span>· ${x.size}</span><span class="mono">· ${x.sku}</span></span></span></span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="fr"><label>Quantity</label><span class="step" style="height:28px;width:100%"><button>−</button><span style="flex:1">${short}</span><button>+</button></span></div>
        <div class="fr"><label>Delivery date</label><span class="inp" style="height:28px">6 Nov 2026</span></div>
      </div>
      <div class="row-b" style="font-size:10.5px;color:var(--tx-m);background:var(--a50);border:1px solid var(--a200);border-radius:7px;padding:5px 8px"><span><b>Needs ${need(x)}</b> · available <b>${x.avail}</b></span><span>Shortfall <b>${short}</b></span></div>
      <div class="fr"><label>PO remark</label><span class="inp" style="height:28px;color:var(--g500)">Optional note to supplier…</span></div>
    </div>
    <div class="ft"><span class="muted" style="margin-right:auto;font-size:10px;align-self:center">Created as Requested</span><button class="btn ghost">Cancel</button><button class="btn pri">${ic('check', 'i')}Create PO</button></div>
  </div>`;
}
export { ORDERS, byNo, queueFor, totalQty, packedQty, tile, ic };
