/* Round 20 · Concept L2 "Order Ledger, exact positions".
   Client feedback on L1: "Whatever is in a particular position must remain in that exact position."
   Every object of the client's FileMaker order block is placed from a position spec measured off
   client-qa/client-old-system.png (2988 px at 2× = 1494 pt wide): x and width in FileMaker points, drawn as a
   percentage of the block width, so the layout matches at any width. Font sizes, control heights, spacing and
   colours are L1's (same classes); only placement follows FileMaker. FulfilPro extras take the slot of a control
   the client dropped, or sit in empty space. Sample data: ledger-data.mjs (as L1). */
import * as P from './parts.mjs';
import * as X from './extras.mjs';
import * as D from './designs.mjs';
import * as F from './ledger-parts.mjs';
import { ledgerOf, ledgerSort, money } from './ledger-data.mjs';
import { packHistOf, isShort, shopifyUrl, STORES, stockAdjOf, confsOf } from './data.mjs';
import { decoStrip, lessDeco, L1_JS } from './ledger.mjs';
import { P as ICONS } from './chrome-base.mjs';
const { ic, tile, CAP, totalQty, packedQty } = P;
Object.assign(ICONS, { bars: 'M5 7h14 M5 12h14 M5 17h14' });

/* ---------------- placement ---------------- */
const PT = 1494; // FileMaker layout width in points
const pct = (n) => `${((n / PT) * 100).toFixed(3)}%`;
/** One positioned object. x, w in FileMaker points; top / h in px inside the band (L1's vertical rhythm). */
const o = (x, w, inner, { cls = '', top = null, h = null, title = '', attrs = '' } = {}) =>
  `<div class="o${cls ? ' ' + cls : ''}" data-p="${x},${w}" style="left:${pct(x)};width:${pct(w)}${top != null ? `;top:${top}px` : ''}${h != null ? `;height:${h}px` : ''}"${title ? ` title="${title}"` : ''}${attrs}>${inner}</div>`;
const R = [6, 34, 62]; // footer rows r1 / r2 / r3 (L1: 6px padding, 24px rows, 4px gaps)
const fr = (row, x, w, inner, opt = {}) => o(x, w, inner, { top: R[row - 1], h: 24, ...opt });
const fld = (txt, cls = '') => `<span class="f2${cls ? ' ' + cls : ''}">${txt}</span>`;
const two = (a, b) => `<span class="two"><span>${a}</span><span>${b}</span></span>`;

/* ---------------- title row (FileMaker label positions) ---------------- */
const TITLE = {
  admin: [[105, 52, 'Order<br>date'], [162, 55, 'Order #'], [222, 106, 'Name'], [368, 142, 'Email'], [538, 42, 'Branch'], [585, 303, 'Address'], [891, 63, 'PO #'], [958, 97, 'Tracking<br>number'], [1058, 92, 'Shipment<br>company'], [1153, 90, 'Shipment<br>date']],
  staff: [[105, 52, 'Order<br>date'], [162, 55, 'Order #'], [222, 106, 'Name'], [538, 42, 'Branch'], [585, 303, 'Address'], [891, 63, 'PO #'], [958, 97, 'Tracking<br>number'], [1058, 92, 'Shipment<br>company'], [1153, 90, 'Shipment<br>date']],
  picker: [[105, 52, 'Order<br>date'], [162, 55, 'Order #'], [222, 106, 'Name'], [538, 42, 'Branch'], [585, 303, 'Items · packed · picking list']],
};
function titleRow(role, n) {
  return `<div class="l2t">${o(25, 20, `<span class="ck" data-l1-selall title="Select the whole found set (${n} orders), not just this page"></span>`, { cls: 'c' })}${TITLE[role].map(([x, w, t]) => o(x, w, `<span>${t}</span>`)).join('')}</div>`;
}

/* ---------------- header line ---------------- */
const seg = (cls, icon, t, on, tip) => `<span class="seg ${cls}"><button title="${tip}">${icon ? ic(icon, 'i10') : ''}${t}</button><button class="p${on ? ' on' : ''}" title="${on ? 'Printed · print again' : 'Not printed yet'}">P</button></span>`;
function headLine(r, role, open) {
  const cap = CAP[role], l = ledgerOf(r), pk = role === 'picker';
  const shipped = l.lines.some((x) => x.shipped > 0), H = [];
  H.push(o(7, 12, `<button class="om" data-l1-omit title="Omit: hide this order from the found set (nothing is deleted)">${ic('minusCircle', 'i14')}</button>`, { cls: 'c' }));
  H.push(o(25, 20, `<span class="ck" data-l1-sel title="Select this order and all its lines"></span>`, { cls: 'c' }));
  const fl = [l.urgent && `<i class="f-urg" title="Urgent · customer needs it by ${l.urgent}">${ic('zap', 'i10')}</i>`, l.repeat && `<i class="f-rep" title="Repeat order">${ic('repeat', 'i10')}</i>`, l.vip && !pk && `<i class="f-vip" title="VIP customer">${ic('crown', 'i10')}</i>`].filter(Boolean).slice(0, 2).join('');
  if (fl) H.push(o(71, 32, `<span class="fl">${fl}</span>`));
  H.push(o(105, 52, fld(l.date.slice(0, 6) + l.date.slice(8), 'mn'), { title: l.date }));
  H.push(o(162, 55, fld(`#${r.no}`, 'b ono2')));
  H.push(o(222, 106, fld(r.customer, 'b')));
  if (cap.cust) H.push(o(330, 16, `<button class="eye" title="Open the customer record">${ic('eye', 'i12')}</button>`, { cls: 'c' }));
  if (cap.contact) {
    H.push(o(368, 142, fld(l.email)));
    H.push(o(512, 20, `<button class="mail" title="Email the customer">${ic('mail', 'i10')}</button>`, { cls: 'c' }));
  }
  H.push(o(538, 42, P.storeChip(r.store)));
  if (pk) {
    H.push(o(585, 303, `<span class="pks">${P.thumbs(r, 3)}<span class="mn">${totalQty(r)} pcs</span>${P.packBar(r)}${l.pickAt ? `<span class="pkd on">${ic('check', 'i10')}Printed ${l.pickAt}</span>` : `<span class="pkd">${ic('printer', 'i10')}Not printed</span>`}</span>`));
  } else {
    H.push(o(585, 303, fld(l.shipTo), { title: l.shipTo }));
    const po = l.pos.length ? `<span class="poc" title="Purchase order${l.pos.length > 1 ? 's' : ''} #${l.pos.join(', #')}">PO #${l.pos[0]}${l.pos.length > 1 ? ` +${l.pos.length - 1}` : ''}</span>`
      : cap.poCreate && !shipped && !r.canceled && !r.closed ? `<button class="poc" title="Create a purchase order for every line">PO all items</button>` : '';
    if (po) H.push(o(891, 63, po));
    const tk = l.trk && shipped;
    H.push(o(958, 97, `${fld(tk ? `<a class="trn" href="#">${l.trk.no}</a>` : '', 'grow')}${cap.track && tk ? X.trackingIcon(r, cap, true) : ''}`));
    H.push(o(1058, 92, fld(tk ? l.trk.carrier : '')));
    H.push(o(1153, 90, `${fld(tk ? l.trk.at : '', 'mn grow')}${cap.ful && tk ? `<button class="ib pen" title="${cap.req === 'direct' ? 'Edit fulfilment' : 'Request a fulfilment edit'}">${ic('pencil', 'i10')}</button>` : ''}`));
    if (cap.labels) H.push(o(1249, 63, seg('lbl', '', 'Label', r.label, 'Print the shipping label')));
    if (cap.invoice) H.push(o(1316, 81, seg('inv', '', 'Tax invoice', Boolean(r.label || l.ful === 'full'), 'Print the tax invoice')));
  }
  const off = P.msgOff(r);
  H.push(o(1402, 63, `<button class="msgb"${off ? ' disabled title="Messages are closed for this order"' : ' title="Messages about this order (in place of Task / Problem)"'}>Messages</button>${r.msgs ? `<i class="msgc">${r.msgs}</i>` : ''}`));
  if (cap.req === 'direct') H.push(o(1468, 22, `<button class="ib del" data-l1-del="${r.no}" title="Delete this order from FulfilPro (Shopify is not changed)">${ic('trash', 'i12')}</button>`, { cls: 'c' }));
  return `<div class="lg-h l2h h-${l.head}">${H.join('')}</div>`;
}

