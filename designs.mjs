import { sidebar, header, ZOOM_JS } from './chrome.mjs';
import * as P from './parts.mjs';
import * as X from './extras.mjs';
import { stockAdjOf, confsOf } from './data.mjs';
const { ic, tile, CAP, ORDERS, byNo, queueFor, totalQty, packedQty } = P;

export const CSS2 = `
.row-tb{display:flex;align-items:center;gap:6px;flex:none}.sp{flex:1}
.row-b{display:flex;align-items:center;justify-content:space-between;gap:8px}
.split{display:inline-flex}.split .btn:first-child{border-radius:var(--rad) 0 0 var(--rad)}.split .sd{border-radius:0 var(--rad) var(--rad) 0;border-left:0;padding:0 5px}
.qrow{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none}
.qrow .r{display:flex;align-items:center;gap:6px}
.xp{background:var(--surf-m);border-bottom:1px solid var(--pri-ring);padding:8px 10px 10px;display:flex;gap:8px;align-items:stretch}
.xp .bx{background:var(--surf);border:1px solid var(--bd);border-radius:9px;display:flex;flex-direction:column;min-width:0}
.ckl{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--tx-b);font-weight:600;white-space:nowrap}
.thr{padding:8px;display:flex;flex-direction:column;gap:7px}
.msg{display:flex;gap:7px;font-size:11px;line-height:1.4;color:var(--tx-b)}
.av{width:20px;height:20px;border-radius:50%;background:var(--pri);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}.av.p{background:#0f766e}.av.a{background:#1f2937}
.xp .bx .in{padding:8px;display:flex;flex-direction:column;gap:6px}
`;

