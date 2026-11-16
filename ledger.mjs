/* Round 19 · Concept L1 "Order Ledger": the client's FileMaker order layout (header line, line rows, footer panel),
   in the client's own colours, merged with every FulfilPro feature. 1440 × 900 artboards, role-shaped through CAP.
   Footer widgets, toolbar, popovers and the index notes are in ledger-parts.mjs; sample fields in ledger-data.mjs. */
import * as P from './parts.mjs';
import * as X from './extras.mjs';
import * as D from './designs.mjs';
import * as F from './ledger-parts.mjs';
import { ledgerOf, ledgerSort, money } from './ledger-data.mjs';
import { packHistOf, isShort, shopifyUrl, STORES } from './data.mjs';
const { ic, tile, CAP, totalQty } = P;

/* ---------------- grids (one per role; the title row and every header line share it) ---------------- */
const HC = {
  admin: '40px 62px 44px 62px 46px 124px 136px minmax(90px,1fr) 84px 92px 58px 68px 152px 150px',
  staff: '40px 62px 44px 62px 46px 150px minmax(120px,1fr) 84px 92px 58px 68px 152px 110px',
  picker: '40px 62px 44px 62px 46px minmax(140px,1fr) 150px 110px 160px 92px',
};
const HEAD = {
  admin: ['Date', 'Order #', 'Flags', 'Branch', 'Name', 'Email', 'Ship to', 'PO #', 'Tracking no.', 'Carrier', 'Ship date', 'Documents', ''],
  staff: ['Date', 'Order #', 'Flags', 'Branch', 'Name', 'Ship to', 'PO #', 'Tracking no.', 'Carrier', 'Ship date', 'Documents', ''],
  picker: ['Date', 'Order #', 'Flags', 'Branch', 'Name', 'Items', 'Packed', 'Picking list', ''],
};
const LC = {
  admin: [['tick', '18px'], ['desc', 'minmax(150px,1fr)'], ['sku', '78px'], ['size', '50px'], ['qty', '26px'], ['price', '46px'], ['disc', '30px'], ['total', '52px'], ['sr', '50px'], ['stock', '50px'], ['sup', '112px'], ['packed', '44px'], ['trk', '90px'], ['deco', '116px'], ['part', '62px'], ['st', '58px'], ['ret', '24px'], ['bo', '36px'], ['rem', '96px'], ['act', '20px']],
  staff: [['tick', '18px'], ['desc', 'minmax(150px,1fr)'], ['sku', '78px'], ['size', '50px'], ['qty', '26px'], ['price', '46px'], ['disc', '30px'], ['total', '52px'], ['sr', '50px'], ['stock', '50px'], ['sup', '104px'], ['packed', '44px'], ['trk', '94px'], ['deco', '96px'], ['part', '62px'], ['st', '58px'], ['ret', '24px'], ['bo', '36px'], ['rem', '120px']],
  picker: [['tick', '18px'], ['desc', 'minmax(200px,1fr)'], ['sku', '96px'], ['size', '54px'], ['qty', '34px'], ['packed', '60px'], ['pdate', '90px'], ['part', '72px'], ['st', '66px'], ['rem', '200px']],
};
const LHEAD = { tick: '', desc: 'Description', sku: 'SKU', size: 'Size', qty: 'Qty', price: 'Price', disc: 'Disc', total: 'Total', sr: 'Ship · Ref', stock: 'Avl · Used', sup: 'Supplier · PO', packed: 'Packed', pdate: 'Packed date', trk: 'Tracking', deco: 'Decorator', part: 'Partial', st: 'Status', ret: 'Ret', bo: 'B/O', rem: 'Remark', act: '' };
const LTIP = { sr: 'Shipped quantity · refunded quantity', stock: 'Available in the hub · used (taken out of stock) for this line', ret: 'Stock return', bo: 'Back order', part: 'Partial quantity (Full = the tick at the start of the line)', disc: 'Discount %' };
const CENTER = new Set(['qty', 'disc', 'sr', 'stock', 'packed', 'part', 'st', 'ret', 'bo']);
const RIGHT = new Set(['price', 'total']);

/* ---------------- header line (what a collapsed order shows) ---------------- */
const STAR_T = { paid: 'Fully paid', yellow: 'Unpaid', orange: 'Partly paid, money owing', red: 'Shipped and money still owing', none: 'Canceled' };
function flags(r, l, role) {
  const e = r.items.some((x) => x.deco === 'EMB'), p = r.items.some((x) => x.deco === 'PRT');
  return `<span class="fl">${l.urgent ? `<i class="f-urg" title="Urgent · customer needs it by ${l.urgent}">${ic('zap', 'i10')}</i>` : ''}${l.repeat ? `<i class="f-rep" title="Repeat order: check the last order's remarks">${ic('repeat', 'i10')}</i>` : ''}${l.vip && role !== 'picker' ? `<i class="f-vip" title="VIP customer">${ic('crown', 'i10')}</i>` : ''}${e ? '<i class="f-e" title="Embroidery">E</i>' : ''}${p ? '<i class="f-p" title="Print">P</i>' : ''}</span>`;
}
const seg = (cls, icon, t, on, tip) => `<span class="seg ${cls}"><button title="${tip}">${ic(icon, 'i10')}${t}</button><button class="p${on ? ' on' : ''}" title="${on ? 'Printed · print again' : 'Not printed yet'}">P</button></span>`;
function headCells(r, role, l, open) {
  const cap = CAP[role];
  const ctl = `<span class="hc"><button class="om" data-l1-omit title="Omit: hide this order from the found set (nothing is deleted)">${ic('minusCircle', 'i14')}</button><span class="ck" data-l1-sel title="Select this order"></span></span>`;
  const base = [ctl, `<span class="mn">${l.date}</span>`, `<b class="ono2">#${r.no}</b>`, flags(r, l, role), P.storeChip(r.store),
    `<span class="nm"><b>${r.customer}</b>${cap.cust ? `<button class="eye" title="Open the customer record">${ic('eye', 'i12')}</button>` : ''}</span>`];
  const acts = (list) => `<span class="ha">${list.join('')}<button class="ib" data-l1-exp title="${open ? 'Collapse' : 'Expand'}">${ic(open ? 'chevUp' : 'chevronDown', 'i12')}</button></span>`;
  const notes = `<button class="ib" title="Order's remark / notes">${ic('note', 'i12')}${r.notes ? `<i class="ct">${r.notes}</i>` : ''}</button>`;
  const refresh = `<button class="ib" title="Refresh this order from Shopify">${ic('refresh', 'i12')}</button>`;
  if (role === 'picker') {
    const pq = P.packedQty(r), tq = totalQty(r);
    return [...base,
      `<span class="cell" style="gap:5px">${P.thumbs(r, 3)}<span class="mn" style="font-size:10px">${tq} pcs</span></span>`,
      P.packBar(r),
      l.pickAt ? `<span class="pkd on">${ic('check', 'i10')}Printed ${l.pickAt}</span>` : `<span class="pkd">${ic('printer', 'i10')}Not printed</span>`,
      acts([notes, P.msgBtn(r), refresh])];
  }
  const shipped = l.lines.some((x) => x.shipped > 0);
  const po = l.pos.length ? `<span class="poc" title="Purchase order${l.pos.length > 1 ? 's' : ''} for this order: #${l.pos.join(', #')}">PO #${l.pos[0]}${l.pos.length > 1 ? ` +${l.pos.length - 1}` : ''}</span>`
    : cap.poCreate && !shipped && !r.canceled && !r.closed ? `<button class="poc b" title="Create a purchase order for every line">${ic('cube', 'i10')}PO all items</button>` : '<span class="mute">—</span>';
  const inv = Boolean(r.label || l.ful === 'full');
  const cells = [...base,
    ...(cap.contact ? [`<span class="em"><span>${l.email}</span><button class="mail" title="Email the customer">${ic('mail', 'i10')}</button></span>`] : []),
    `<span class="ell st2" title="${l.shipTo}">${l.shipTo}</span>`, po,
    l.trk && shipped ? `<a class="trn" href="#" title="Track ${l.trk.no}">${l.trk.no}</a>` : '<span class="mute">—</span>',
    `<span class="ell">${l.trk && shipped ? l.trk.carrier : '—'}</span>`,
    `<span class="mn">${l.trk && shipped ? l.trk.at : '—'}</span>`,
    `<span class="docs">${seg('lbl', 'tag', 'Label', r.label, 'Print the shipping label')}${seg('inv', 'receipt', 'Invoice', inv, 'Print the tax invoice')}</span>`];
  const star = `<span class="star s-${l.star}" title="Payment: ${STAR_T[l.star]}">${ic('star', 'i16')}</span>`;
  const list = [star, notes, P.msgBtn(r), cap.track ? X.trackingIcon(r, cap, true) : '', refresh, cap.req === 'direct' ? `<button class="ib del" data-l1-del="${r.no}" title="Delete this order from FulfilPro (Shopify is not changed)">${ic('trash', 'i12')}</button>` : ''];
  return [...cells, acts(list.filter(Boolean))];
}
const headLine = (r, role, open) => `<div class="lg-h h-${ledgerOf(r).head}" style="--hc:${HC[role]}">${headCells(r, role, ledgerOf(r), open).join('')}</div>`;