/* ---------------- line header + line rows ---------------- */
function lineHead(r, role) {
  const cap = CAP[role], pk = role === 'picker', l = ledgerOf(r);
  const lab = (x, w, t, cls = '') => o(x, w, `<span>${t}</span>`, { cls });
  const L = [o(4, 57, '<span class="src" title="Order source: Shopify store">Online<br>Order</span>'), lab(65, 200, 'Description'), lab(267, 62, 'SKU'), lab(330, 66, 'Size &amp;<br>picture'), lab(397, 25, 'Qty', 'c')];
  if (!pk) L.push(lab(424, 42, 'Price', 'r'), lab(468, 26, 'Disc<br>%', 'c'));
  L.push(lab(496, 45, 'Qty<br>status', 'c'));
  if (!pk) L.push(lab(543, 51, 'Total', 'r'));
  if (cap.stock) L.push(lab(596, 46, 'Stock', 'c'), lab(775, 99, 'Supplier'), lab(876, 34, 'Due<br>date'), lab(912, 46, 'Purchase<br>status', 'tight'));
  L.push(lab(961, 55, 'Packed'));
  if (cap.stockAdj) L.push(lab(1018, 50, 'Stock<br>out'));
  if (cap.ful) L.push(lab(1072, 172, 'Tracking number /<br>company / date &amp; time'));
  L.push(o(1254, 18, `<button class="mnu sm" data-l1-ckall=".ck2" title="Select every line's status (master select)">${ic('bars', 'i10')}</button>`, { cls: 'c' }), lab(1278, 63, 'On time', 'c'));
  if (!pk) L.push(o(1374, 90, `<button class="orm" title="Order notes${r.note ? ' · has a customer note' : ''}">Order's remark${r.notes ? `<i>${r.notes}</i>` : ''}${r.note ? '<b class="dot"></b>' : ''}</button>`));
  L.push(o(1470, 20, `<button class="rfs" title="Refresh this order from Shopify">${ic('refresh', 'i10')}</button>`, { cls: 'c' }));
  return `<div class="llh l2lh">${L.join('')}</div>`;
}
const PO_SHORT = { REQUESTED: 'Requested', PARTIALLY_RECEIVED: 'Part recv.', RECEIVED: 'Received' };
function lineRow(r, x, i, role) {
  const cap = CAP[role], pk = role === 'picker', l = ledgerOf(r), ln = l.lines[i];
  const url = cap.shopify ? shopifyUrl(r, x) : '', h = packHistOf(r)[0];
  const full = pk ? x.packed >= x.qty : ln.shipped >= x.qty;
  const name = url ? `<a href="${url}" title="Open in Shopify admin · ${STORES[r.store].domain}">${x.name}</a>` : `<b title="${x.name}">${x.name}</b>`;
  const w = x.work || { state: 'unassigned', done: 0 }, assigned = w.state !== 'unassigned';
  const dec = x.deco && cap.deco ? `<span class="bdg ${x.deco === 'EMB' ? 'emb' : 'prt'}" style="height:14px;padding:0 4px">${x.deco}</span><span class="dch${w.state === 'done' ? ' done' : assigned ? '' : ' un'}" title="${assigned ? `Decorator ${w.who} · due ${w.due}` : 'No decorator yet'}">${assigned ? w.who.split(' ')[0] : 'Unassigned'}</span>${cap.deco === 2 ? `<button class="dx" title="Assign, mark done or view decorations">${ic('plus', 'i10')}</button>` : ''}` : '';
  const sub = [P.swatch(x), X.nameChip(x, cap), cap.reqStock ? X.restockLine(x) : '', dec].filter(Boolean).join('');
  const pkq = Math.max(x.packed, ln.shipped), pdone = pkq >= x.qty;
  const C = [
    o(7, 12, `<button class="om" title="Omit this line from the view">${ic('minusCircle', 'i12')}</button>`, { cls: 'c' }),
    o(25, 20, `<span class="ck${full ? ' on' : ''}" title="Full: the whole line"></span>`, { cls: 'c' }),
    o(65, 200, `<span class="ds">${name}<span class="ds-s">${sub}</span></span>`),
    o(267, 62, x.sku ? `<button class="a3-sku" title="${x.sku} · click to copy" data-copy="${x.sku}" onclick="event.stopPropagation();a3copy(this)">${x.sku}</button>` : ''),
    o(330, 66, `<span class="sz"><b>${x.size}</b>${tile(x.kind, x.hex, 20)}</span>`),
    o(397, 25, `<b class="mn">${x.qty}</b>`, { cls: 'c' }),
  ];
  if (!pk) C.push(o(424, 42, `<span class="mn">${money(ln.price)}</span>`, { cls: 'r' }), o(468, 26, `<span class="mn${ln.disc ? '' : ' mute'}">${ln.disc ? ln.disc + '%' : ''}</span>`, { cls: 'c' }));
  C.push(o(496, 45, `<span class="sr" title="Shipped ${ln.shipped} · refunded ${ln.refund}"><b>${ln.shipped}</b><span>${ln.refund}</span></span>`, { cls: 'c' }));
  if (!pk) C.push(o(543, 51, `<b class="mn">${money(ln.total)}</b>`, { cls: 'r' }));
  if (cap.stock) {
    const short = isShort(r, x), onPo = x.po && x.po.status !== 'CANCELLED';
    C.push(o(596, 46, `<span class="sk" title="Available ${x.avail} · used ${ln.used}"><b class="${short ? 'bad' : ''}">${x.avail}</b><span>${ln.used}</span></span>`, { cls: 'c' }));
    if (ln.shipped < x.qty) C.push(o(646, 40, short ? '<span class="nopo2" title="Hub stock does not cover this line">Short</span>' : '<span class="ins2" title="Covered by hub stock">In Stock</span>', { cls: 'c' }));
    C.push(o(689, 66, `<button class="pur"${cap.poCreate ? ` title="${onPo ? 'Open purchase order #' + x.po.no : 'Create a purchase order from ' + x.supplier}"` : ' disabled title="Admin only"'}>${ic('cube', 'i10')}Purchase</button>`));
    if (cap.lineEdit) C.push(o(757, 16, `<button class="ib pen" title="Edit the line">${ic('pencil', 'i10')}</button>`, { cls: 'c' }));
    if (onPo) {
      C.push(o(775, 99, two(`<b class="spn">${x.supplier}</b>`, `<span class="spd">#${x.po.no} · 28/10/2026</span>`)));
      C.push(o(876, 34, `<span class="mn">${x.po.status === 'RECEIVED' ? '' : x.po.eta}</span>`));
      C.push(o(912, 46, `<span class="pob s-${x.po.status}" title="PO #${x.po.no}: ${x.po.received}/${x.po.ordered} received">${PO_SHORT[x.po.status]}</span>`));
    }
  }
  C.push(o(961, 32, `<span class="pk${pdone ? ' on' : pkq ? ' part' : ''}" title="${pkq} of ${x.qty} packed${pkq && h ? ' · ' + h.at : ''}"><i>${ic('package', 'i10')}</i></span>`, { cls: 'c' }));
  C.push(o(995, 21, `<span class="qb mn" title="Packed quantity (type a number for a partial pack)">${pkq}</span>`, { cls: 'c' }));
  if (cap.stockAdj) {
    C.push(o(1018, 27, `<button class="lb two-b" title="Take this line out of hub stock">${two('Stock', 'out')}</button>`, { cls: 'c' }));
    C.push(o(1048, 20, `<span class="qb mn">${x.packed >= x.qty ? x.qty : 0}</span>`, { cls: 'c' }));
  }
  if (cap.ful && ln.shipped > 0 && l.trk) {
    C.push(o(1072, 71, `<a class="trn" href="#">${l.trk.no}</a>`), o(1145, 51, `<span class="ell">${l.trk.carrier}</span>`), o(1198, 32, two(l.trk.at.split(' ')[0], l.trk.at.split(' ')[1])));
    C.push(o(1232, 14, `<button class="mail sm" title="Send the tracking to the customer">${ic('mail', 'i10')}</button>`, { cls: 'c' }));
  }
  C.push(o(1254, 18, '<span class="ck ck2" title="Select for a status update"></span>', { cls: 'c' }));
  C.push(o(1278, 63, `<span class="lst s-${ln.status.toLowerCase()}">${ln.status === 'PART' ? `PART ${ln.shipped}/${x.qty}` : ln.status}</span>`, { cls: 'c' }));
  if (!pk) {
    C.push(o(1347, 34, `<button class="lb two-b${ln.ret ? ' on' : ''}" title="Stock return">${two('Stock', 'return')}</button>`, { cls: 'c' }));
    C.push(o(1385, 38, `<button class="lb two-b${ln.bo ? ' on' : ''}" title="Back order${ln.bo ? `: ${ln.bo} to follow` : ''}">${ln.bo ? two('Back', `order ${ln.bo}`) : two('Back', 'order')}</button>`, { cls: 'c' }));
  }
  C.push(o(1427, 38, `<button class="lb${ln.remark ? ' on' : ''}" title="${ln.remark ? 'Line remark: ' + ln.remark : 'Add a line remark'}"${pk ? ' disabled' : ''}>Remark${ln.remark ? '<b class="dot"></b>' : ''}</button>`, { cls: 'c' }));
  if (cap.lineEdit) C.push(o(1470, 18, `<button class="ib del" title="Remove the line">${ic('trash', 'i12')}</button>`, { cls: 'c' }));
  return `<div class="ll l2r${ln.tone ? ' t-' + ln.tone : ''}">${C.join('')}</div>`;
}

