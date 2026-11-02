// Round 3: the dialogs, menus and popovers of today's Orders / Picking List, restyled once and shared by all six concepts.
// Rendered as one sheet (dialogs.html). Synthetic data only.
import { CSS } from './styles.mjs';
import * as D from './designs.mjs';
import * as D2 from './designs2.mjs';
import { CSS_X } from './extras.mjs';
import { ic, tile } from './chrome.mjs';
import { ZOOM_JS } from './chrome.mjs';
import { byNo, STORES, RECIPIENTS } from './data.mjs';
import * as P from './parts.mjs';

const pill = { A: ['Admin', 'a'], S: ['Staff', 's'], P: ['Picker', 'p'] };
const roles = (s) => [...s].map((c) => `<i class="rl ${pill[c][1]}">${pill[c][0]}</i>`).join('');
const fld = (l, v, { w = '', muted = false } = {}) => `<div class="fr" style="${w}"><label>${l}</label><span class="inp${muted ? ' muted' : ''}" style="height:28px;justify-content:space-between">${v}</span></div>`;
const dlg = (title, body, foot = '', { w = 460, sub = '' } = {}) => `<div class="dlg" style="width:${w}px"><div class="dh"><div><b>${title}</b>${sub ? `<span class="muted">${sub}</span>` : ''}</div><button class="ib">${ic('close', 'i')}</button></div><div class="db">${body}</div>${foot ? `<div class="df">${foot}</div>` : ''}</div>`;
const card = (no, title, who, src, gap, inner, { span = 1 } = {}) => `<section class="dc" style="grid-column:span ${span}"><header><span class="no">${no}</span><div><b>${title}</b><span class="meta">${roles(who)}<code>${src}</code>${gap ? `<em>${gap}</em>` : ''}</span></div></header><div class="stage">${inner}</div></section>`;
const lineHead = (cols, names) => `<div class="lnh" style="--lcols:${cols}">${names.map((n) => `<span>${n}</span>`).join('')}</div>`;
const sw = (x) => `<span class="sw"><i style="background:${x.hex}"></i>${x.colour}</span>`;

/* 1 ---- Print picking slip */
function printSlip() {
  const r = byNo('2204');
  const lines = r.items.map((x, i) => {
    const removed = i === 2;
    return `<div class="pl${removed ? ' rm' : ''}"><div class="row-b"><span class="cell">${tile(x.kind, x.hex, 26)}<span class="cell col"><b class="strong">${x.name}</b><span class="muted" style="font-size:10px;display:flex;gap:4px;align-items:center">${sw(x)}<span>· ${x.size}</span><span class="mono">· ${x.sku}</span></span></span></span>
      <span class="cell"><span class="step" style="${removed ? 'opacity:.4' : ''}"><button>−</button><span>${x.qty - x.packed}</span><button>+</button></span><button class="btn xs ${removed ? 'soft' : 'ghost'}">${removed ? 'Restore' : 'Remove'}</button></span></div>
      ${removed ? '' : `<div class="lr"><span class="bin">${x.bin}</span><span class="inp" style="flex:1;height:22px;color:var(--g500)">Remark (shown on the slip)</span><button class="ib" title="Add a location and remark">${ic('plus', 'i')}</button></div>`}</div>`;
  }).join('');
  return dlg('Print picking slip', `<div class="row-b" style="margin-bottom:8px"><span class="cell"><b class="strong">#${r.no}</b>${`<span class="store"><i style="background:${STORES[r.store].hue}"></i>${r.store}</span>`}<span class="muted">${r.customer} · print date Fri 30 Oct</span></span></div>${lines}<div class="fr" style="margin-top:8px"><label>Note for the picker</label><span class="inp" style="height:44px;align-items:flex-start;padding-top:6px;white-space:normal;color:var(--g500)">Optional note printed under the lines…</span></div>`,
    `<span class="muted" style="margin-right:auto;font-size:10px;align-self:center">After printing, the slip icon turns green</span><button class="btn ghost">Cancel</button><button class="btn pri">${ic('printer', 'i')}Print</button>`, { w: 480, sub: '1 order · 2 lines' });
}
function slipPaper() {
  const r = byNo('2204');
  return `<div class="paper"><div class="ph"><div><b style="font-size:13px">Westgate Rugby</b><div class="muted">Order #${r.no}</div></div><div style="text-align:right" class="muted">Printed Fri 30 Oct 14:20<br>${r.customer}</div></div>
  ${r.items.slice(0, 2).map((x) => `<div class="pr"><div><b>${x.name}</b><div class="muted">${x.colour} / ${x.size} · <span class="mono">${x.sku}</span></div><div class="muted">Bin ${x.bin} · Remark: take from front shelf</div></div><b style="font-size:18px">${x.qty - x.packed}</b></div><div class="wr"><span>Quantity note</span><span>Location note</span></div>`).join('')}
  <div class="muted" style="margin-top:6px">A4 · 12 mm margins · one page per order</div></div>`;
}