/* ---------------- line rows ---------------- */
function decoCell(x, cap) {
  if (!x.deco) return '<span class="mute">—</span>';
  const w = x.work || { state: 'unassigned', done: 0 }, admin = cap.deco === 2, on = w.state !== 'unassigned';
  const chip = on ? `<span class="dch${w.state === 'done' ? ' done' : ''}" title="${w.who} · due ${w.due}">${w.state === 'done' ? ic('check', 'i10') : ''}${w.who.split(' ')[0]} · ${w.due.replace(/^\w+ /, '')}</span>` : '<span class="dch un">Unassigned</span>';
  const acts = admin ? `<button class="dx" title="${on ? 'Change the decorator' : 'Assign a decorator'}">${ic('plus', 'i10')}</button><button class="dx" title="Mark decoration done"${w.state === 'done' ? ' disabled' : ''}>${ic('check', 'i10')}</button><button class="dx" title="View decorations"${w.state === 'done' || w.done > 0 ? '' : ' disabled'}>${ic('eye', 'i10')}</button>` : '';
  return `<span class="dc2">${chip}${acts}</span>`;
}
const PO_SHORT = { REQUESTED: 'Requested', PARTIALLY_RECEIVED: 'Part recv.', RECEIVED: 'Received' };
function supCell(r, x, ln, cap) {
  if (x.po && x.po.status !== 'CANCELLED') {
    const p = x.po, sub = p.status === 'RECEIVED' ? `${p.received}/${p.ordered} in` : `${p.received}/${p.ordered} in · ETA ${p.eta}`;
    return `<span class="sup"><span class="pob s-${p.status}" title="Purchase order #${p.no} · ${x.supplier}">#${p.no} ${PO_SHORT[p.status]}</span><span class="eta">${sub}</span></span>`;
  }
  if (ln.shipped >= x.qty) return '<span class="mute">—</span>';
  if (isShort(r, x)) return cap.poCreate ? `<button class="pur" title="Create a purchase order from ${x.supplier}, prefilled with the shortfall">${ic('cube', 'i10')}Purchase</button>` : `<span class="nopo" title="Not covered by stock, no purchase order yet">No PO</span>`;
  return `<span class="ins" title="Covered by hub stock">${ic('check', 'i10')}In stock</span>`;
}
function lineCells(r, x, i, ln, role) {
  const cap = CAP[role], url = cap.shopify ? shopifyUrl(r, x) : '';
  const ticked = role === 'picker' ? x.packed >= x.qty : ln.shipped >= x.qty || (i === 0 && ln.shipped === 0 && x.packed >= x.qty);
  const name = url ? `<a href="${url}" title="Open in Shopify admin · ${STORES[r.store].domain}">${x.name}</a>` : `<b title="${x.name}">${x.name}</b>`;
  const deco = x.deco ? `<span class="bdg ${x.deco === 'EMB' ? 'emb' : 'prt'}" style="height:14px;padding:0 4px">${x.deco}</span>` : '';
  const sub = [P.swatch(x), X.nameChip(x, cap), cap.reqStock ? X.restockLine(x) : '', deco].filter(Boolean).join('');
  const pk = Math.max(x.packed, ln.shipped), done = pk >= x.qty, part = pk > 0 && !done, h = packHistOf(r)[0];
  const pv = role === 'picker' ? (done ? x.qty : x.packed) : ln.shipped >= x.qty ? x.qty : 0;
  return {
    tick: `<span class="ck${ticked ? ' on' : ''}" title="Full: the whole line"></span>`,
    desc: `<span class="ds">${name}<span class="ds-s">${sub}</span></span>`,
    sku: x.sku ? `<button class="a3-sku" title="${x.sku} · click to copy" data-copy="${x.sku}" onclick="event.stopPropagation();a3copy(this)">${x.sku}</button>` : '',
    size: `<span class="sz"><b>${x.size}</b>${tile(x.kind, x.hex, 20)}</span>`,
    qty: `<b class="mn">${x.qty}</b>`,
    price: `<span class="mn">${money(ln.price)}</span>`,
    disc: `<span class="mn${ln.disc ? '' : ' mute'}">${ln.disc ? ln.disc + '%' : '—'}</span>`,
    total: `<b class="mn">${money(ln.total)}</b>`,
    sr: `<span class="sr" title="Shipped ${ln.shipped} · refunded ${ln.refund}"><b>${ln.shipped}</b><span>${ln.refund}</span></span>`,
    stock: `<span class="sk" title="Available ${x.avail} · used ${ln.used}"><b class="${isShort(r, x) ? 'bad' : ''}">${x.avail}</b><span>${ln.used}</span></span>`,
    sup: supCell(r, x, ln, cap),
    packed: `<span class="pk${done ? ' on' : part ? ' part' : ''}" title="${pk} of ${x.qty} packed${pk && h ? ' · ' + h.at : ''}"><i>${ic('package', 'i10')}</i><b class="mn">${pk}/${x.qty}</b></span>`,
    pdate: `<span class="mn">${x.packed > 0 && h ? h.at : '—'}</span>`,
    trk: ln.shipped > 0 && ledgerOf(r).trk ? `<span class="lt2"><a href="#">${ledgerOf(r).trk.no}</a><span>${ledgerOf(r).trk.carrier} · ${ledgerOf(r).trk.at}</span></span>` : '<span class="mute">—</span>',
    deco: decoCell(x, cap),
    part: `<span class="step sm${ticked ? ' dis' : ''}"><button>−</button><span>${pv}</span><button>+</button></span>`,
    st: `<span class="lst s-${ln.status.toLowerCase()}">${ln.status === 'PART' ? `PART ${ln.shipped}/${x.qty}` : ln.status}</span>`,
    ret: `<button class="lb${ln.ret ? ' on' : ''}" title="Stock return${ln.ret ? ': ' + ln.ret : ''}">${ic('corner', 'i10')}</button>`,
    bo: `<button class="lb${ln.bo ? ' on' : ''}" title="Back order${ln.bo ? `: ${ln.bo} to follow` : ''}">${ln.bo ? `B/O ${ln.bo}` : ic('hourglass', 'i10')}</button>`,
    rem: role === 'picker' ? `<span class="rmk${ln.remark ? '' : ' ph'}" title="Line remark">${ln.remark || '—'}</span>` : `<span class="rmk${ln.remark ? '' : ' ph'}" title="Line remark (e.g. where the stock came from)">${ln.remark || 'Remark…'}</span>`,
    act: `<button class="ib" style="width:20px;height:20px" title="Edit or remove the line">${ic('dots', 'i12')}</button>`,
  };
}
function lines(r, role) {
  const cols = LC[role], css = cols.map((c) => c[1]).join(' '), l = ledgerOf(r);
  const src = r.store ? '<span class="src" title="Order source: Shopify store">Online</span>' : '';
  const al = (k) => (CENTER.has(k) ? ' class="c"' : RIGHT.has(k) ? ' class="r"' : '');
  const head = cols.map(([k]) => k === 'tick' ? `<span class="ck${l.lines.every((x, i) => x.shipped >= r.items[i].qty) ? ' on' : ''}" data-l1-lines title="Tick every line (Full)"></span>` : k === 'desc' ? `<span>${src}Description</span>` : `<span${al(k)}${LTIP[k] ? ` title="${LTIP[k]}"` : ''}>${LHEAD[k]}</span>`).join('');
  const rows = r.items.map((x, i) => {
    const ln = l.lines[i], c = lineCells(r, x, i, ln, role);
    return `<div class="ll${ln.tone ? ' t-' + ln.tone : ''}">${cols.map(([k]) => `<span${al(k)}>${c[k]}</span>`).join('')}</div>`;
  }).join('');
  return `<div class="lw" style="--lc:${css}"><div class="llh">${head}</div>${rows}</div>`;
}