/* ---------------- footer panel ---------------- */
const STAR_TIP = { paid: 'Fully paid', yellow: 'Unpaid', orange: 'Partly paid, money owing', red: 'Shipped and money still owing', none: 'Canceled' };
function footer(r, role) {
  const cap = CAP[role], l = ledgerOf(r), pk = role === 'picker', admin = cap.req === 'direct', Fo = [];
  // col A: Production (8) · [Pick to do date slot] Stock out · Pick & Pack (10)
  const prodTxt = l.prod ? l.prod.at : '';
  const prodTip = l.deco ? 'Lit automatically: embroidery, print, setup fee or decoration. Click to record when it went to the decoration room.' : 'No decoration on this order. Click to mark it for production.';
  Fo.push(fr(1, 5, 73, cap.deco === 2 ? `<button class="lt prod l2lt${l.deco ? ' on' : ''}" data-l1-pop="prod-${role}" title="${prodTip}">${prodTxt ? two('<b>Production</b>', `<span class="lt-d">${prodTxt}</span>`) : '<b>Production</b>'}</button>` : `<span class="lt prod l2lt ro${l.deco ? ' on' : ''}" title="${prodTip}">${prodTxt ? two('<b>Production</b>', `<span class="lt-d">${prodTxt}</span>`) : '<b>Production</b>'}</span>`));
  if (cap.stockAdj) { const sa = stockAdjOf(r); Fo.push(fr(2, 5, 73, `<button class="lt sto l2lt s-${sa ? sa.status : 'none'}" title="Stock out (stock adjustment, in place of Pick to do date): lines whose packed quantity is taken out of hub stock">${two('<b>Stock out</b>', `<span class="lt-d">${sa ? `${sa.managed}/${sa.total} lines` : '—'}</span>`)}</button>`)); }
  const pq = packedQty(r), tq = totalQty(r), ppTxt = l.packedAll ? l.packedAt : pq ? `${pq}/${tq} packed` : '';
  Fo.push(fr(3, 5, 73, `<${cap.pack ? 'button data-l1-pp' : 'span'} class="lt pp l2lt${l.packedAll ? ' on' : ''}${cap.pack ? '' : ' ro'}" title="Orange until picked and packed, then green with the date (Confirm packed)">${ppTxt ? two('<b>Pick &amp; Pack</b>', `<span class="lt-d">${ppTxt}</span>`) : '<b>Pick &amp; Pack</b>'}</${cap.pack ? 'button' : 'span'}>`));
  // col B: Show all · 3/3 item(s) · [free] Names · payment follow-up · Remark + Shopify link
  const n = r.items.length, nNames = r.items.filter((x) => x.nameAttr).length;
  Fo.push(fr(1, 84, 47, `<button class="tg lines" data-l1-lines-show data-cnt=".itc" title="Show all lines, or hide shipped lines">Show all</button>`));
  Fo.push(fr(1, 134, 66, `<span class="itc">${ic('eye', 'i12')}<b>${n}/${n}</b> item(s)</span>`));
  if (cap.names && nNames) Fo.push(fr(1, 208, 74, `<button class="tg add" title="Export name attributes as CSV or print">Names (${nNames})${ic('chevronDown', 'i10')}</button>`));
  if (!pk) {
    Fo.push(fr(2, 81, 112, `<span class="f2 fu2">${two('(Paid) Payment', 'follow-up date')}</span>`));
    Fo.push(fr(2, 194, 56, `<span class="f2 mn${l.followUp && l.owing ? ' due' : ''}">${l.followUp && l.owing ? l.followUp.slice(0, 5) : ''}</span>`));
  }
  if (cap.slip) Fo.push(fr(3, 82, 52, `<button class="fb ink" title="${l.slipRemark ? 'Slip remark: ' + l.slipRemark : 'Remark printed on the picking list'}">Remark${l.slipRemark ? '<i class="dot"></i>' : ''}</button>`));
  if (cap.shopify) Fo.push(fr(3, 140, 212, `<a class="shu" href="#" title="Open the order in Shopify admin">https://${STORES[r.store].domain}/admin/orders/5${r.no}0412</a>`));
  // col C: + Item · URGENT (11) · REPEAT ORDER (new) · [Supplier slot] Request stock · Picking list | P
  if (cap.lineEdit) Fo.push(fr(1, 287, 53, `<button class="tg add" title="Add a line item">+ Item</button>`));
  const urg = l.urgent ? two('Urgent', `<span class="tg-d">${l.urgent.slice(0, 5)}</span>`) : 'Urgent';
  Fo.push(fr(1, 343, 53, pk ? `<span class="tg urg ro${l.urgent ? ' on' : ''}">${urg}</span>` : `<button class="tg urg${l.urgent ? ' on' : ''}" data-l1-pop="urg-${role}" title="Priority order: top of every list. Set the date the customer needs it.">${urg}</button>`));
  Fo.push(fr(1, 400, 64, pk ? `<span class="tg rep ro${l.repeat ? ' on' : ''}">Repeat order</span>` : `<button class="tg rep${l.repeat ? ' on' : ''}" data-l1-tog title="Repeat order: check the previous order's remarks first">Repeat order</button>`));
  const nRs = r.items.filter((x) => x.restock).length;
  if (cap.reqStock && !r.canceled) Fo.push(fr(2, 287, 53, `<button class="tg add" title="Ask a supplier to restock (back in stock), in place of Supplier">${two('Request', `stock${nRs ? ` (${nRs})` : ''}`)}</button>`));
  Fo.push(fr(2, 343, 84, cap.slip ? `<span class="seg brand"><button title="Print the picking list (per-line qty, Location, Remark)">Picking list</button><button class="p${l.pickAt ? ' on' : ''}" title="${l.pickAt ? 'Printed ' + l.pickAt + ' · print again' : 'Not printed yet'}">P</button></span>` : `<span class="stp-d">${l.pickAt ? two(`${ic('check', 'i10')}Picking list`, l.pickAt) : two('Picking list', 'not printed')}</span>`));
  if (cap.slip && l.pickAt) Fo.push(fr(2, 430, 44, `<span class="stp-d">${two(l.pickAt.split(' ')[0], l.pickAt.split(' ')[1])}</span>`));
  if (pk) {
    // Picker: packing history in the payment-box slot (payment, totals, design and marketing are hidden for pickers)
    const hist = packHistOf(r);
    Fo.push(o(685, 300, `<div class="phist"><b>Packing history</b>${hist.length ? hist.map((e) => `<span>Packed ${e.at} · ${e.n} item${e.n === 1 ? '' : 's'}<button class="ib" title="Cancel confirmation (sends notification)">${ic('trash', 'i10')}</button></span>`).join('') : '<span class="mute">No packing history yet.</span>'}</div>`, { top: 4, h: 84 }));
    return `<div class="lf l2f f-${l.foot}">${Fo.join('')}</div>`;
  }
  // totals block (labels right-aligned to 513, fields 517–598, values right edge 652)
  const t = l.totals;
  Fo.push(o(440, 212, `<div class="tt2">
    <span>Sub Total</span><span class="q">Qty: ${t.qty}</span><b>${money(t.sub)}</b>
    <span>Discount</span><span></span><b class="neg">${t.disc ? '−' + money(t.disc) : '—'}</b>
    <span>Shipping</span><span></span><b>${t.ship ? money(t.ship) : 'Free'}</b>
    <span>Tax</span><span class="q"><i>Division</i><i>11</i></span><b>${money(t.tax)}</b>
    <span>Freight</span><span></span><b>—</b>
    <span class="b">Total</span><span class="q"><i>Shopify</i></span><b class="b">${money(t.total)}</b></div>`, { top: 3, h: 86 }));
  // payment box · star (13) · refresh · Payment method row
  Fo.push(o(685, 163, `<div class="pbx">
      <div class="pr ok"><b>Paid by customer</b><span>${money(l.paid)}</span></div>
      <div class="pr rf"><span>Refunded</span><span>${l.refunded ? '−' + money(l.refunded) : '—'}</span></div>
      <div class="pr net"><b>Net payment</b><b>${money(l.net)}</b></div>
      <div class="pr ow${l.owing ? ' due' : ''}"><span>Amount owing</span><span>${money(l.owing)}</span></div></div>`, { top: 4, h: 54 }));
  Fo.push(fr(1, 852, 20, `<button class="star s-${l.star}" title="${STAR_TIP[l.star]}${admin ? ' · click to record a payment' : ''}">${ic('star', 'i16')}</button>`, { cls: 'c' }));
  if (admin) Fo.push(fr(2, 852, 20, `<button class="rfs" title="Refresh the payment from Shopify">${ic('refresh', 'i10')}</button>`, { cls: 'c' }));
  Fo.push(fr(3, 686, 77, `<span class="mth2">${two('Payment', 'method')}</span>`));
  Fo.push(fr(3, 766, 56, `<b class="mn">${money(l.net)}</b>`, { cls: 'r' }));
  Fo.push(fr(3, 830, 22, `<span class="crd">${ic('card', 'i12')}</span>`, { cls: 'c' }));
  Fo.push(fr(3, 858, 120, `<span class="mtn">${l.method}</span>`));
  // design track (14) + name field (16) · decoration-room date · Emb / Print
  const d = l.design, dz = cap.deco === 2;
  const S = [['sent', two('Design', 'sent'), 'Designer', 'Name', 878, 72], ['approved', two('Design', 'approved'), 'Approved by', 'Who approved it', 953, 71], ['colours', two('Colors', 'chosen'), 'Thread colours', 'e.g. 2045, 2150, 2726', 1027, 72]];
  const act = d.colours ? 2 : d.approved ? 1 : 0;
  const steps = S.map(([k, t2, lab, ph, x, w], i) => `<${dz ? 'button' : 'span'} class="stp${d[k] ? ' done' : ''}${i === act && d[k] ? ' act' : ''}" data-l1-step data-lab="${lab}" data-val="${d[k] || ''}" data-ph="${ph}" style="left:${(((x - 878) / 368) * 100).toFixed(2)}%;width:${((w / 368) * 100).toFixed(2)}%">${t2}</${dz ? 'button' : 'span'}>`).join('');
  const cur = S[act], cv = d[cur[0]];
  Fo.push(fr(1, 878, 368, `<div class="dsg l2d">${steps}<span class="dv" style="left:${(((1104 - 878) / 368) * 100).toFixed(2)}%;width:${((142 / 368) * 100).toFixed(2)}%"><span class="dv-l" data-l1-dvl>${cv ? cur[2] : ''}</span><span class="dv-v${cv ? '' : ' ph'}" data-l1-dvv>${cv || 'Name'}</span></span></div>`, { cls: 'ov' }));
  Fo.push(fr(2, 1104, 76, `<span class="f2 mn">${l.prod ? '30/10/2026' : ''}</span>`, { title: 'Date given to the decoration room' }));
  Fo.push(fr(2, 1183, 29, `<button class="rmb${l.prod && l.prod.room === 'Emb' ? ' on' : ''}" title="Embroidery room">Emb</button>`));
  Fo.push(fr(2, 1215, 30, `<button class="rmb${l.prod && l.prod.room === 'Print' ? ' on' : ''}" title="Print room">Print</button>`));
  // [A4 slot] Fulfilments · [LABEL + P slot] Confirm & Print · [Booking Ship slot] Confirm fulfilment
  if (cap.ful) {
    const locked = r.canceled || r.closed, done = l.ful === 'full', off = locked || done, tip = locked ? 'Closed or canceled orders cannot be fulfilled' : 'Already fully fulfilled';
    const nConf = confsOf(r).length || (l.trk && l.lines.some((x) => x.shipped > 0) ? 1 : 0);
    Fo.push(fr(2, 986, 93, `<button class="ob"${nConf ? ' title="Fulfilment history: parcels, barcodes, edit / cancel (in place of A4)"' : ' disabled title="No fulfilments yet"'}>Fulfilments${nConf > 1 ? ` (${nConf})` : ''}${ic('chevronRight', 'i10')}</button>`));
    Fo.push(fr(2, 1082, 18, `<button class="ob ic"${off ? ` disabled title="${tip}"` : ' title="Confirm fulfilment and print the shipping label (in place of LABEL | P)"'}>${ic('printer', 'i10')}</button>`, { cls: 'c' }));
    Fo.push(fr(3, 985, 116, `<button class="bkg"${off ? ` disabled title="${tip}"` : ' title="Confirm fulfilment in Shopify (in place of Booking Ship)"'}>${locked ? 'Fulfilment locked' : 'Confirm fulfilment'}${ic('truck', 'i12')}</button>`));
  }
  // marketing box (17) + VIP (new, the free cell under All)
  const ed = admin, all = l.mkt.m1 && l.mkt.m3 && l.mkt.m6 && l.mkt.anniv;
  const box = (on, t2, k, cls = '') => `<${ed ? 'button' : 'span'} class="mk${on ? ' on' : ''}${cls}"${ed ? ` data-l1-mk="${k}"` : ''}><span class="ck${on ? ' on' : ''}"></span>${t2}</${ed ? 'button' : 'span'}>`;
  Fo.push(o(1251, 239, `<div class="mkb"><div class="fl-t">Marketing${ed ? '<button class="lnk" title="Open the marketing layout">Edit</button>' : ''}</div>
    <div class="mk-g">${box(all, 'All', 'all')}${box(l.mkt.m3, 'Three Months', 'm3')}${box(l.vip, `${ic('crown', 'i10')}VIP`, 'vip', ' vip')}${box(l.mkt.m6, 'Six Months', 'm6')}${box(l.mkt.m1, 'One Month', 'm1')}${box(l.mkt.anniv, 'Anniversary', 'anniv')}</div>
    <button class="lnk">${ic('history', 'i10')}History</button></div>`, { top: 4, h: 84 }));
  return `<div class="lf l2f f-${l.foot}">${Fo.join('')}</div>`;
}