/* 2 ---- Notify */
const notify = (cancel = false) => dlg(cancel ? 'Cancel packed confirmation' : 'Confirm packed', `<div class="muted" style="margin-bottom:6px">Order <b class="strong">#2204</b> · ${cancel ? 'the packing record is removed and stock goes back to unpacked' : '3 of 8 items'}</div>
  <div class="fr"><label>Notify users</label><div class="hist" style="flex-direction:column;align-items:stretch;gap:0;padding:2px 6px;max-height:140px;overflow:hidden">${RECIPIENTS.map((u, i) => `<span class="ckl" style="padding:4px 0;font-weight:400"><span class="ck${i === 2 ? '' : ' on'}"></span><b class="strong" style="font-weight:600">${u.name}</b><span class="muted" style="margin-left:6px">${u.email}</span></span>`).join('')}</div><span class="muted" style="font-size:10px">All users are ticked by default. Each one gets an email and an in-app notification.</span></div>
  <div class="fr" style="margin-top:6px"><label>Message (optional email)</label><span class="inp" style="height:48px;align-items:flex-start;padding-top:6px;color:var(--g500);white-space:normal">Packed 3 of 8, the rest is waiting on stock…</span></div>`,
  `<button class="btn ghost">Back</button><button class="btn ${cancel ? 'dngr' : 'pri'}">${cancel ? 'Cancel packed' : ic('check', 'i') + 'Confirm packed'}</button>`, { w: 400 });

/* 3 ---- Request stock */
function requestStock() {
  const r = byNo('1184');
  return dlg('Request stock', `<div class="fr"><label>Existing requests</label>${lineHead('70px 1fr 40px 62px 54px', ['Status', 'Item · supplier', 'Qty', 'Restocked', 'Due'])}
    <div class="ln" style="--lcols:70px 1fr 40px 62px 54px;--lh:34px"><span class="bdg warn">Need restock</span><span class="cell col"><b class="strong">Sun Visor · White OS</b><span class="muted" style="font-size:10px">Coastal Headwear</span></span><b class="tn">5</b><b class="tn">0/5</b><span class="tn">5 Nov</span></div></div>
   <div class="fr" style="margin-top:8px"><label>New request</label><div class="ln" style="--lcols:1fr 1fr 74px 72px;--lh:34px;border:1px solid var(--bd);border-radius:7px;padding:4px 6px;gap:6px"><span class="inp" style="justify-content:space-between">Pro Match Polo · White S · 4 left ${ic('chevronDown', 'i10')}</span><span class="inp" style="justify-content:space-between">Harmony Threads ${ic('chevronDown', 'i10')}</span><span class="step" style="height:24px"><button>−</button><span>1</span><button>+</button></span><span class="inp">${ic('calendar', 'i10')}&nbsp;6 Nov</span></div></div>
   <div class="row-b" style="margin-top:8px;font-size:10.5px;color:var(--tx-m);background:var(--b50);border:1px solid var(--b200);border-radius:7px;padding:5px 8px"><span>${ic('info', 'i10')} <b>PO #1038</b> already covers 4 more of this variant, ETA 2 Nov.</span><button class="lnk">View PO</button></div>
   <div class="msg" style="margin-top:8px"><span class="av a">A</span><div><b>Admin</b> <span class="muted">· Thu 09:10</span><br>Supplier confirmed the visors ship Monday.</div></div>
   <div class="row-b" style="gap:6px;margin-top:6px"><span class="inp" style="flex:1;color:var(--g500)">Message to the thread…</span></div>`,
    `<button class="btn ghost">Close</button><button class="btn pri">Send request</button>`, { w: 520, sub: `#${r.no}` });
}