/* ---------------- order group + page ---------------- */
function group(r, role, open) {
  const cap = CAP[role];
  return `<div class="lg b-${ledgerOf(r).head}${open ? ' open' : ''}" data-no="${r.no}">${headLine(r, role, open)}${X.underRow(r, cap, '')}<div class="lg-x">${lines(r, role)}${F.footer(r, role)}${F.infoStrip(r, role)}</div></div>`;
}
const OPEN = { admin: ['2204', '4752'], staff: ['2204', '4752'], picker: ['4752', '4821'] };
export function conceptL1(role) {
  P.setRole(role);
  const cap = CAP[role], rows = ledgerSort(D.rowsFor(role));
  const body = rows.map((r) => group(r, role, OPEN[role].includes(r.no))).join('');
  const qty = rows.reduce((a, r) => a + totalQty(r), 0);
  const title = `<div class="l1-th" style="--hc:${HC[role]}"><span style="padding-left:21px"><span class="ck" data-l1-selall title="Select the whole found set (${rows.length} orders), not just this page"></span></span>${HEAD[role].map((t) => `<span>${t}</span>`).join('')}</div>`;
  const content = `
    ${P.approvals(role)}
    ${F.toolbar(role)}
    <div class="qrow">${P.queueTabs(role, 'all')}<div class="r"><span class="fnd"><b data-l1-found2>${rows.length}</b> found · ${qty} pcs</span><button class="fchip" title="Urgent orders always come first"><span class="k">Sort</span><b>Urgent first · Date placed</b>${ic('chevronDown', 'i12')}</button><button class="btn ghost" data-l1-all title="Collapse every order to its header line">${ic('expand', 'i')}<span>Collapse all</span></button>${cap.labels ? `<button class="btn ghost">${ic('plus', 'i')}New invoice</button>` : ''}</div></div>
    ${F.quickRow(role)}
    <div class="l1-card"><div class="l1-scr thin">${title}${body}</div>${P.bulkBar(role, 0, false, null)}${F.bottomBar(role, rows)}</div>
    ${F.popovers(role)}`;
  return D.shell(role, content, { cls: 'l1', sub: 'Ledger' }) + L1_JS;
}
export const ledgerDocs = F.ledgerDocs;