/* ---------------- order block + page ---------------- */
function block(r, role, open) {
  const cap = CAP[role], l = ledgerOf(r);
  return `<div class="lg b-${l.head}${open ? ' open' : ''}" data-no="${r.no}">${headLine(r, role, open)}<div class="lg-x">${lineHead(r, role)}${r.items.map((x, i) => lineRow(r, x, i, role)).join('')}${footer(r, role)}</div>${decoStrip(r, cap)}</div>`;
}
const OPEN = { admin: ['2204', '4752'], staff: ['2204', '4752'], picker: ['2204', '4752'] };
export function conceptL2(role) {
  P.setRole(role);
  const cap = CAP[role], rows = ledgerSort(D.rowsFor(role)).map(lessDeco);
  const qty = rows.reduce((a, r) => a + totalQty(r), 0);
  const content = `
    ${P.approvals(role)}
    ${F.toolbar(role)}
    <div class="qrow">${P.queueTabs(role, 'all')}<div class="r"><span class="fnd"><b data-l1-found2>${rows.length}</b> found · ${qty} pcs</span><button class="fchip" title="Urgent orders always come first"><span class="k">Sort</span><b>Urgent first · Date placed</b>${ic('chevronDown', 'i12')}</button><button class="btn ghost" data-l1-all title="Collapse every order to its header line">${ic('expand', 'i')}<span>Collapse all</span></button>${cap.labels ? `<button class="btn ghost">${ic('plus', 'i')}New invoice</button>` : ''}</div></div>
    ${F.quickRow(role)}
    <div class="l1-card"><div class="l1-scr thin">${titleRow(role, rows.length)}${rows.map((r) => block(r, role, OPEN[role].includes(r.no))).join('')}</div>${P.bulkBar(role, 0, false, null)}${F.bottomBar(role, rows)}</div>
    ${F.popovers(role)}`;
  return D.shell(role, content, { cls: 'l1 l2', sub: 'Ledger' }) + L1_JS;
}