/* 4 ---- Stock adjustment */
const stockAdj = () => dlg('Manage stock adjustment', `<div class="muted" style="margin-bottom:6px">Choose what happens to hub stock for each line of <b class="strong">#1184</b>.</div>${lineHead('22px 1fr 108px 56px', ['', 'Product', 'Action', 'Qty'])}
  ${[['Pro Match Polo · White S', 1, 'Decrease', 5], ['Sun Visor · White OS', 0, 'Restore', 5]].map(([n, m, a, q]) => `<div class="ln" style="--lcols:22px 1fr 108px 56px;--lh:36px"><span class="ck${m ? ' on' : ''}"></span><span class="cell col"><b class="strong">${n.split(' · ')[0]}</b><span class="muted" style="font-size:10px">${n.split(' · ')[1]} · Harmony Threads</span></span><span class="inp" style="justify-content:space-between;height:24px">${a} ${ic('chevronDown', 'i10')}</span><span class="step" style="height:24px"><button>−</button><span>${q}</span><button>+</button></span></div>`).join('')}`,
  `<button class="btn ghost">Cancel</button><button class="btn pri">Save stock status</button>`, { w: 460, sub: '1 of 2 lines managed' });

/* 5 ---- Fulfilment confirm */
const fulConfirm = () => dlg('Confirm fulfilment', `<div class="fr"><label>Items to fulfil</label><div class="hist" style="flex-direction:column;align-items:stretch;gap:3px"><span class="row-b"><span>Pro Match Polo · White S</span><b class="tn">× 5</b></span><span class="row-b"><span>Sun Visor · White OS</span><b class="tn">× 5</b></span></div></div>
  <div class="fr" style="margin-top:6px"><label>Barcodes (space separated)</label><span class="inp" style="height:28px">${ic('scan', 'i10')}&nbsp;9300 1122 3344 9300 5566 7788</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px"><div class="fr"><label>Carrier</label><span class="inp" style="height:28px;justify-content:space-between;border-color:var(--pri);box-shadow:0 0 0 2px var(--pri-ring)">Aus${ic('chevronDown', 'i10')}</span><div class="menu" style="position:static;margin-top:2px"><span class="on">Australia Post</span><span>Aramex</span><span>Auspost Parcel Locker</span></div></div><div class="fr"><label>Tracking number</label><span class="inp" style="height:28px;color:var(--g500)">Required with a carrier</span></div></div>
  <div class="fr" style="margin-top:6px"><label>Tracking URL (optional)</label><span class="inp" style="height:28px;color:var(--g500)">https://</span></div>
  <label class="ckl" style="margin-top:8px"><span class="ck on"></span>Send notification to customer</label>`,
  `<button class="btn ghost">Cancel</button><button class="btn ghost">${ic('printer', 'i')}Confirm &amp; print label</button><button class="btn pri">Confirm fulfilment</button>`, { w: 520, sub: '#1184' });