/* ---------------- styles: the client's palette as --fm-* tokens ---------------- */
export const CSS_L1 = `
:root{--fm-brand:#5c44d8;--fm-ink:#482ca0;--fm-lav:#8c74f4;--fm-soft:#ececfc;--fm-plum:#6c1498;--fm-orchid:#cc7cf4;--fm-magenta:#9c20e4;--fm-paid:#b8e874;--fm-ship:#dcf0f8;--fm-shipcell:#3474a0;--fm-part:#b3d1ef;--fm-purch:#e4ccfc;--fm-pick:#f8e0a0;--fm-late:#f4c4c4;--fm-green:#64c878;--fm-done:#70d888;--fm-teal:#74d8c4;--fm-blue:#4c94e0;--fm-sky:#60b4f8;--fm-orange:#ec9c3c;--fm-yellow:#f4d458;--fm-instock:#c8e4ac;--fm-title:#c0c0c0;--fm-tick:#d0d4ec;--fm-prod:#e8fcec;--fm-red:#e44030}
.art.l1{width:1440px;height:900px;--pri:#5c44d8;--pri-h:#482ca0;--pri-soft:#ececfc;--pri-ring:#c9c0f6;--pri-ink:#482ca0;--st:#5c44d8;--canvas:#f0eff8;--bd:#e1def0;--bd-s:#cbc6e2;--div:#efedf7;--surf-m:#f8f7fd}
.l1 .page{position:relative;gap:6px}
.l1 .srch{width:390px}
.l1 .mute{color:#9a96ad}.l1 .mn{font-variant-numeric:tabular-nums}
.fnd{font-size:10.5px;color:var(--tx-m);white-space:nowrap}.fnd b{color:var(--tx)}
/* quick filters + colour legend */
.l1-r{display:flex;align-items:center;gap:5px;flex:none;min-width:0;height:24px}.l1-r .sp{flex:1}
.l1-k{font-size:9px;font-weight:700;letter-spacing:.45px;text-transform:uppercase;color:var(--tx-s);margin-right:1px}
.qp{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 7px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap;border:1px solid var(--q-b,#d9d4f3);background:#fff;color:var(--q-tx,#3b2f86)}
.qp .n{font-size:9px;min-width:15px;height:14px;line-height:14px;text-align:center;border-radius:999px;background:var(--q-n,#ececfc);padding:0 4px}
.qp:hover{background:var(--q-n,#ececfc)}
.qp.on{background:var(--q-on,#5c44d8);border-color:var(--q-on,#5c44d8);color:var(--q-ontx,#fff)}.qp.on .n{background:rgb(255 255 255/.35)}
.q-urg{--q-tx:#b4231a;--q-b:#f4c4c4;--q-n:#fde3e1;--q-on:#c8321f}
.q-todo,.q-so{--q-tx:#735400;--q-b:#ecd577;--q-n:#fbf0c4;--q-on:#f4d458;--q-ontx:#3d2e00}
.q-pp{--q-tx:#8a4b06;--q-b:#f3c48e;--q-n:#fde7cf;--q-on:#ec9c3c;--q-ontx:#3d2400}
.q-prod{--q-tx:#1f6b2d;--q-b:#a9dfb5;--q-n:#e8fcec;--q-on:#64c878;--q-ontx:#0b3a1a}
.q-nopo{--q-tx:#6c1498;--q-b:#e2b8f7;--q-n:#f5e6fd;--q-on:#cc7cf4;--q-ontx:#2e0a47}
.q-rep{--q-on:#6b55e0}.q-vip{--q-tx:#6c1498;--q-b:#d9b3ea;--q-n:#f5e6fd;--q-on:#6c1498}
.lgd{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--tx-m);white-space:nowrap}
.lgd b{font-size:9px;text-transform:uppercase;letter-spacing:.45px;color:var(--tx-s)}
.lgd span{display:inline-flex;align-items:center;gap:4px}
.lgd i,.l1-dc td i{width:16px;height:11px;border-radius:3px;border:1px solid rgb(0 0 0/.18);display:inline-block}
.sw-late{background:#f4c4c4}.sw-paid{background:#b8e874}.sw-ship{background:#dcf0f8}.sw-part{background:#b3d1ef}.sw-purch{background:#e4ccfc}.sw-pick{background:#f8e0a0}.sw-new{background:#fff}
/* ledger card */
.l1-card{flex:1;min-height:0;display:flex;flex-direction:column;background:#fff;border:1px solid var(--bd);border-radius:10px;overflow:hidden;position:relative;box-shadow:var(--shadow)}
.l1-scr{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding-bottom:6px;background:#f6f5fb}
.l1-th{position:sticky;top:0;z-index:4;display:grid;grid-template-columns:var(--hc);column-gap:5px;align-items:center;height:24px;padding:0 14px 0 17px;background:var(--fm-title);color:#262626;font-size:9px;font-weight:700;letter-spacing:.35px;text-transform:uppercase;margin-bottom:5px;white-space:nowrap}
.l1-th>span{overflow:hidden;text-overflow:ellipsis}.l1-th .ck{background:#fff}
.lg{margin:0 6px 4px;border:1px solid #d9d5ec;border-left:4px solid var(--stripe,#c0c0c0);border-radius:7px;background:#fff;overflow:hidden}
/* left border: the order's status in the client's palette (same rule as the header line) */
.b-late{--stripe:#e44030}.b-paid{--stripe:#64c878}.b-ship{--stripe:#60b4f8}.b-part{--stripe:#3474a0}.b-new{--stripe:#c0c0c0}.b-cx,.b-closed{--stripe:#9a96ad}
.lg.open{border-color:#9d90ec;border-left-color:var(--stripe,#c0c0c0);box-shadow:0 0 0 1px #9d90ec,0 4px 14px rgb(72 44 160/.12);margin:7px 7px 9px}
.lg.gone{display:none}.lg:not(.open) .lg-x{display:none}
.lg-h{display:grid;grid-template-columns:var(--hc);column-gap:5px;align-items:center;height:30px;padding:0 7px;font-size:11px;color:#1c1a2b;background:var(--ht,#fff);cursor:pointer;white-space:nowrap}
.lg.open .lg-h{padding:0 6px}
.lg-h>*{min-width:0}.lg-h>.poc,.lg-h>.mute{justify-self:start}
.h-paid{--ht:#b8e874}.h-ship{--ht:#dcf0f8}.h-part{--ht:#b3d1ef}.h-late{--ht:#f4c4c4}.h-new{--ht:#fff}.h-cx,.h-closed{--ht:#eceaf2;color:#6f6b85}
.h-cx .ono2{text-decoration:line-through}
.lg-h .ib,.lg-h .ha .trkic{width:20px;height:20px;color:#3f3b56}.lg-h .ib:hover{background:rgb(0 0 0/.08)}.lg-h .ib.del{color:#c0261a}
.lg-h .ib .ct{background:var(--fm-brand)}
.hc{display:flex;align-items:center;gap:5px}.lg-h .ck{background:#fff}
.om{display:inline-flex;color:#2a2740;width:16px;height:16px;align-items:center;justify-content:center;border-radius:50%}.om:hover{color:#c0261a}
.om svg{width:15px;height:15px}
.lt-sel{display:inline-flex;align-items:center;justify-content:center;width:20px;height:18px;border-radius:4px;background:var(--fm-tick);color:var(--fm-ink)}
.ono2{font-weight:700;font-size:11.5px;font-variant-numeric:tabular-nums}
.fl{display:flex;gap:2px}
.fl i{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:4px;font-style:normal;font-size:8.5px;font-weight:700}
.f-urg{background:#c8321f;color:#fff}.f-rep{background:#6b55e0;color:#fff}.f-vip{background:#6c1498;color:#fff}.f-e{background:#f5f3ff;color:#6d28d9;box-shadow:inset 0 0 0 1px #c4b5fd}.f-p{background:#f0f9ff;color:#0369a1;box-shadow:inset 0 0 0 1px #7dd3fc}
.nm,.em{display:flex;align-items:center;gap:3px;min-width:0}.nm b,.em span{overflow:hidden;text-overflow:ellipsis;min-width:0}
.em span{font-size:10.5px}
.eye{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;color:#3f3b56;flex:none}.eye:hover{background:rgb(0 0 0/.08)}
.mail{width:18px;height:16px;border-radius:4px;background:var(--fm-sky);color:#0c3a66;display:inline-flex;align-items:center;justify-content:center;flex:none}
.st2{font-size:10.5px;color:#3a3750}
.poc{display:inline-flex;align-items:center;gap:3px;height:18px;padding:0 6px;border-radius:4px;background:var(--fm-plum);color:#fff;font-size:9.5px;font-weight:700;max-width:100%;overflow:hidden;white-space:nowrap}
.poc.b{background:#fff;color:var(--fm-plum);box-shadow:inset 0 0 0 1px #c79be0}
.trn{font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;color:#1d3f99;text-decoration:none;overflow:hidden;text-overflow:ellipsis}
.docs{display:flex;gap:4px}
.seg{display:inline-flex;height:20px;border-radius:5px;overflow:hidden;flex:none}
.seg button{display:inline-flex;align-items:center;gap:3px;padding:0 6px;font-size:9.5px;font-weight:700;color:#fff;background:var(--sg)}
.seg button.p{width:20px;justify-content:center;padding:0;background:#fff;color:var(--sg);box-shadow:inset 0 0 0 1.5px var(--sg);border-radius:0 5px 5px 0}
.seg button.p.on{background:var(--sg);color:#fff;box-shadow:inset 1px 0 0 rgb(255 255 255/.5)}
.seg.lbl{--sg:#3a78c2}.seg.inv{--sg:#6c1498}.seg.brand{--sg:#5c44d8;height:24px}.seg.brand button{font-size:10px;padding:0 8px}.seg.brand .p{width:22px;padding:0}
.ha{display:flex;align-items:center;justify-content:flex-end;gap:1px}
.star{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;border:1px solid #cfcbe3;background:#fff;color:#a29eb8;flex:none}
.star svg{width:13px;height:13px}
.star.s-yellow{border-color:#e3c95c;background:#fffbe6}.star.s-yellow svg{fill:#f4d458;stroke:#a88508}
.star.s-orange{border-color:#efb26f;background:#fff4e6}.star.s-orange svg{fill:#ec9c3c;stroke:#9a5a10}
.star.s-red{border-color:#eea097;background:#fdecea}.star.s-red svg{fill:#e44030;stroke:#a3170c}
.star.s-none{opacity:.45}
.pkd{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:#6b6785}.pkd.on{color:#1f6b2d}
.lg .under{padding:3px 10px 3px 14px;background:#faf9ff;border-bottom:0;border-top:1px solid #ebe9f4;min-height:28px}
/* line rows */
.llh{display:grid;grid-template-columns:var(--lc);column-gap:4px;align-items:center;height:20px;padding:0 7px;background:var(--fm-ship);border-top:1px solid #c6dfea;border-bottom:1px solid #c6dfea;font-size:8.5px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:#30434e;white-space:nowrap}
.llh>span{overflow:hidden;text-overflow:ellipsis}
.llh .c,.ll .c{text-align:center;display:flex;justify-content:center}.llh .r,.ll .r{text-align:right;display:flex;justify-content:flex-end}
.src{display:inline-flex;align-items:center;height:14px;padding:0 6px;border-radius:999px;background:var(--fm-teal);color:#0b3b33;font-size:8.5px;margin-right:6px;letter-spacing:0;text-transform:none}
.ll{display:grid;grid-template-columns:var(--lc);column-gap:4px;align-items:center;min-height:32px;padding:2px 7px;border-bottom:1px solid #ebe9f4;font-size:10.5px;color:#22202f;background:var(--lt,#fff)}
.ll>*{min-width:0}
.ll.t-ship{--lt:#dcf0f8;border-bottom-color:#c9e2ed}.ll.t-part{--lt:#b3d1ef;border-bottom-color:#9fbfe0}.ll.t-purch{--lt:#e4ccfc;border-bottom-color:#d4b5f3}
.ds{display:flex;flex-direction:column;gap:2px;min-width:0}
.ds a,.ds b{font-weight:700;font-size:10.5px;color:#1c1a2b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none}
.ds a:hover{text-decoration:underline;color:var(--fm-ink)}
.ds-s{display:flex;align-items:center;gap:4px;font-size:9.5px;color:#55516b;white-space:nowrap;overflow:hidden}
.ll .a3-sku{max-width:100%;background:rgb(255 255 255/.6)}
.sz{display:flex;align-items:center;gap:4px}.sz b{color:var(--fm-magenta);font-size:10px}
.sr,.sk{display:grid;grid-template-columns:1fr 1fr;width:100%;border:1px solid rgb(0 0 0/.13);border-radius:4px;overflow:hidden;background:#fff;height:20px;text-align:center;font-variant-numeric:tabular-nums;font-size:10px}
.sr>*,.sk>*{line-height:18px}.sr>*+*,.sk>*+*{border-left:1px solid rgb(0 0 0/.1);color:#6b6785}
.sk b.bad{color:#c0261a}
.sup{display:flex;flex-direction:column;gap:1px;align-items:flex-start;min-width:0}
.ins{display:inline-flex;align-items:center;gap:3px;height:18px;padding:0 6px;border-radius:4px;background:var(--fm-instock);color:#24461a;font-size:9.5px;font-weight:700}
.pur{display:inline-flex;align-items:center;gap:3px;height:20px;padding:0 7px;border-radius:5px;background:var(--fm-orchid);color:#2e0a47;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px}
.nopo{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:4px;background:#fdecea;color:#b4231a;font-size:9.5px;font-weight:700;box-shadow:inset 0 0 0 1px #f4c4c4}
.pob{display:inline-flex;align-items:center;height:16px;padding:0 5px;border-radius:4px;font-size:9.5px;font-weight:700;background:#f5e6fd;color:var(--fm-plum);box-shadow:inset 0 0 0 1px #dcb4f3;max-width:100%;overflow:hidden;white-space:nowrap}
.pob.s-RECEIVED{background:#e3f6e8;color:#1f6b2d;box-shadow:inset 0 0 0 1px #a9dfb5}
.eta{font-size:9px;color:#55516b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.pk{display:flex;align-items:center;gap:3px}
.pk i{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:4px;box-shadow:inset 0 0 0 1.5px #cdb0e6;color:#b391d4;font-style:normal;flex:none}
.pk.on i{background:var(--fm-magenta);box-shadow:none;color:#fff}.pk.part i{box-shadow:inset 0 0 0 1.5px var(--fm-magenta);color:var(--fm-magenta)}
.pk b{font-size:10px}
.lt2{display:flex;flex-direction:column;font-size:9px;color:#3e4a55;min-width:0;line-height:1.25}.lt2>*{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lt2 a{font:700 9.5px ui-monospace,Menlo,monospace;color:#1d3f99;text-decoration:none}
.dc2{display:flex;align-items:center;gap:2px;min-width:0}
.dch{display:inline-flex;align-items:center;gap:2px;height:16px;padding:0 5px;border-radius:999px;font-size:9.5px;font-weight:700;background:#ececfc;color:#482ca0;box-shadow:inset 0 0 0 1px #d3cbf6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:0 1 auto}
.dch.done{background:#e3f6e8;color:#1f6b2d;box-shadow:inset 0 0 0 1px #a9dfb5}.dch.un{background:#fffbe6;color:#735400;box-shadow:inset 0 0 0 1px #ecd577}
.dx{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;border:1px solid #c9c0f6;color:#482ca0;background:#fff;flex:none}.dx:disabled{opacity:.35;cursor:not-allowed}
.step.sm{height:20px}.step.sm button{width:17px;font-size:12px}.step.sm span{min-width:20px;line-height:18px;font-size:10.5px}
.lst{display:inline-flex;align-items:center;justify-content:center;height:20px;width:100%;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:.3px;white-space:nowrap}
.lst.s-shipped{background:#3474a0;color:#fff}.lst.s-part{background:#fff;color:#1d4a6b;box-shadow:inset 0 0 0 1.5px #3474a0}.lst.s-po{background:#6c1498;color:#fff}.lst.s-packed{background:#9c20e4;color:#fff}.lst.s-new{background:#ececfc;color:#482ca0}
.lb{display:inline-flex;align-items:center;justify-content:center;height:20px;min-width:22px;padding:0 3px;border-radius:4px;box-shadow:inset 0 0 0 1px rgb(0 0 0/.14);background:#fff;color:#55516b;font-size:9px;font-weight:700;white-space:nowrap}
.lb.on{background:#fff4e6;box-shadow:inset 0 0 0 1px #efb26f;color:#8a4b06}
.rmk{display:block;width:100%;height:20px;line-height:18px;padding:0 6px;border:1px solid rgb(0 0 0/.14);border-radius:4px;background:#fff;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#22202f}
.rmk.ph{color:#9a96ad}
/* footer panel */
.lf{display:grid;grid-template-columns:var(--fc);column-gap:8px;padding:6px 8px;background:var(--ft,#fff);border-top:1px solid #d9d5ec}
.f-pick{--ft:#f8e0a0}.f-ship{--ft:#dcf0f8}.f-part{--ft:#b3d1ef}.f-new{--ft:#fff}.f-cx{--ft:#f3f2f8}
.fc{display:flex;flex-direction:column;gap:4px;min-width:0}
.fr2{display:flex;align-items:center;gap:4px;min-width:0}
.fl-t{display:flex;align-items:center;gap:4px;font-size:9px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#4a4663;height:13px}.fl-t .lnk{margin-left:auto;text-transform:none;letter-spacing:0}
.lt{display:flex;align-items:center;gap:5px;height:24px;padding:0 8px;border-radius:6px;font-size:10.5px;text-align:left;width:100%;white-space:nowrap;overflow:hidden}
.lt b{font-weight:700}.lt .lt-d{margin-left:auto;font-size:9px;font-weight:700;overflow:hidden;text-overflow:ellipsis}
.lt.prod{background:var(--fm-prod);color:#2f7a3c;box-shadow:inset 0 0 0 1px #bfe8c8}.lt.prod.on{background:var(--fm-green);color:#0b3a1a;box-shadow:none}
.lt.pp{background:var(--fm-orange);color:#3d2400}.lt.pp.on{background:var(--fm-green);color:#0b3a1a}
.lt.ro{cursor:default}
.fb{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;padding:0 7px;border-radius:6px;font-size:10px;font-weight:700;white-space:nowrap;flex:1;min-width:0;overflow:hidden}
.fb.ink{background:var(--fm-ink);color:#fff;width:100%;flex:none}
.fb.br{background:var(--fm-brand);color:#fff}.fb.br:hover{background:var(--fm-ink)}
.fb.gh{background:#fff;color:#3b2f86;box-shadow:inset 0 0 0 1px #cfc8f2}.fb.gh:hover{background:#f6f4ff}
.fb:disabled{opacity:.5;cursor:not-allowed}
.ful .fb{padding:0 5px;font-size:9.5px}.ful .fr2>.fb:first-child{flex:1.3}
.fb .cnt{font-style:normal;background:#9a5a10;color:#fff;border-radius:999px;font-size:8.5px;padding:0 4px;line-height:12px}.fb .cnt.b{background:var(--fm-brand)}
.fb .dot{width:6px;height:6px;border-radius:50%;background:#f4d458;display:inline-block}
.tg{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;padding:0 7px;border-radius:6px;font-size:10px;font-weight:700;white-space:nowrap;background:var(--fm-soft);color:#3b2f86;box-shadow:inset 0 0 0 1px #d9d4f3;flex:1;min-width:0}
.tg.lines{background:#6498f8;color:#0d2a66;box-shadow:none}
.tg.add{background:#fff;color:var(--fm-ink);box-shadow:inset 0 0 0 1px #b7aaf5}
.tg.urg.on{background:#c8321f;color:#fff;box-shadow:none}.tg.rep.on{background:#6b55e0;color:#fff;box-shadow:none}
.tg-d{font-size:9px;margin-left:2px;opacity:.92}.tg.ro{cursor:default}
.stp-d{font-size:9.5px;color:#4a4663;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-flex;align-items:center;gap:3px;min-width:0}
.tt{display:grid;grid-template-columns:1fr auto;gap:0 8px;font-size:10px;line-height:12.6px;color:#3a3750}
.tt dd{text-align:right;font-variant-numeric:tabular-nums;color:#1c1a2b}.tt .neg{color:#c0261a}.tt .muted{font-size:9px}
.tt .b{font-weight:700;color:#1c1a2b;border-top:1px solid rgb(0 0 0/.14);padding-top:1px;margin-top:1px}
.pay{display:grid;grid-template-columns:1fr 22px;gap:4px;align-content:start}
.pbx{border:1.5px solid #a59cec;border-radius:7px;background:#fff;padding:2px 7px;display:flex;flex-direction:column;font-size:10px}
.pr{display:flex;justify-content:space-between;gap:6px;line-height:13px;font-variant-numeric:tabular-nums;white-space:nowrap}
.pr.ok b{color:#1f6b2d;text-transform:uppercase;font-size:9px;letter-spacing:.3px}
.pr.rf span:first-child{color:#c0261a}.pr.net b:first-child{font-size:9px;text-transform:uppercase;letter-spacing:.3px}
.pr.ow{color:#55516b}.pr.ow.due{color:#c0261a;font-weight:700}
.pside{display:flex;flex-direction:column;gap:3px;align-items:center}.pside .star{width:22px;height:22px}.pside .ib{width:22px;height:22px}
.pm{grid-column:1/-1;display:flex;align-items:center;gap:6px}
.mth{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:5px;background:var(--fm-green);color:#0b3a1a;font-size:10px;font-weight:700}
.fu{display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:700;color:#9a5a10}
.steps{display:flex}
.stp{flex:1;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:2px;height:22px;padding:0 5px 0 8px;margin-left:-3px;background:#e4e4e4;color:#2a2740;font-size:9px;font-weight:700;white-space:nowrap;overflow:hidden;clip-path:polygon(0 0,calc(100% - 7px) 0,100% 50%,calc(100% - 7px) 100%,0 100%,7px 50%)}
.stp:first-child{margin-left:0;padding-left:6px;clip-path:polygon(0 0,calc(100% - 7px) 0,100% 50%,calc(100% - 7px) 100%,0 100%);border-radius:5px 0 0 5px}
.stp.done{background:var(--fm-done);color:#0b3a1a}.stp.act{background-image:linear-gradient(0deg,var(--fm-brand) 2px,transparent 2px)}
.dv{display:flex;align-items:center;gap:6px;height:22px;border:1px solid #cfc8f2;border-radius:5px;background:#fff;padding:0 6px;font-size:10px;min-width:0}
.dv-l{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#6b6785;white-space:nowrap}
.dv-v{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1c1a2b;font-weight:700;font-size:10px}
.dv-v.ph{color:#9a96ad;font-weight:400}
.fc>.dv-v{display:flex;align-items:center;flex:none;border:1px solid #cfc8f2;border-radius:5px;background:#fff;padding:0 6px}
.mk-g{display:grid;grid-template-columns:1fr 1fr;gap:1px 6px}
.mk{display:inline-flex;align-items:center;gap:5px;height:17px;font-size:10px;color:#2a2740;white-space:nowrap;text-align:left}
.mk .ck{width:12px;height:12px}.mk.vip{font-weight:700;color:var(--fm-plum)}
.li{display:flex;align-items:center;gap:8px;height:24px;padding:0 9px;border-top:1px solid #e3e0f0;background:#fbfaff;font-size:10px;color:#3a3750;white-space:nowrap;overflow:hidden}
.li>span{display:inline-flex;align-items:center;min-width:0}
.li b{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#6b6785;margin-right:5px}
.li .is-n{overflow:hidden;text-overflow:ellipsis;display:block;flex:0 1 auto}
.li .sep{width:3px;height:3px;border-radius:50%;background:#b7b2cc;flex:none}.li .sp{flex:1}
/* bottom bar */
.lbar{display:flex;align-items:center;gap:14px;height:34px;padding:0 10px;background:linear-gradient(90deg,#644cec,#5840d4);color:#fff;font-size:10.5px;flex:none;white-space:nowrap}
.lbar .tp{display:flex;align-items:baseline;gap:6px}.lbar .tp span{font-size:9px;text-transform:uppercase;letter-spacing:.45px;opacity:.85}.lbar .tp b{font-size:13.5px;font-variant-numeric:tabular-nums}
.pmx{display:flex;align-items:center;gap:13px;padding-left:12px;border-left:1px solid rgb(255 255 255/.25)}.pmx .k{font-size:8.5px;text-transform:uppercase;letter-spacing:.45px;opacity:.8;width:52px;white-space:normal;line-height:1.1}
.pmx span{display:flex;flex-direction:column;line-height:1.15}.pmx i{font-style:normal;font-size:8.5px;text-transform:uppercase;letter-spacing:.3px;opacity:.85}.pmx b{font-size:10.5px;font-variant-numeric:tabular-nums}
.lbar .sp{flex:1}
.lb-b{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:6px;background:rgb(255 255 255/.14);color:#fff;font-size:10px;font-weight:700;box-shadow:inset 0 0 0 1px rgb(255 255 255/.35)}.lb-b:hover{background:rgb(255 255 255/.24)}
.pg{display:flex;align-items:center;gap:6px}.pg b{font-variant-numeric:tabular-nums}
.lbar .pgsz{background:rgb(255 255 255/.14);color:#fff;border-color:rgb(255 255 255/.35)}.lbar .pgsz option{color:#111}
.pgb{min-width:20px;height:20px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-weight:700}.pgb.on{background:#fff;color:var(--fm-brand)}
.l1-card .bulk{display:none;bottom:44px}.l1-card.has-sel .bulk{display:flex}
/* popovers, dialog, toast */
.l1-pop{position:absolute;z-index:30;display:none;background:#fff;border:1px solid #cfc8f2;border-radius:10px;box-shadow:0 18px 44px rgb(40 24 120/.25),0 3px 8px rgb(40 24 120/.12);font-size:11px;color:var(--tx-b)}
.l1-pop.on{display:flex}.l1-pop.sync{top:44px;right:92px;gap:8px;padding:8px}.l1-pop.sm{width:268px;flex-direction:column}
.sy{width:236px;border:1px solid #ddd8f6;border-radius:8px;overflow:hidden;display:flex;flex-direction:column}
.sy-h{background:var(--fm-brand);color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.45px;padding:5px 9px}
.sy-b{display:flex;flex-direction:column;gap:6px;padding:8px}
.inp.di{justify-content:space-between;gap:6px;flex:1;height:24px}.inp.di.ph{color:#9a96ad}
.sy-go{display:flex;align-items:center;gap:6px;height:26px;padding:0 9px;border-radius:6px;background:#e3f6e8;color:#1f6b2d;font-weight:700;font-size:10.5px;box-shadow:inset 0 0 0 1px #a9dfb5}
.run{display:inline-flex;align-items:center;justify-content:center;flex:1;height:24px;border-radius:6px;background:var(--fm-orange);color:#3d2400;font-weight:700;font-size:10px}
.pp-h{display:flex;align-items:center;justify-content:space-between;padding:7px 9px;border-bottom:1px solid #efedf7}.pp-h b{display:inline-flex;align-items:center;gap:5px;font-size:11.5px}
.pp-b{display:flex;flex-direction:column;gap:7px;padding:9px}
.pp-f{display:flex;gap:6px;padding:7px 9px;border-top:1px solid #efedf7;background:#f8f7fd;border-radius:0 0 10px 10px}
.segs{gap:0;border:1px solid #cfc8f2;border-radius:6px;overflow:hidden}.segs button{flex:1;height:24px;font-size:10px;font-weight:700;color:#3b2f86}.segs button+button{border-left:1px solid #cfc8f2}.segs .on{background:var(--fm-brand);color:#fff}
.l1-scrim{position:absolute;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:rgb(28 20 70/.35)}.l1-scrim.on{display:flex}
.l1-toast{position:absolute;left:50%;bottom:54px;transform:translateX(-50%);z-index:35;display:none;align-items:center;gap:10px;background:#1f1a3d;color:#fff;border-radius:10px;padding:7px 8px 7px 12px;font-size:11px;box-shadow:0 10px 26px rgb(0 0 0/.25);white-space:nowrap}
.l1-toast.on{display:flex}.l1-toast button{color:#c9c0f6;font-weight:700;padding:2px 6px;border-radius:5px}.l1-toast button:hover{background:rgb(255 255 255/.1)}
/* index.html notes */
.l1-doc{margin:14px 60px 0;display:flex;flex-direction:column;gap:12px}
.l1-dc{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;font-size:11.5px;color:#374151;line-height:1.45}
.l1-dc h3{font-size:13px;color:#111827;margin-bottom:8px}
.l1-dc table{width:100%;border-collapse:collapse}.l1-dc th,.l1-dc td{padding:5px 8px;border-bottom:1px solid #f3f4f6;text-align:left;vertical-align:top}
.l1-dc th{background:#f9fafb;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280}
.l1-dc td i{width:26px;height:16px;border-radius:4px}
.l1-dc .q{font-size:9.5px;font-weight:700;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:999px;padding:0 6px;margin-left:4px;white-space:nowrap}
.dc{font-size:10px;font-weight:700;border-radius:999px;padding:1px 8px;white-space:nowrap;border:1px solid}
.dc.new{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.dc.merged{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}.dc.removed{background:#fef2f2;color:#b91c1c;border-color:#fecaca}.dc.mix{background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe}
.l1-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.l1-dc ul,.l1-dc ol{margin-left:18px;line-height:1.55}
.l1-dn{display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap;font-size:11.5px}.l1-dn>b{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;width:70px;flex:none}
.l1-dn>span:not(.l1-st){flex:1;min-width:0}
.l1-st{display:inline-flex;align-items:center;gap:5px;margin-right:10px}
.rm td.y{color:#047857;font-weight:700;text-align:center}.rm td.n{color:#9ca3af;text-align:center}.rm th:not(:first-child){text-align:center;width:120px}
.l1-dc code{font-size:10.5px}
`;