/* ---------------- styles: L1's tokens and classes, placed absolutely ---------------- */
export const CSS_L2 = `
.art.l2{width:1512px;height:982px}
.l2 .o{position:absolute;top:0;height:100%;display:flex;align-items:center;min-width:0;white-space:nowrap}
.l2 .o.c{justify-content:center}.l2 .o.r{justify-content:flex-end}.l2 .o.ov{overflow:visible}
.l2 .lg{margin:0 6px 4px}.l2 .lg.open{margin:7px 6px 9px}
.l2t{position:sticky;top:0;z-index:4;height:24px;margin:0 7px 5px 10px;background:var(--fm-title);color:#262626;font-size:9px;font-weight:700;letter-spacing:.35px;text-transform:uppercase;box-shadow:-10px 0 0 var(--fm-title),7px 0 0 var(--fm-title)}
.l2t .ck{background:#fff}.l2t .o{white-space:normal;line-height:10px}
.l2 .lg-h.l2h{display:block;position:relative;height:30px;padding:0}
.l2 .llh.l2lh{display:block;position:relative;height:20px;padding:0;line-height:9px}
.l2 .llh.l2lh .o{white-space:normal}
.l2 .ll.l2r{display:block;position:relative;height:34px;padding:0}
.l2 .lf.l2f{display:block;position:relative;height:92px;padding:0}
.l2 .f2{display:block;width:100%;height:20px;line-height:18px;padding:0 5px;border:1px solid rgb(0 0 0/.14);border-radius:4px;background:rgb(255 255 255/.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#1c1a2b}
.l2 .f2.b{font-weight:700}.l2 .f2.grow{flex:1;min-width:0}.l2 .f2.due{color:#c0261a;font-weight:700}
.l2 .lf .f2{height:24px;line-height:22px;background:#fff;font-size:10px}
.l2 .f2.fu2{line-height:1;display:flex;align-items:center;color:#4a4663}
.l2 .o>.f2+.trkic,.l2 .o>.f2+.pen{margin-left:2px}
.l2 .mnu{display:inline-flex;align-items:center;justify-content:center;width:20px;height:18px;border-radius:4px;background:var(--fm-tick);color:var(--fm-ink)}
.l2 .mnu.sm{width:18px;height:16px}
.l2 .pen{width:18px;height:18px;color:#3f3b56}
.l2 .poc{width:100%;justify-content:center}
.l2 .seg{width:100%}.l2 .seg button:first-child{flex:1;justify-content:center;min-width:0;overflow:hidden}
.l2 .seg.brand{height:24px}
.l2 .msgb{display:inline-flex;align-items:center;justify-content:center;gap:4px;width:100%;height:20px;border-radius:5px;background:var(--fm-lav);color:#fff;font-size:10px;font-weight:700}
.l2 .msgb i{font-style:normal;background:#fff;color:var(--fm-ink);border-radius:999px;font-size:8.5px;padding:0 4px;line-height:12px}
.l2 .msgb:disabled{opacity:.45;cursor:not-allowed}
.l2 .pks{display:flex;align-items:center;gap:10px}
.l2 .two{display:flex;flex-direction:column;align-items:flex-start;gap:0;line-height:1.05;min-width:0}
.l2 .two>span{display:block;height:1.12em;line-height:1.12em;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.l2 .src{margin:0}
.l2 .orm{display:inline-flex;align-items:center;justify-content:center;gap:4px;width:100%;height:18px;border-radius:5px;background:var(--fm-ink);color:#fff;font-size:9.5px;font-weight:700;letter-spacing:0;text-transform:none;position:relative}
.l2 .orm i{font-style:normal;background:#fff;color:var(--fm-ink);border-radius:999px;font-size:8.5px;padding:0 4px;line-height:12px}
.l2 .dot{width:6px;height:6px;border-radius:50%;background:#f4d458;display:inline-block}
.l2 .rfs{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;background:#88b04c;color:#fff}
.l2 .ds{width:100%}.l2 .ds-s .dch{flex:0 1 auto}
.l2 .ins2,.l2 .nopo2{display:inline-flex;align-items:center;justify-content:center;width:100%;height:20px;border-radius:4px;font-size:9.5px;font-weight:700;padding:0 2px}
.l2 .ins2{background:var(--fm-instock);color:#24461a}.l2 .nopo2{background:#fdecea;color:#b4231a;box-shadow:inset 0 0 0 1px #f4c4c4}
.l2 .pur{width:100%;justify-content:center}.l2 .pur:disabled{opacity:.55;cursor:not-allowed}
.l2 .spn{font-size:10px;color:var(--fm-plum)}.l2 .spd{font-size:9px;color:#6c1498}
.l2 .pob{width:100%;justify-content:center}
.l2 .qb{display:inline-flex;align-items:center;justify-content:center;width:100%;height:20px;border:1px solid rgb(0 0 0/.14);border-radius:4px;background:#fff;font-size:10px}
.l2 .lb{width:100%}.l2 .lb.two-b{height:26px}.l2 .lb .two{align-items:center;font-size:9px}
.l2 .lb .dot{margin-left:3px}.l2 .lb:disabled{cursor:default}
.l2 .ll .trn{font-size:9.5px}
.l2 .mail.sm{width:14px;height:14px}
.l2 .lt.l2lt{height:24px;padding:0 6px}.l2 .lt.l2lt .two{line-height:1}.l2 .lt.l2lt .lt-d{margin:0;font-size:9px}
.l2 .lt.sto{background:var(--fm-soft);color:#3b2f86;box-shadow:inset 0 0 0 1px #d9d4f3}.l2 .lt.sto.s-managed{background:var(--fm-green);color:#0b3a1a;box-shadow:none}.l2 .lt.sto.s-partial{background:#f8e0a0;color:#5a3a00;box-shadow:none}
.l2 .tg{width:100%}.l2 .tg .two{align-items:center;font-size:9.5px}
.l2 .itc{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;color:#2a2740}
.l2 .shu{font-size:9.5px;color:#2453b8;text-decoration:underline;overflow:hidden;text-overflow:ellipsis;display:block;max-width:100%;align-self:flex-end;margin-bottom:2px}
.l2 .stp-d{font-size:9.5px}
.l2 .tt2{display:grid;grid-template-columns:1fr auto auto;column-gap:6px;align-items:center;width:100%;font-size:10px;line-height:13.4px;color:#3a3750}
.l2 .tt2>span:nth-child(3n+1){text-align:right}
.l2 .tt2 b{text-align:right;font-variant-numeric:tabular-nums;color:#1c1a2b;font-weight:400;min-width:58px}
.l2 .tt2 .q{display:flex;gap:3px}.l2 .tt2 .q i{font-style:normal;font-size:9px;border:1px solid rgb(0 0 0/.14);background:#fff;border-radius:3px;padding:0 4px;line-height:11px}
.l2 .tt2 .neg{color:#c0261a}.l2 .tt2 .b{font-weight:700}
.l2 .pbx{width:100%}
.l2 .mth2{display:inline-flex;align-items:center;width:100%;height:24px;padding:0 7px;border-radius:5px;background:var(--fm-green);color:#0b3a1a;font-size:9.5px;font-weight:700}
.l2 .crd{color:#3a3750;display:inline-flex}.l2 .mtn{font-size:10.5px;font-weight:700;color:#1c1a2b}
.l2 .l2d{position:relative;width:100%;height:100%}
.l2 .l2d .stp{position:absolute;top:0;height:22px;margin:0}
.l2 .l2d .dv{position:absolute;top:0;height:22px}
.l2 .rmb{display:inline-flex;align-items:center;justify-content:center;width:100%;height:22px;border-radius:5px;font-size:10px;font-weight:700;background:#fff;color:var(--fm-brand);box-shadow:inset 0 0 0 1px #b7aaf5}
.l2 .rmb.on{background:var(--fm-brand);color:#fff;box-shadow:none}
.l2 .ob{display:inline-flex;align-items:center;justify-content:center;gap:3px;width:100%;height:22px;border-radius:5px;background:var(--fm-orange);color:#3d2400;font-size:10px;font-weight:700}
.l2 .ob.ic{padding:0}.l2 .ob:disabled{opacity:.45;cursor:not-allowed}
.l2 .bkg{display:inline-flex;align-items:center;justify-content:center;gap:5px;width:100%;height:24px;border-radius:6px;background:var(--fm-brand);color:#fff;font-size:10.5px;font-weight:700}
.l2 .bkg:disabled{background:#b9b2e6;cursor:not-allowed}
.l2 .mkb{width:100%;height:100%;border:1px solid #d9d5ec;border-radius:6px;background:#fff;padding:3px 7px;display:flex;flex-direction:column;gap:2px}
.l2 .mkb .mk-g{flex:1;align-content:start}
.l2 .phist{width:100%;height:100%;display:flex;flex-direction:column;gap:3px;font-size:10px}
.l2 .phist>b{font-size:9px;text-transform:uppercase;letter-spacing:.4px;color:#4a4663}
.l2 .phist>span{display:flex;align-items:center;justify-content:space-between;border:1px solid #e1def0;border-radius:6px;background:#fff;padding:1px 2px 1px 7px}
.l2 .lg>.under{border-top:1px solid #e3e0f0}
.l2 .l2lh .src{display:inline-flex;align-items:center;justify-content:center;text-align:center;height:18px;border-radius:6px;line-height:8.5px;padding:0 6px;white-space:normal}
.l2 .l2lh .o.tight>span{letter-spacing:-.45px}
.l2 .o>.msgc{position:absolute;top:1px;right:-3px;font-style:normal;background:#fff;color:var(--fm-ink);box-shadow:0 0 0 1px var(--fm-lav);border-radius:999px;font-size:8.5px;font-weight:700;padding:0 4px;line-height:12px}
.l2 .tg.lines,.l2 .tg.rep{letter-spacing:-.25px;padding:0 1px}
.l2 .itc{letter-spacing:-.1px}
.l2 .mkb{padding:2px 7px;gap:0}.l2 .mkb .mk{height:16px}.l2 .mkb>.lnk{line-height:14px}
.l2 .ins2,.l2 .nopo2{letter-spacing:-.2px}
.l2 .f2{padding:0 4px}
.l2 .fl{gap:1px}.l2 .fl i{width:14px;height:14px}
.l2 .o .store{gap:3px;padding:0 3px}
.l2 .seg button:first-child{padding:0 3px;letter-spacing:-.1px}
.l2 .msgb{padding:0 3px}
.l2 .poc{padding:0 2px;letter-spacing:-.15px}
.l2 .l2lh{letter-spacing:0}
.l2 .pur{padding:0 4px;gap:2px}
.l2 .lb.two-b .two{font-size:8.5px}
.l2 .lb{padding:0 2px}
.l2 .o>.ib.del{width:20px;height:20px;border-radius:5px;color:#d93a2b;background:#fdeceb;box-shadow:inset 0 0 0 1px #ef8a82}.l2 .o>.ib.del:hover{background:#fbd5d2;color:#b82a1c}.l2 .ll .o>.ib.del{width:18px;height:18px}
.l2 .pob{font-size:8.5px;padding:0 2px}
.l2 .lt.l2lt{padding:0 4px}
.l2 .itc{gap:3px}
.l2 .tg{padding:0 3px}.l2 .tg.urg .two{align-items:center}
.l2 .seg.brand button:first-child{padding:0 3px}
.l2 .l2d .stp .two{align-items:center;font-size:9px}
.l2 .fb.ink{padding:0 4px}
.l2 .f2.mn{padding:0 2px}.l2 .msgb{padding:0 1px;gap:2px}.l2 .pur{letter-spacing:-.15px}.l2 .lb{padding:0 1px}.l2 .lb.two-b .two{letter-spacing:-.15px}.l2 .pob{letter-spacing:-.2px}.l2 .l2lh .o>span{letter-spacing:-.15px}
`;