/* 6 ---- Fulfilments detail */
const fulDetail = (role) => dlg('Fulfilments', `${[['Mon 26 Oct · 11:31', '36K8Z40291', 'In transit', 'Club Training Tee · Green M × 12', '9300 1122 3344'], ['Tue 27 Oct · 09:05', '36K8Z40377', 'Delivered', 'Kit Bag 60L · Green OS × 3', '9300 5566 7788']].map(([d, n, st, l, b], i) => `<div class="fcard"><div class="row-b"><span class="cell"><b class="strong">Parcel ${i + 1}</b><span class="bdg ${st === 'Delivered' ? 'ok' : 'info'}">${st}</span></span><span class="muted tn">${d}</span></div>
   <dl class="kv" style="margin-top:4px"><dt>Carrier</dt><dd>Australia Post</dd><dt>Tracking</dt><dd class="mono">${n} ${ic('external', 'i10')}</dd><dt>Lines</dt><dd>${l}</dd><dt>Barcodes</dt><dd class="mono">${b}</dd></dl>
   <div class="row-b" style="margin-top:6px;justify-content:flex-end;gap:5px">${role === 'A' ? `<button class="btn xs ghost">${ic('pencil', 'i12')}Edit</button><button class="btn xs dngr">Cancel</button>` : i === 0 ? `<button class="btn xs ghost">${ic('userLock', 'i12')}Request edit</button><button class="btn xs dngr">Request cancel</button>` : `<span class="bdg warn">${ic('clock', 'i10')}Edit pending…</span><button class="btn xs pri">✓ Edit now</button>`}</div></div>`).join('')}`,
  '', { w: 440, sub: `#2188 · ${role === 'A' ? 'admin edits directly' : 'staff: request, approval, then execute'}` });

/* 7 ---- Decoration assign / work */
const assign = () => dlg('Assign decoration', `<div class="cell" style="margin-bottom:8px">${tile('visor', '#e5e7eb', 28)}<span class="cell col"><b class="strong">Sun Visor · White OS × 5</b><span class="muted" style="font-size:10px"><span class="bdg emb">EMB</span> embroidery</span></span></div>${fld('Decorator', 'Mia K. (Embroidery) ' + ic('chevronDown', 'i10'))}<div style="height:6px"></div>${fld('Complete by', ic('calendar', 'i10') + '&nbsp;Mon 2 Nov')}`, `<button class="btn xs dngr" style="margin-right:auto">Remove assignment</button><button class="btn ghost">Cancel</button><button class="btn pri">Assign</button>`, { w: 360 });
const work = () => dlg('Mark decoration done', `<div class="row-b"><span class="muted">Quantity done</span><span class="step"><button>−</button><span>3</span><button>+</button></span></div><div class="fr" style="margin-top:8px"><label>Comments</label><div class="hist" style="flex-direction:column;align-items:stretch;gap:4px"><span class="row-b"><span><b>Sizes</b> OS</span><span><b>Colours</b> White</span></span><span class="muted">Remark: thread a shade lighter than the sample</span><span class="muted">Location: Rack E2 · ${ic('paperclip', 'i10')} 1 photo</span></div></div>`, `<button class="btn ghost">Cancel</button><button class="btn pri">Save work</button>`, { w: 380 });

/* 8 ---- Line items */
const lineEditSet = () => `<div class="trio">${dlg('Edit line item', `${fld('Title', 'Pro Match Polo', { muted: true })}<div class="muted" style="font-size:10px;margin:2px 0 6px">Store products keep their title</div>${fld('Quantity', '<span class="step" style="height:24px"><button>−</button><span>4</span><button>+</button></span>')}<label class="ckl" style="margin-top:8px"><span class="ck on"></span>Restock the 1 removed piece</label>`, `<button class="btn ghost">Cancel</button><button class="btn pri">Save</button>`, { w: 300 })}
${dlg('Add line item', `<div class="seg2" style="margin-bottom:8px"><button class="on">Store product</button><button>Custom item</button></div>${fld('Product', 'Search store products… ' + ic('search', 'i10'))}<div class="hist" style="margin-top:4px"><span class="cell">${tile('tee', '#38bdf8', 22)}<span class="cell col"><b>Club Training Tee</b><span class="muted" style="font-size:9.5px">Sky M · 4 on hand</span></span></span><button class="btn xs soft">Pick</button></div><div style="height:6px"></div>${fld('Quantity', '<span class="step" style="height:24px"><button>−</button><span>1</span><button>+</button></span>')}`, `<button class="btn ghost">Cancel</button><button class="btn pri">Add</button>`, { w: 300 })}
${dlg('Remove line item', `<div class="muted" style="line-height:1.5">Remove <b class="strong">Sun Visor · White OS × 5</b> from #1184? The customer's total changes in Shopify.</div><label class="ckl" style="margin-top:8px"><span class="ck on"></span>Return 5 to hub stock</label>`, `<button class="btn ghost">Cancel</button><button class="btn dngr">Remove</button>`, { w: 300 })}</div>`;