/* ---------------- interactions (one script, safe to include once per artboard) ---------------- */
export const L1_JS = `<script>(function(){if(window.__l1)return;window.__l1=1;
window.a3copy=window.a3copy||function(b){try{navigator.clipboard&&navigator.clipboard.writeText(b.dataset.copy)}catch(e){}var t=b.textContent;b.classList.add('ok');b.textContent='Copied';setTimeout(function(){b.classList.remove('ok');b.textContent=t},1200)};
var Q=function(e,s){return e.querySelector(s)},QA=function(e,s){return Array.prototype.slice.call(e.querySelectorAll(s))};
function art(e){return e.closest('.art')}
function close(a){QA(a||document,'.l1-pop.on,.l1-scrim.on').forEach(function(p){p.classList.remove('on')})}
var undo=null,timer=null;
function toast(a,msg,fn){var t=Q(a,'.l1-toast');Q(t,'[data-l1-tmsg]').textContent=msg;t.classList.add('on');undo=fn;clearTimeout(timer);timer=setTimeout(function(){t.classList.remove('on');undo=null},6000)}
function found(a,d){QA(a,'[data-l1-found],[data-l1-found2]').forEach(function(e){e.textContent=+e.textContent+d})}
function bulk(a){var n=QA(a,'.lg:not(.gone) .lg-h .ck.on').length,c=Q(a,'.l1-card'),all=Q(a,'[data-l1-selall]');c.classList.toggle('has-sel',n>0);var b=Q(c,'.bulk b');if(b)b.textContent=(all&&all.classList.contains('on')?Q(a,'[data-l1-found2]').textContent+' selected · whole found set':n+' selected')}
function setOpen(g,o){g.classList.toggle('open',o);var b=Q(g,'.lg-h [data-l1-exp]');if(b){b.title=o?'Collapse':'Expand';b.innerHTML=o?'<svg class="i12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7-7 7 7"/></svg>':'<svg class="i12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"/></svg>'}}
var opener=null;
document.addEventListener('click',function(e){var t=e.target,a=art(t),b,g;if(!a||!a.classList.contains('l1'))return;
  if((b=t.closest('[data-l1-pop]'))){e.preventDefault();var p=Q(a,'#'+b.dataset.l1Pop);if(!p)return;var was=p.classList.contains('on');close(a);if(was)return;opener=b;p.classList.add('on');
    if(!p.hasAttribute('data-fixed')){var pg=Q(a,'.page'),r=b.getBoundingClientRect(),q=pg.getBoundingClientRect(),k=(+(a.dataset.z||100))/100,l=(r.left-q.left)/k,tp=(r.bottom-q.top)/k+4;
      if(tp+p.offsetHeight>pg.clientHeight-8)tp=(r.top-q.top)/k-p.offsetHeight-4;p.style.left=Math.max(6,Math.min(l,pg.clientWidth-p.offsetWidth-6))+'px';p.style.top=tp+'px'}return}
  if((b=t.closest('[data-l1-urg]'))&&opener){var u=opener.classList.contains('urg')?opener:null;if(u){var on=b.dataset.l1Urg==='on';u.classList.toggle('on',on);var d=Q(u,'.tg-d');if(on&&!d){u.insertAdjacentHTML('beforeend','<span class="tg-d">03/11</span>')}if(!on&&d)d.remove()}}
  if(t.closest('[data-l1-close]')){close(a);return}
  if(t.closest('.l1-pop')||(t.closest('.l1-scrim')&&!t.closest('[data-l1-delok]')&&t.closest('.dlg')))return;
  if(t.classList.contains('l1-scrim')){close(a);return}
  close(a);
  if((b=t.closest('[data-l1-undo]'))){if(undo)undo();Q(a,'.l1-toast').classList.remove('on');return}
  if((b=t.closest('[data-l1-omit]'))){g=b.closest('.lg');g.classList.add('gone');found(a,-1);bulk(a);toast(a,'Order '+Q(g,'.ono2').textContent+' omitted from this found set (not deleted)',function(){g.classList.remove('gone');found(a,1);bulk(a)});return}
  if((b=t.closest('[data-l1-del]'))){var s=Q(a,'.l1-scrim');if(!s)return;Q(s,'[data-l1-delno]').textContent='#'+b.dataset.l1Del;s.dataset.no=b.dataset.l1Del;s.classList.add('on');return}
  if((b=t.closest('[data-l1-delok]'))){var s2=b.closest('.l1-scrim'),g2=Q(a,'.lg[data-no="'+s2.dataset.no+'"]');close(a);if(g2){g2.classList.add('gone');found(a,-1);bulk(a);toast(a,'Order #'+s2.dataset.no+' deleted from FulfilPro · Shopify is unchanged',function(){g2.classList.remove('gone');found(a,1);bulk(a)})}return}
  if((b=t.closest('[data-l1-selall]'))){var on2=!b.classList.contains('on');b.classList.toggle('on',on2);QA(a,'.lg:not(.gone) .lg-h .ck').forEach(function(c){c.classList.toggle('on',on2)});bulk(a);return}
  if((b=t.closest('[data-l1-sel]'))){b.classList.toggle('on');var sa=Q(a,'[data-l1-selall]');if(sa)sa.classList.remove('on');bulk(a);return}
  if((b=t.closest('[data-l1-lines]'))){g=b.closest('.lg');var cks=QA(g,'.ll .ck'),allOn=cks.every(function(c){return c.classList.contains('on')});cks.forEach(function(c){c.classList.toggle('on',!allOn)});var hk=Q(g,'.llh .ck');if(hk)hk.classList.toggle('on',!allOn);if(!g.classList.contains('open'))setOpen(g,true);return}
  if((b=t.closest('.lg-h .ck,.ll .ck'))){b.classList.toggle('on');return}
  if((b=t.closest('[data-l1-all]'))){var gs=QA(a,'.lg:not(.gone)'),any=gs.some(function(x){return x.classList.contains('open')});gs.forEach(function(x){setOpen(x,!any)});Q(b,'span').textContent=any?'Expand all':'Collapse all';b.title=any?'Open every order':'Collapse every order to its header line';return}
  if((b=t.closest('[data-l1-exp]'))||(t.closest('.lg-h')&&!t.closest('button,a,.ck,input,select'))){g=t.closest('.lg');setOpen(g,!g.classList.contains('open'));return}
  if((b=t.closest('[data-l1-pp]'))){var on3=!b.classList.contains('on');b.classList.toggle('on',on3);Q(b,'.lt-d').textContent=on3?'Packed 30/10 14:20':'Not actioned';return}
  if((b=t.closest('[data-l1-lines-show]'))){g=b.closest('.lg');var sh=QA(g,'.ll.t-ship'),hid=sh.length&&sh[0].style.display!=='none';sh.forEach(function(x){x.style.display=hid?'none':''});var n=QA(g,'.ll').length;b.lastChild.textContent='Lines '+(hid?n-sh.length:n)+'/'+n;b.classList.toggle('on',!hid);return}
  if((b=t.closest('[data-l1-step]'))){var wrap=b.closest('.dsg');b.classList.toggle('done');QA(wrap,'.stp').forEach(function(x){x.classList.toggle('act',x===b)});var v=Q(wrap,'[data-l1-dvv]');Q(wrap,'[data-l1-dvl]').textContent=b.dataset.lab;v.textContent=b.dataset.val||b.dataset.ph;v.classList.toggle('ph',!b.dataset.val);return}
  if((b=t.closest('[data-l1-mk]'))){var k=b.dataset.l1Mk,box=b.closest('.mk-g');var on4=!b.classList.contains('on');if(k==='all'&&box){QA(box,'[data-l1-mk]:not([data-l1-mk=vip])').forEach(function(x){x.classList.toggle('on',on4);Q(x,'.ck').classList.toggle('on',on4)})}else{b.classList.toggle('on',on4);Q(b,'.ck').classList.toggle('on',on4);if(box){var al=Q(box,'[data-l1-mk=all]'),every=QA(box,'[data-l1-mk]:not([data-l1-mk=all]):not([data-l1-mk=vip])').every(function(x){return x.classList.contains('on')});al.classList.toggle('on',every);Q(al,'.ck').classList.toggle('on',every)}}return}
  if((b=t.closest('[data-l1-tog]'))){b.classList.toggle('on');return}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
})();</script>`;