/* ---------------- index.html notes under the L2 artboards ---------------- */
export function l2Docs() {
  const K = { Kept: 'merged', Reused: 'new', Added: 'mix', Removed: 'removed' };
  const row = (zone, old, x, d, now) => `<tr><td>${zone}</td><td>${old}</td><td class="mn">${x}</td><td><span class="dc ${K[d]}">${d === 'Reused' ? 'Reused slot' : d === 'Added' ? 'Added in free space' : d}</span></td><td>${now}</td></tr>`;
  const T = [
    ['Header', '⊖ · ✓', '7 · 25', 'Kept', 'Omit from the found set · select the order and its lines'],
    ['Header', '≡ after the order tick', '49', 'Removed', 'Removed on request; click the order’s top line to open or close it'],
    ['Header', 'gap between ≡ and the date', '71', 'Added', 'Urgent / Repeat / VIP flags (up to two)'],
    ['Header', 'Order date, Order #, Name + eye, Email + ✉, Branch, Address', '105 – 888', 'Kept', 'Same fields; the eye opens the FulfilPro customer record'],
    ['Header', 'Magnifier next to the name', '351', 'Removed', 'Gap kept'],
    ['Header', 'PO all items, Tracking number, Shipment company, Shipment date + ✎', '891 – 1243', 'Kept', 'PO number once a PO exists; 17track state inside the tracking field; ✎ edits the fulfilment'],
    ['Header', 'LABEL | P, Tax invoice | P', '1249 · 1316', 'Kept', 'P fills once printed'],
    ['Header', 'Task / Problem', '1402', 'Reused', 'Messages (with count)'],
    ['Header', 'Delete', '1468', 'Kept', 'Delete from FulfilPro only (Admin)'],
    ['Line header', 'Online Order, column labels, ≡ (18), ON TIME, Order’s remark, ⟳', '4 – 1490', 'Kept', 'Order’s remark opens Order notes (dot = customer note); ⟳ refreshes from Shopify'],
    ['Line', '⊖, ✓, Description, SKU, Size & picture, Qty, Price, Disc.%, Qty status, Total, Stock', '7 – 642', 'Kept', '✓ = Full; description adds Shopify link, colour, name chip, restock, EMB / PRT and the decorator chip; Stock = hub available | used'],
    ['Line', 'In Stock (Take from)', '646', 'Reused', 'Read-only stock check: In Stock, or Short'],
    ['Line', 'PURCHASE, ✎, Supplier, Due date, Purchase status', '689 – 958', 'Kept', 'Create / open the PO; supplier + PO number; ETA; PO status'],
    ['Line', 'Packed + Qty, Stock out + Qty, Tracking / company / date + ✉', '961 – 1244', 'Kept', 'Packed state and packed quantity (partial); stock adjustment; parcel tracking, ✉ sends it to the customer'],
    ['Line', '✓ (18), status cell, Stock return, Back order, Remark, delete', '1254 – 1488', 'Kept', 'SHIPPED / PART / PO / PACKED / NEW'],
    ['Footer', 'Production, Pick & Pack', '5 (rows 1, 3)', 'Kept', 'Auto-lit on decoration with the room date; Pick & Pack = Confirm packed, orange → green'],
    ['Footer', 'Pick to do date', '5 (row 2)', 'Reused', 'Stock out light (stock adjustment, Admin)'],
    ['Footer', 'Show all · 3/3 item(s), (Paid) Payment follow-up date, Remark + Shopify link', '81 – 352', 'Kept', 'Follow-up date shows when money is owing'],
    ['Footer', 'free space after 3/3 item(s)', '202', 'Added', 'Names (n) ▾ export'],
    ['Footer', '+ Item, URGENT, Picking list | P', '287 · 343', 'Kept', 'Urgent opens the need-by date'],
    ['Footer', 'free space after URGENT', '400', 'Added', 'Repeat order (client request: next to Urgent)'],
    ['Footer', 'Supplier', '287 (row 2)', 'Reused', 'Request stock (back in stock)'],
    ['Footer', 'Totals, payment box, Payment method, ★, ⟳', '440 – 978', 'Kept', 'Star: clear paid, yellow unpaid, orange part paid, red shipped and owing'],
    ['Footer', 'Design Sent › Design Approved › Colors Chosen, Name, date · Emb · Print', '878 – 1246', 'Kept', 'Steps go green; the Name field shows the step’s value; date + Emb / Print = decoration room'],
    ['Footer', 'A4 · LABEL | P', '986 · 1082', 'Reused', 'Fulfilments (history) · Confirm & print label'],
    ['Footer', 'Booking Ship', '985 (row 3)', 'Reused', 'Confirm fulfilment'],
    ['Footer', 'Marketing box', '1251', 'Kept', 'All ticked on a new order; VIP added in the free cell under All'],
    ['Order', 'Decoration files', 'bottom of the order', 'Added', 'Files, Customer design, Photo, Customer remarks; shown collapsed and expanded'],
  ].map((r) => row(...r)).join('');
  return `<div class="l1-doc"><div class="l1-dc"><h3>Same position as FileMaker · every object of the client’s order block</h3>
    <p style="margin-bottom:8px">x = left edge in FileMaker points, measured from the client’s screenshot (block width 1494 pt). L2 draws each object at x / 1494 of the order width, so the layout lines up with the client’s screen; text size and spacing are L1’s. Roles hide what they cannot use and leave the gap, as FileMaker privileges do. Colours, the data the build round needs and the open questions are the same as L1 (notes under the L1 artboards).</p>
    <table><tr><th>Band</th><th>FileMaker object</th><th>x (pt)</th><th>Decision</th><th>In L2</th></tr>${T}</table></div></div>`;
}