/* 9 ---- Name attributes */
const namesMenu = () => `<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><div><span class="btn ghost" style="border-color:var(--pri);box-shadow:0 0 0 2px var(--pri-ring)">${ic('download', 'i')}Export names (3)${ic('chevronDown', 'i10')}</span><div class="menu" style="position:static;margin-top:3px;width:190px"><span>${ic('download', 'i10')} Export as CSV</span><span>${ic('printer', 'i10')} Print</span></div><div class="muted" style="font-size:10px;margin-top:8px;width:230px;line-height:1.45">Tick <b>Name:</b> chips on lines, or choose <b>Select all name attributes matching filters</b> (a count loads from the server and exclusions are kept).</div></div>
 <div class="csv"><div class="csvh">name-attributes-2026-10-30.csv</div>${[['Order', 'Product title', 'Name'], ['#4809', 'Club Training Tee', 'GRACE L.'], ['#1190', 'Team Hoodie', 'PRIYA 12'], ['#0729', 'Team Hoodie', 'MARCUS 7']].map((r, i) => `<div class="csvr${i ? '' : ' h'}"><span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span></div>`).join('')}</div></div>`;

/* 10 ---- Filter menus */
const slipMenu = () => `<div class="menu" style="position:static;width:236px"><div class="mh">Picking slip</div><span><i class="rd on"></i>Any</span><span><i class="rd"></i>Not printed <em>4</em></span><span><i class="rd"></i>Printed <em>7</em></span><div class="mh" style="margin-top:2px">More</div><span><span class="ck"></span>Printed over 24 h ago, not packed <em>2</em></span><div class="muted" style="font-size:9.5px;padding:3px 8px 4px;line-height:1.4">Optional. The old “late” rule, now an extra, with no red flag.</div></div>`;
const statusMenu = () => `<div class="menu" style="position:static;width:200px"><div class="mh">Fulfilment status</div>${[['Unfulfilled', 1], ['Partial', 1], ['Fulfilled', 0], ['Closed', 0], ['Canceled', 0]].map(([n, on]) => `<span><span class="ck${on ? ' on' : ''}"></span>${n}</span>`).join('')}</div>`;
const storeMenu = () => `<div class="menu" style="position:static;width:200px"><div class="mh">Store</div>${[['All stores', 0], ['Harbour FC Shop', 1], ['Northside Netball', 1], ['Bayside Surf Club', 0], ['Westgate Rugby', 0]].map(([n, on]) => `<span><span class="ck${on ? ' on' : ''}"></span>${n}</span>`).join('')}</div>`;
const syncMenu = () => `<div class="menu" style="position:static;width:200px"><div class="mh">Select stores to sync</div><span>All stores</span><span>Harbour FC Shop</span><span>Northside Netball</span><span>Bayside Surf Club</span><div class="mh" style="margin-top:2px;text-transform:none;letter-spacing:0;font-weight:400">Last synced 14:12 · 3 new or updated</div></div>`;
function calendar() {
  const d = (n, cls = '') => `<span class="cd ${cls}">${n}</span>`;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span class="cd h">${x}</span>`).join('');
  const cells = (start, n, sel0, sel1) => `<div class="cal">${days}${Array.from({ length: start }, () => '<span class="cd"></span>').join('')}${Array.from({ length: n }, (_, i) => { const v = i + 1; return d(v, sel0 && v === sel0 ? 'e' : sel1 && v === sel1 ? 'e' : sel0 && sel1 && v > sel0 && v < sel1 ? 'r' : ''); }).join('')}</div>`;
  return `<div class="menu" style="position:static;width:300px;padding:8px"><div class="row-b" style="margin-bottom:6px"><b>October 2026</b><span class="muted">Custom range</span></div>${cells(3, 31, 12, 30)}<div class="row-b" style="margin-top:8px"><button class="btn xs ghost" style="border-color:transparent;color:var(--pri-ink)">Clear dates</button><span class="muted tn">12 Oct – 30 Oct</span></div></div>`;
}
const filterRow = () => `<div class="menus"><div><div class="mt">Slip filter · admin, picker</div>${slipMenu()}</div><div><div class="mt">Status</div>${statusMenu()}</div><div><div class="mt">Store</div>${storeMenu()}</div><div><div class="mt">Sync split button</div>${syncMenu()}</div><div><div class="mt">Period: custom range</div>${calendar()}</div></div>`;

/* 11 ---- Tracking */
const tracking = () => dlg('Tracking', `<div class="kv" style="grid-template-columns:64px 1fr"><dt>Parcel</dt><dd class="mono">ST9920451 · StarTrack</dd><dt>State</dt><dd><span class="bdg warn">Paused</span> after 3 days with no scan</dd></div><div class="row-b" style="margin-top:10px;justify-content:flex-start;gap:12px;font-size:10.5px"><span class="cell"><span class="trkic none">${ic('navTracking', 'i')}</span>Not registered</span><span class="cell"><span class="trkic reg">${ic('navTracking', 'i')}</span>Registered</span><span class="cell"><span class="trkic pause">${ic('navTracking', 'i')}</span>Paused</span></div>`, `<button class="btn ghost">Close</button><button class="btn pri">Restart tracking</button>`, { w: 400 });

/* 12 ---- Test user + protection */
const testMode = () => `<div style="display:flex;flex-direction:column;gap:10px;width:380px"><div class="toast"><i></i>This action is not allowed in test mode.</div><div class="muted" style="line-height:1.5;font-size:10.5px"><b>Test user</b> sees the Staff page. Every change (fulfil, notes, labels, requests) is blocked and answered with this message.<br><br><b>Copy protection</b> stays on the merged page for every role except Admin: text selection and copy are blocked on order, customer and product surfaces. Surfaces that must stay copyable (the order note) keep the <code>allow-copy</code> class.</div></div>`;

/* 13 ---- Notes + messages modal */
const notesMsg = () => dlg('Notes and messages', `<div class="seg2" style="margin-bottom:8px"><button class="on">Note</button><button>Message to admin</button></div><div class="fr"><label>Message</label><span class="inp" style="height:46px;align-items:flex-start;padding-top:6px;color:var(--g500);white-space:normal">Write a note for the team…</span></div><div class="fr" style="margin-top:8px"><label>History</label><div class="msg"><span class="av">S</span><div><b>Staff</b> <span class="muted">· Order note · Wed 15:10</span><br>Captain collects Saturday.<span style="margin-left:6px"><button class="lnk">Edit</button> <button class="lnk" style="color:var(--r700)">Delete</button></span></div></div><div class="msg"><span class="av p">P</span><div><b>Picker</b> <span class="muted">· To admin · Thu 08:42</span><br>Bin A-04 is short by 1.</div></div></div>`, `<button class="btn ghost">Close</button><button class="btn pri">${ic('chat', 'i')}Send</button>`, { w: 420, sub: 'Pickers send “picker” messages, others “orders” messages' });

/* 14 ---- closed / canceled orders and fulfilment lock (admin view, same boxes the concepts use) */
function states() {
  const box = (title, r, cap) => `<div class="dlg" style="width:260px"><div class="dh"><div><b>${title}</b><span class="muted">#${r.no} · ${r.customer}</span></div></div><div class="db">${P.fulBox(r, cap)}</div></div>`;
  P.setRole('admin');
  return `<div class="trio">${box('Closed, fulfilled', byNo('1142'), P.CAP.admin)}${box('Canceled, not fulfilled', byNo('1163'), P.CAP.admin)}${box('Fulfilled, 2 parcels', byNo('2188'), P.CAP.admin)}</div>`;
}
const DCSS = `
body{background:#e9edf3}.sheet{width:1480px;margin:0 auto;padding:34px 0 60px}
.hd1{padding:0 40px 18px}.hd1 h1{font-size:24px;letter-spacing:-.3px}.hd1 p{font-size:13px;color:#4b5563;margin-top:7px;line-height:1.55;max-width:1100px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:0 40px;align-items:start}
.dc{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;min-width:0}
.dc header{display:flex;gap:10px;padding:12px 14px 10px;border-bottom:1px solid #f3f4f6}
.dc .no{width:24px;height:24px;border-radius:7px;background:#111827;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.dc header b{font-size:13.5px;display:block}.meta{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:4px;font-size:10px}
.meta code{font-family:ui-monospace,monospace;font-size:9.5px;color:#6b7280}.meta em{font-style:normal;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:999px;padding:0 6px;font-weight:700}
.rl{font-style:normal;font-size:9.5px;font-weight:700;border-radius:999px;padding:1px 7px;border:1px solid}.rl.a{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.rl.s{background:#f9fafb;border-color:#e5e7eb;color:#4b5563}.rl.p{background:#ecfdf5;border-color:#a7f3d0;color:#047857}
.stage{padding:16px;background:#f3f4f6;display:flex;justify-content:center;align-items:flex-start;flex-wrap:wrap;gap:12px;min-height:60px}
.dlg{background:#fff;border:1px solid var(--bd-s);border-radius:12px;box-shadow:0 14px 36px rgb(15 23 42/.2),0 2px 6px rgb(15 23 42/.1);max-width:100%;font-size:11.5px;color:var(--tx-b)}
.dh{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--div)}.dh b{font-size:13px;color:var(--tx);display:block}.dh .muted{font-size:10.5px}
.db{padding:10px 12px}.df{display:flex;justify-content:flex-end;gap:6px;padding:9px 12px;border-top:1px solid var(--bd);background:var(--surf-m);border-radius:0 0 12px 12px}
.fr{display:flex;flex-direction:column;gap:3px}.fr label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--tx-s)}
.row-b{display:flex;align-items:center;justify-content:space-between;gap:8px}
.pl{border:1px solid var(--bd);border-radius:8px;padding:6px 8px;margin-bottom:6px;display:flex;flex-direction:column;gap:5px}.pl.rm{background:var(--surf-m);opacity:.7}.lr{display:flex;align-items:center;gap:6px}
.paper{width:330px;background:#fff;border:1px solid var(--bd-s);box-shadow:0 6px 18px rgb(15 23 42/.12);padding:16px 18px;font-size:10.5px;display:flex;flex-direction:column;gap:7px;color:var(--tx-b)}
.paper .ph{display:flex;justify-content:space-between;border-bottom:1.5px solid var(--tx);padding-bottom:6px}.paper .pr{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--bd);padding-bottom:5px}
.paper .wr{display:grid;grid-template-columns:1fr 1fr;gap:8px}.paper .wr span{border:1px dashed var(--bd-s);height:26px;padding:2px 4px;color:var(--tx-s);font-size:9px}
.menu{background:#fff;border:1px solid var(--bd-s);border-radius:10px;box-shadow:0 8px 22px rgb(15 23 42/.16);padding:4px;font-size:11px}.menu>span{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:6px;color:var(--tx-b)}
.menu>span.on{background:var(--pri-soft);color:var(--pri-ink);font-weight:700}.menu>span em{margin-left:auto;font-style:normal;color:var(--tx-s);font-variant-numeric:tabular-nums}.mh{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--tx-s);padding:4px 8px}
.rd{width:12px;height:12px;border-radius:50%;border:1.5px solid var(--g400);display:inline-block;flex:none}.rd.on{border:4px solid var(--pri)}
.menus{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}.mt{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;margin-bottom:4px}
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;text-align:center}.cd{height:24px;display:flex;align-items:center;justify-content:center;font-size:10.5px;border-radius:5px;font-variant-numeric:tabular-nums}.cd.h{font-size:9px;font-weight:700;color:var(--tx-s)}.cd.r{background:var(--pri-soft);color:var(--pri-ink);border-radius:0}.cd.e{background:var(--pri);color:#fff;font-weight:700}
.fcard{border:1px solid var(--bd);border-radius:9px;padding:8px 10px;margin-bottom:8px;background:var(--surf-m)}
.trio{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.csv{border:1px solid var(--bd-s);border-radius:8px;background:#fff;overflow:hidden;width:290px;font-size:10.5px}.csvh{background:var(--surf-m);padding:4px 8px;font-weight:700;border-bottom:1px solid var(--bd)}.csvr{display:grid;grid-template-columns:50px 1fr 80px;gap:6px;padding:3px 8px;border-bottom:1px solid var(--div)}.csvr.h{font-weight:700;color:var(--tx-s)}
.toast{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--bd);border-left:4px solid var(--r600);border-radius:8px;padding:10px 12px;box-shadow:0 6px 18px rgb(15 23 42/.14);font-weight:700;color:var(--tx)}.toast i{width:8px;height:8px;border-radius:50%;background:var(--r600)}
`;