export function shell(role, content, { cls = '', sub = '' } = {}) {
  return `<div class="art ${cls}" data-role="${role}">${sidebar(role)}<div class="main">${header(role, sub)}<div class="zoomable"><div class="page">${content}</div></div></div></div>`;
}
export const wrapDoc = (title, css, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body style="background:#fff">${body}${ZOOM_JS}</body></html>`;

/* which order is open / selected per role, and which rows are checked */
export const FOCUS = { admin: '1184', staff: '0702', picker: '2204' };
const FOCUS_C = { admin: '1184', staff: '1184', picker: '2204' };
export const CHECKED = { admin: ['4809', '1184', '0729'], staff: ['4809', '1184', '0729'], picker: ['4809', '1184', '0729'] };
export const rowsFor = (role) => (role === 'picker' ? ORDERS.filter((r) => !['shipped', 'issues'].includes(queueFor(r, 'admin'))) : ORDERS);

/* ======================================================================================== */
/* CONCEPT A · Queue table + inline pack                                                    */
/* ======================================================================================== */
const actsW = (cap) => (2 + (cap.slip ? 1 : 0) + (cap.labels ? 1 : 0) + (cap.invoice ? 1 : 0) + 1) * 24 + 4;
function colsA(cap) {
  return `20px 116px 50px minmax(90px,1.1fr) ${cap.stockAdj ? '58px ' : ''}minmax(84px,1fr) ${P.trackW(cap)}px ${cap.ful ? '112px ' : ''}84px ${cap.deco ? 140 : 108}px 52px ${actsW(cap)}px`;
}
/** Stock adjustment pill (admin): managed / total lines, green / amber / red, as today's column. */
const stockAdjCell = (r) => {
  const a = stockAdjOf(r);
  return `<span class="cell" style="justify-content:center">${a ? `<span class="bdg ${a.status === 'managed' ? 'ok' : a.status === 'partial' ? 'warn' : 'bad'}" title="Stock adjustment: ${a.managed} of ${a.total} lines managed">${a.managed}/${a.total}</span>` : '<span class="muted">-</span>'}</span>`;
};
/** Fulfilment info (admin, staff): date, carrier, tracking number of the first confirmation, +N for more. */
const fulCell = (r) => {
  const c = confsOf(r), f = c[0];
  if (!f) return `<span class="cell"><span class="muted">-</span></span>`;
  return `<span class="cell col"><span class="ell strong" style="font-size:10.5px">${f.date.split(' · ')[0]}${c.length > 1 ? ` <span class="muted">+${c.length - 1}</span>` : ''}</span><span class="ell muted" style="font-size:10px">${f.carrier} · <span style="color:var(--pri)">${f.no}</span></span></span>`;
};
function rowActsA(r, cap) {
  const a = [];
  if (cap.slip) a.push(P.slipBtn(r));
  if (cap.labels) a.push(P.labelBtn(r));
  if (cap.invoice) a.push(P.invoiceBtn());
  a.push(P.msgBtn(r));
  a.push(`<button class="ib" title="Refresh order from Shopify">${ic('refresh', 'i')}</button>`);
  return a.join('');
}
function rowA(r, role, { open = false, checked = false }) {
  const cap = CAP[role], cx = r.canceled;
  return `<div class="tr${open ? ' open' : ''}${checked ? ' sel' : ''}${cx ? ' cx' : ''} ${P.rowTone(r, role)}" style="--cols:${colsA(cap)};${role === 'picker' ? '--rh:40px' : ''}">
    <span class="ck${checked ? ' on' : ''}"></span>
    <span class="cell col"><span class="cell"><span class="ono${X.lbl(r, cap)}">#${r.no}</span>${X.miniChips(r, cap)}${cx ? '<span class="bdg">Canceled</span>' : ''}</span><span class="muted ell" style="font-size:10px">${r.placed}</span></span>
    <span class="cell">${P.storeChip(r.store)}</span>
    <span class="cell"><b class="ell strong" style="font-size:11.5px">${r.customer}</b></span>
    ${cap.stockAdj ? stockAdjCell(r) : ''}
    <span class="cell">${P.thumbs(r, 3)}<span class="muted tn" style="font-size:10.5px">${totalQty(r)} pcs</span></span>
    ${P.track(r, cap)}
    ${cap.ful ? fulCell(r) : ''}
    ${P.packBar(r)}
    <span class="cell">${P.shortBadge(r, cap)}${X.decoProg(r, cap)}</span>
    <span class="cell">${P.noteFlags(r)}</span>
    <span class="acts">${rowActsA(r, cap)}<button class="ib" title="${open ? 'Collapse' : 'View details'}">${ic(open ? 'chevUp' : 'chevronDown', 'i')}</button></span>
  </div>`;
}
function expandedA(r, role) {
  const cap = CAP[role], boxes = [];
  const lnH = role === 'picker' ? 42 : 34;
  boxes.push(`<div class="bx" style="flex:1 1 0">${P.secHead('package', 'Order items', `<span class="muted tn">${totalQty(r)} pcs · ${packedQty(r)} packed</span>`)}${X.extrasBar(r, cap)}${P.lines(r, cap, { rowH: lnH, skuSub: false, workCol: true })}${cap.ful ? '' : (X.customerNote(r, cap) ? `<div class="in">${X.customerNote(r, cap)}</div>` : '')}</div>`);
  if (cap.pack) boxes.push(`<div class="bx" style="width:${role === 'picker' ? 280 : 200}px;flex:none">${P.secHead('check', 'Packing & slip')}<div class="in">${P.packBox(r, cap, { big: role === 'picker' })}</div></div>`);
  if (cap.ful) boxes.push(`<div class="bx" style="width:250px;flex:none">${P.secHead('truck', 'Fulfilment')}<div class="in">${P.fulBox(r, cap)}${X.customerNote(r, cap)}</div>${cap.cust ? `<div class="hr"></div>${P.secHead('mapPin', 'Customer & shipping')}<div class="in">${P.custBox(r, cap)}</div>` : ''}</div>`);
  return `<div class="xp">${boxes.join('')}</div>`;
}
export function conceptA(role) {
  P.setRole(role);
  const cap = CAP[role], rows = rowsFor(role), focus = FOCUS[role], chk = CHECKED[role];
  const take = role === 'picker' ? 6 : 7;
  const idx = rows.findIndex((r) => r.no === focus);
  // window the list so the open row sits near the top and the bottom is filled
  const start = role === 'admin' ? 3 : Math.max(0, idx - 3), win = rows.slice(start, start + take);
  const body = win.map((r) => rowA(r, role, { open: r.no === focus, checked: chk.includes(r.no) }) + X.underRow(r, cap, P.rowTone(r, role)) + (r.no === focus ? expandedA(r, role) : '')).join('');
  const content = `
    ${P.approvals(role)}
    ${P.toolbar(role, { refreshWarn: role === 'admin' })}
    <div class="qrow">${P.queueTabs(role, 'all')}<div class="r"><span class="muted" style="font-size:10.5px">Sort</span>${P.chip('', 'Newest first', 0)}${cap.labels ? `<button class="btn ghost">${ic('plus', 'i')}New invoice</button>` : ''}<button class="btn ghost">${ic('expand', 'i')}Expand all</button></div></div>
    <div class="card" style="flex:1">
      <div class="thead" style="--cols:${colsA(cap)}"><span class="ck mix"></span><span>${P.sortHead('Order')}</span><span>Store</span><span>${P.sortHead('Customer')}</span>${cap.stockAdj ? '<span style="text-align:center" title="Stock adjustment">Stock adj.</span>' : ''}<span>Items</span>${P.trackHead(cap)}${cap.ful ? '<span>Fulfilment</span>' : ''}<span>Packed</span><span>Deco</span><span>Notes</span><span style="text-align:right">Actions</span></div>
      <div class="tbody">${body}${P.bulkBar(role, 3, false, chk.reduce((a, n) => a + byNo(n).items.filter((x) => x.nameAttr).length, 0))}</div>
      ${P.pager(rows.length)}
    </div>`;
  return shell(role, content, { sub: 'Queue' });
}

/* ======================================================================================== */
/* CONCEPT B · Split queue + inspector                                                       */
/* ======================================================================================== */
export const CSS_B = `
.split2{display:grid;grid-template-columns:448px 1fr;gap:8px;flex:1;min-height:0}
.lst{display:flex;flex-direction:column;min-height:0}
.lh{display:flex;align-items:center;justify-content:space-between;height:28px;padding:0 10px;border-bottom:1px solid var(--bd);background:var(--surf-m);border-radius:var(--rad-card) var(--rad-card) 0 0;flex:none;font-size:9.5px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--tx-s)}
.lb{flex:1;min-height:0;overflow:hidden}
.li{display:grid;grid-template-columns:18px 1fr auto;gap:8px;align-items:center;padding:0 10px;height:var(--lih,54px);border-bottom:1px solid var(--div);position:relative}
.li:hover{background:var(--surf-m)}
.li.cx{color:var(--g400)}
.li.sel{background:var(--pri-soft);box-shadow:inset 0 0 0 1.5px var(--pri)}
.li .l1,.li .l2{display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap}
.li .l2{margin-top:4px;color:var(--tx-s);font-size:10.5px}
.li .rt{display:flex;flex-direction:column;align-items:flex-end;gap:5px}
.insp{display:flex;flex-direction:column;min-height:0}
.ih{padding:9px 12px 8px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;border-bottom:1px solid var(--div);flex:none}
.ih h2{font-size:17px;letter-spacing:-.2px;display:flex;align-items:center;gap:7px}
.ih .sub{margin-top:4px;color:var(--tx-s);font-size:11px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tl{display:flex;flex-direction:column;gap:3px;align-items:flex-start}
.tl .lab{display:flex;gap:0;font-size:8px;font-weight:700;color:var(--tx-s);text-transform:uppercase}.tl .lab span{width:46px}
.ibody{flex:1;min-height:0;overflow:hidden;padding:10px;display:flex;flex-direction:column;gap:8px}
.sbx{border:1px solid var(--bd);border-radius:9px;background:var(--surf);min-width:0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.iact{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-top:1px solid var(--bd);background:var(--surf-m);border-radius:0 0 var(--rad-card) var(--rad-card);flex:none}
.big .step{height:36px;border-radius:9px}.big .step button{width:36px;font-size:18px}.big .step span{min-width:34px;font-size:14px;line-height:34px}
.big .ck{width:22px;height:22px;border-radius:6px}.big .ck.on::after{left:6.5px;top:2px;width:5px;height:10px}
.big .ln{font-size:12.5px}
.kb{display:flex;gap:10px;font-size:10px;color:var(--tx-s);align-items:center}.kb kbd{font:700 9.5px Arial;border:1px solid var(--bd);border-bottom-width:2px;border-radius:4px;padding:0 4px;background:var(--surf);color:var(--tx-m)}
`;
const FOCUS_B = { admin: '1184', staff: '1184', picker: '2204' };
function liB(r, role, sel, checked) {
  const cap = CAP[role];
  return `<div class="li${sel ? ' sel' : ''}${r.canceled ? ' cx' : ''}" style="${role === 'picker' ? '--lih:62px' : ''}">
    <span class="ck${checked ? ' on' : ''}"></span>
    <div style="min-width:0"><div class="l1"><b class="ono${X.lbl(r, cap)}">#${r.no}</b>${P.storeChip(r.store)}${X.miniChips(r, cap)}${r.canceled ? '<span class="bdg">Canceled</span>' : ''}${X.decoProg(r, cap)}</div>
      <div class="l2"><b class="ell" style="color:var(--tx-b);font-weight:600;max-width:120px">${r.customer}</b>${P.thumbs(r, 3)}<span class="tn">${totalQty(r)} pcs</span>${P.shortBadge(r, cap)}</div></div>
    <div class="rt"><span class="muted tn" style="font-size:10px">${r.placed}</span><span class="cell" style="gap:8px">${P.track(r, cap)}${P.packBar(r)}</span></div>
  </div>`;
}
function inspectorB(r, role) {
  const cap = CAP[role], picker = role === 'picker', big = picker ? ' big' : '';
  const nodes = P.stageNodes(cap);
  const tabs = picker
    ? [['Pack', 0, 1], ['Notes & messages', (r.notes || 0) + (r.msgs || 0)]]
    : [['Items & pack', 0, 1], ['Notes & messages', (r.notes || 0) + (r.msgs || 0)], ...(role === 'admin' ? [['Activity']] : [])];
  const side = picker
    ? `<div class="sbx">${P.secHead('mapPin', 'Pick route by bin', `<span class="muted">follow in order</span>`)}${P.pickRoute(r)}</div><div class="two"><div class="sbx">${P.secHead('chat', 'Message to admin')}${P.thread(r, cap)}</div><div class="sbx">${P.secHead('check', 'Packing history')}<div class="in" style="padding:8px"><div class="row-b"><span class="lbl">Notify on confirm</span><span class="ckl"><span class="ck on"></span>Admin</span><span class="ckl"><span class="ck on"></span>Customer service</span></div><div class="hist"><span><b>Packed Wed 14:02</b> · ${packedQty(r)} items</span><button class="ib">${ic('trash', 'i')}</button></div></div></div></div>`
    : `<div class="two"><div class="sbx">${P.secHead('truck', 'Fulfilment')}<div style="padding:8px">${P.fulBox(r, cap, { confirm: false })}</div></div><div class="sbx">${P.secHead('mapPin', 'Customer & shipping')}<div style="padding:8px">${P.custBox(r, cap)}</div></div></div><div class="sbx">${P.secHead('chat', 'Notes & messages', `<span class="muted">${(r.notes || 0) + (r.msgs || 0)}</span>`)}${P.thread(r, cap)}</div>`;
  const acts = picker
    ? `<span class="muted">Tick <b class="strong">Full</b> or enter a partial quantity, then confirm.</span><span style="display:flex;gap:6px">${P.slipText(r, '', 'height:38px')}<button class="btn pri" style="height:38px;font-size:13px;padding:0 16px">${ic('check', 'i')}Confirm packed</button></span>`
    : `<span style="display:flex;gap:6px">${!r.ful ? '' : cap.req === 'direct' ? `<button class="btn ghost">${ic('pencil', 'i')}Edit fulfilment</button><button class="btn dngr">Cancel fulfilment</button>` : `<button class="btn ghost">${ic('userLock', 'i')}Request edit</button><button class="btn dngr">Request cancel</button>`}${cap.pack ? `${P.slipText(r)}${packedQty(r) >= totalQty(r) ? `<span class="bdg ok">${ic('check', 'i10')}All packed</span>` : `<button class="btn soft">${ic('check', 'i')}Confirm packed</button>`}` : ''}</span><span style="display:flex;gap:6px"><button class="btn ghost">${ic('printer', 'i')}Label</button><button class="btn pri">Confirm fulfilment</button></span>`;
  return `<div class="card insp${big}">
    <div class="ih"><div><h2>#${r.no}${P.storeChip(r.store)}${P.shortBadge(r, cap)}${X.closedBadge(r)}${r.canceled ? '<span class="bdg">Canceled</span>' : ''}</h2>
      <div class="sub">${cap.cust ? `<b class="strong">${r.customer}</b><span>·</span>` : ''}<span>${r.placed}</span>${cap.cust ? `<span>·</span><span>${r.addr}</span>` : ''}</div></div>
      <div class="tl"><div class="lab">${nodes.map(([, t]) => `<span>${t}</span>`).join('')}</div>${P.track(r, cap, true)}</div></div>
    <div class="tabs">${tabs.map(([t, n, on]) => `<button class="tab${on ? ' on' : ''}">${t}${n ? `<span class="qn">${n}</span>` : ''}</button>`).join('')}</div>
    <div class="ibody"><div class="sbx" style="overflow:hidden">${X.extrasBar(r, cap)}${P.lines(r, cap, { rowH: picker ? 54 : 38 })}${X.attachmentsStrip(r, cap)}</div>${side}</div>
    <div class="iact">${acts}</div></div>`;
}
export function conceptB(role) {
  P.setRole(role);
  const cap = CAP[role], rows = rowsFor(role), focus = FOCUS_B[role], chk = CHECKED[role];
  const idx = rows.findIndex((r) => r.no === focus), start = role === 'picker' ? Math.max(0, idx - 3) : 0;
  const win = rows.slice(start, start + (role === 'picker' ? 9 : 11));
  const content = `
    ${P.approvals(role)}
    ${P.toolbar(role)}
    <div class="qrow">${P.queueTabs(role, 'all')}<div class="r"><span class="kb"><span><kbd>J</kbd> <kbd>K</kbd> next / prev</span><span><kbd>Enter</kbd> open</span><span><kbd>/</kbd> search</span></span></div></div>
    <div class="split2">
      <div class="card lst"><div class="lh"><span style="display:flex;align-items:center;gap:7px"><span class="ck mix"></span>Orders · ${rows.length}</span><span class="srt">Newest first${ic('sort', 'i10')}</span></div>
        <div class="lb">${win.map((r) => liB(r, role, r.no === focus, chk.includes(r.no))).join('')}</div>${P.pager(rows.length)}</div>
      ${inspectorB(byNo(focus), role)}
    </div>`;
  return shell(role, content, { sub: `#${focus}` });
}

/* ======================================================================================== */
/* CONCEPT C · Inventory-style zoned workspace (violet skin, no page scroll)                */
/* ======================================================================================== */
export const CSS_C = `
.cc .page{gap:6px}
.itabs{display:flex;align-items:center;gap:2px;background:var(--surf);border:1px solid var(--bd);border-radius:10px;padding:3px;box-shadow:var(--shadow);flex:none}
.itab{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--pri);padding:0 9px;height:24px;display:flex;align-items:center;gap:5px;border-radius:6px;white-space:nowrap}
.itab.on{background:var(--pri);color:#fff}
.itabs .sp{flex:1}
.strip{display:grid;background:var(--surf);border:1px solid var(--bd);border-radius:10px;box-shadow:var(--shadow);flex:none;overflow:hidden}
.sg{display:flex;flex-direction:column;gap:2px;text-align:left;padding:6px 12px;border-right:1px solid var(--div);border-bottom:2px solid transparent;min-width:0}
.sg:last-child{border-right:0}.sg.on{border-bottom-color:var(--pri);background:var(--pri-soft)}
.sg .n{font-size:16px;font-weight:700;color:var(--tx);font-variant-numeric:tabular-nums;line-height:1}
.sg .t{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.35px;color:var(--tx-m);white-space:nowrap}
.sg .h{font-size:10px;color:var(--tx-s);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kpis{display:none}
.kp{display:flex;align-items:center;gap:8px;text-align:left;background:var(--surf);border:1px solid var(--bd);border-radius:10px;padding:6px 9px;box-shadow:var(--shadow);min-width:0}
.kp.on{border-color:var(--pri);box-shadow:0 0 0 2px var(--pri-ring)}
.kp .ico{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--h) 12%,#fff);color:var(--h);flex:none}
.kp .n{font-size:17px;font-weight:700;color:var(--tx);font-variant-numeric:tabular-nums;line-height:1}
.kp .t{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.35px;color:var(--tx-m);white-space:nowrap}
.kp .h{font-size:9.5px;color:var(--tx-s);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.grid-c{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);gap:6px;flex:1;min-height:0}
.col{display:flex;flex-direction:column;gap:6px;min-height:0;min-width:0}
.zone{background:var(--surf);border:1px solid var(--bd);border-radius:10px;box-shadow:var(--shadow);display:flex;flex-direction:column;min-height:0;min-width:0}
.zh{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 9px;height:26px;border-bottom:1px solid var(--div);flex:none}
.zh h3{display:flex;align-items:center;gap:5px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--h)}
.zh h3 svg{color:var(--h)}
.zh .mp{background:var(--surf-m);color:var(--tx-m);font-size:9.5px;font-weight:700;border-radius:999px;padding:1px 7px;border:1px solid var(--div)}
.zb2{padding:8px;display:flex;flex-direction:column;gap:6px;min-height:0;overflow:hidden}
.al{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:0 9px;height:34px;border-bottom:1px solid var(--div)}
.al:last-child{border-bottom:0}
.cc .ln.done{background:#f2fbf6}.cc .ln.part{background:#fffbef}
.cc .thead{background:var(--surf-m)}
.cc .qn{background:var(--div)}
.cc .btn.ghost{color:var(--tx-m)}
.cc .appr{border-radius:10px}
.cc .bulk .btn.ghost{color:#e5e7eb}
.zone .thr{padding:6px 8px;gap:5px;overflow:hidden}
`;
const HUE = { queue: '#4b5563', detail: '#4b5563', pack: '#4b5563', ful: '#4b5563', note: '#4b5563', cust: '#4b5563' };
const zone = (icn, t, hue, right, body, style = '') => `<section class="zone" style="--h:${hue};${style}"><div class="zh"><h3>${ic(icn, 'i12')}${t}</h3><span>${right || ''}</span></div>${body}</section>`;
function kpiHint(k, role) {
  const pool = rowsFor(role).filter((r) => queueFor(r, role) === k);
  const rem = pool.reduce((a, r) => a + totalQty(r) - packedQty(r), 0);
  return { topick: `${rem} pcs not on a slip`, notpacked: `${rem} pcs to pack`, picking: `${rem} pcs left to pack`, partial: `${rem} pcs left`, packed: role === 'picker' ? 'fully packed' : 'ready to fulfil', shipped: `${pool.filter((r) => r.trk && r.trk.st === 'Delivered').length} delivered`, issues: '1 approval · 1 canceled · 1 closed' }[k] || '';
}
const KPI_ICON = { topick: 'inbox', notpacked: 'inbox', picking: 'layers', partial: 'layers', packed: 'package', shipped: 'truck', issues: 'userLock' };
const KPI_HUE = { topick: HUE.queue, notpacked: HUE.queue, picking: HUE.pack, partial: HUE.pack, packed: HUE.ful, shipped: '#0369a1', issues: HUE.cust };
function kpisC(role, active) {
  const qs = require_q(role);
  return `<div class="strip" style="grid-template-columns:repeat(${qs.length},1fr)">${qs.map(([k, t]) => `<button class="sg${k === active ? ' on' : ''}"><span style="display:flex;align-items:baseline;gap:7px"><span class="n">${P_count(k, role)}</span><span class="t">${t}</span></span><span class="h">${kpiHint(k, role)}</span></button>`).join('')}</div>`;
}
import { QUEUES, countOf as P_count } from './data.mjs';
const require_q = (role) => QUEUES[role].filter(([k]) => k !== 'all');

function colsC(cap) { return `18px 104px minmax(104px,1fr) ${P.trackW(cap)}px 58px 74px`; }
function rowC(r, role, sel, checked) {
  const cap = CAP[role];
  return `<div class="tr${sel ? ' open' : ''}${r.canceled ? ' cx' : ''}" style="--cols:${colsC(cap)};--rh:30px;${sel ? 'box-shadow:inset 0 0 0 1.5px var(--pri)' : ''}">
    <span class="ck${checked ? ' on' : ''}"></span>
    <span class="cell"><span class="ono${X.lbl(r, cap)}">#${r.no}</span>${P.storeChip(r.store)}</span>
    <span class="cell"><b class="ell" style="font-weight:600">${r.customer}</b>${P.decoMini(r)}${X.miniChips(r, cap)}</span>
    ${P.track(r, cap)}
    ${P.packBar(r).replace('class="pbar"', 'class="pbar" style="width:0;display:none"')}
    <span class="acts">${cap.slip ? P.slipDot(r) : ''}${P.flags(r, cap)}</span>
  </div>`;
}
export function conceptC(role) {
  P.setRole(role);
  const cap = CAP[role], rows = rowsFor(role), focus = FOCUS_C[role], r0 = byNo(focus), chk = CHECKED[role];
  const modules = role === 'picker' ? ['Pick & pack', 'Packed'] : role === 'staff' ? ['Queue', 'Fulfilment', 'Shipped'] : ['Queue', 'Pick & pack', 'Fulfilment'];
  const idx = rows.findIndex((r) => r.no === focus), start = role === 'staff' ? Math.max(0, idx - 2) : 0, win = rows.slice(start, start + 10);
  const matrix = zone('inbox', 'Orders', HUE.queue, `<span class="mp">${rows.length} orders</span>`, `
    <div class="thead" style="--cols:${colsC(cap)};height:24px"><span class="ck mix"></span><span>Order</span><span>Customer</span>${P.trackHead(cap)}<span>Packed</span><span style="text-align:right">Flags</span></div>
    <div class="tbody">${win.map((r) => rowC(r, role, r.no === focus, chk.includes(r.no))).join('')}${P.bulkBar(role, 3, true).replace('bottom:10px', 'bottom:8px')}</div>
    <div class="foot" style="height:26px"><span>1–${Math.min(20, rows.length)} of ${rows.length}${cap.deco ? ' · <b class="strong">E</b> embroidery · <b class="strong">P</b> print' : ''}</span><div class="pager"><span class="on">1</span>${rows.length > 20 ? '<span>2</span>' : ''}</div></div>`, 'flex:1');
  // Shortlist zone: what needs the next hand. Admin/picker: orders whose picking slip is not printed yet. Staff (no slips): packed, waiting to be fulfilled.
  const todo = (cap.slip ? ORDERS.filter((r) => r.slip == null && !r.canceled && !r.ful && packedQty(r) < totalQty(r)) : ORDERS.filter((r) => !r.canceled && !r.ful && packedQty(r) >= totalQty(r))).slice(0, 3);
  const attention = zone(cap.slip ? 'printer' : 'truck', cap.slip ? 'Slip not printed' : 'Ready to fulfil', HUE.queue, `<span class="mp">${todo.length}</span>`, todo.map((r) => `<div class="al"><span class="cell"><b class="ono${X.lbl(r, cap)}">#${r.no}</b>${P.storeChip(r.store)}</span><span class="ell muted">${cap.slip ? totalQty(r) - packedQty(r) + ' pcs to pick' : packedQty(r) + ' pcs packed'}</span><button class="btn xs ${cap.slip ? 'soft' : 'pri'}">${cap.slip ? ic('printer', 'i10') + 'Print slip' : 'Fulfil'}</button></div>`).join(''), 'flex:1;min-width:0;width:100%');
  const notes = zone('chat', 'Notes & messages', HUE.note, `<span class="muted">#${r0.no}</span>`, P.thread(r0, cap), 'flex:1;min-width:0;overflow:hidden');
  const detail = zone('package', `Order #${r0.no}`, HUE.detail, `${P.storeChip(r0.store)} ${P.shortBadge(r0, cap)} ${cap.cust ? `<span class="muted">· ${r0.customer} · ${r0.addr}</span>` : ''}`, `<div style="padding:8px 8px 0;display:flex;align-items:center;justify-content:space-between"><span class="cell" style="gap:10px">${P.track(r0, cap, true)}<span class="muted" style="font-size:10.5px">${r0.placed}</span></span><span class="cell">${P.decoBadges(r0)}${P.flags(r0, cap)}</span></div>${X.extrasBar(r0, cap)}<div style="padding:6px 8px 8px">${P.lines(r0, cap, { rowH: 32, skuSub: false, dense: cap.stock })}</div>${X.attachmentsStrip(r0, cap)}`, 'flex:none');
  const acts = [];
  if (cap.pack) acts.push(zone('check', 'Pack & slip', HUE.pack, '', `<div class="zb2">${P.packBox(r0, cap, { big: role === 'picker' })}</div>`, 'flex:1;min-width:0'));
  if (cap.ful) acts.push(zone('truck', 'Fulfil', HUE.ful, '', `<div class="zb2">${P.fulBox(r0, cap)}</div>`, 'flex:1;min-width:0'));
  if (cap.cust) acts.push(zone('mapPin', 'Customer', HUE.cust, '', `<div class="zb2">${P.custBox(r0, cap)}</div>`, 'flex:.9;min-width:0'));
  if (role === 'picker') acts.push(zone('mapPin', 'Pick route by bin', HUE.cust, '', P.pickRoute(r0), 'flex:1.1;min-width:0'));
  const content = `
    ${P.approvals(role)}
    <div class="itabs">${modules.map((m, i) => `<button class="itab${i === 0 ? ' on' : ''}">${m}</button>`).join('')}<span class="sp"></span></div>
    ${P.toolbar(role)}
    ${kpisC(role, null)}
    <div class="grid-c" style="grid-template-columns:minmax(0,1fr) minmax(0,1.18fr)"><div class="col">${matrix}<div style="display:flex;height:128px;flex:none">${attention}</div></div><div class="col">${detail}<div style="display:flex;gap:6px;flex:none">${acts.join('')}</div>${notes}</div></div>`;
  return shell(role, content, { cls: 'cc', sub: 'Workspace' });
}