const cards = [
  card(1, 'Print picking slip', 'AP', 'picking-list/modules/PrintModal.tsx', 'Added: was only a button', `${printSlip()}${slipPaper()}`, { span: 2 }),
  card(2, 'Confirm / cancel packed: notify', 'AP', 'picking-list/modules/NotifyModal.tsx', 'Added: message field', `<div style="display:flex;flex-direction:column;gap:12px">${notify(false)}${notify(true)}</div>`),
  card(3, 'Request stock (back in stock)', 'AS', 'orders/modules/OrderModals.tsx · back-in-stock', 'Added; linked to PO status', requestStock(), { span: 2 }),
  card(4, 'Stock adjustment', 'A', 'orders/modules/useStockAdjustment.ts', 'Added', stockAdj()),
  card(5, 'Confirm fulfilment', 'AS', 'orders/modules/OrderModals.tsx', 'Added: carrier search, URL, Confirm & print', fulConfirm()),
  card(6, 'Fulfilments (parcels)', 'AS', 'orders/modules/FulfillmentDetailsView.tsx', 'Added: admin direct vs staff request', `<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">${fulDetail('A')}${fulDetail('S')}</div>`, { span: 2 }),
  card(7, 'Decoration: assign and mark done', 'A', 'orders/modules/AssignModal, WorkModal', 'Added', `${assign()}${work()}`),
  card(8, 'Line items: edit, add, remove', 'A', 'orders/modules/EditLineItemModal …', 'Added', lineEditSet(), { span: 2 }),
  card(9, 'Name attributes: select and export', 'AS', 'orders/modules/useNameAttributes.ts', 'Added: menu and CSV', namesMenu(), { span: 2 }),
  card(10, 'Tracking (17track)', 'A', 'orders/modules/OrderRowActions.tsx', 'Added', tracking()),
  card(11, 'Filter menus', 'APS', 'OrdersToolbar, PickingListFilters', 'Slip filter is new; rest added', filterRow(), { span: 3 }),
  card(12, 'Notes and messages', 'APS', 'components/NotesModal, MessagesModal', 'Added: type per role', notesMsg()),
  card(13, 'Order states: closed, canceled, tracking', 'AS', 'orders/modules/OrderActionsColumn.tsx', 'Added: Closed, lock states', states(), { span: 2 }),
  card(14, 'Test user and copy protection', 'S', 'proxy.ts · app/(shell)/layout.tsx', 'Requirement, not a screen', testMode()),
].join('');

export function buildDialogs() {
  const css = CSS + D.CSS2 + D.CSS_B + D.CSS_C + D2.CSS_D + CSS_X + DCSS;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FulfilPro · Merged page · dialogs and menus</title><style>${css}</style></head><body><div class="sheet"><div class="hd1"><h1>Dialogs, menus and popovers of the merged page</h1><p>Everything today’s Orders page and Picking List open on top of the table, redrawn once so all six layouts share it. The role chips show who sees each one; the grey line is the source file in the current app. Amber tags mark what the round-2 prototype did not show yet. Synthetic data.</p></div><div class="grid">${cards}</div></div></body></html>`;
}
