// Round 3: pieces of today's Orders / Picking List that the first two rounds left out.
// Pure renderers (no state): parts.mjs and the concepts place them, role-gated through CAP.
import { ic } from './chrome.mjs';
import { P as ICONS } from './chrome-base.mjs';
import { restockState, RESTOCK_LABEL, decoDone, stockAdjOf } from './data.mjs';

Object.assign(ICONS, {
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  paperclip: 'M21.4 11.1l-9.2 9.2a6 6 0 01-8.5-8.5l9.2-9.2a4 4 0 015.7 5.7l-9.2 9.2a2 2 0 01-2.8-2.8l8.5-8.5',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  mail: 'M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm18 2l-10 7L2 6',
  minus: 'M5 12h14',
});

export const CSS_X = `
.rcp{border:1px solid var(--bd);border-radius:8px;background:var(--surf)}
.rcp-h{display:flex;align-items:center;gap:6px;padding:3px 7px;border-bottom:1px solid var(--div);font-size:9.5px}.rcp-h b{font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--tx-s)}.rcp-h .lnk{margin-left:auto}
.rcp-l{max-height:78px;overflow:hidden;padding:2px 4px;display:flex;flex-direction:column}
.rcp-r{display:flex;align-items:center;gap:6px;padding:2px 3px;min-height:26px;font-size:10.5px}.rcp-r .muted{font-size:9.5px}
.lnk{font-size:10px;font-weight:700;color:var(--pri-ink);white-space:nowrap}.lnk:hover{text-decoration:underline}
.nm-a{display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:700;color:var(--tx-m);background:var(--surf-m);border:1px solid var(--bd-s);border-radius:4px;padding:0 4px;height:15px;white-space:nowrap}
.nm-a .ck{width:10px;height:10px;border-width:1.3px}
.rs-c{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;color:var(--a800);background:var(--a50);border:1px solid var(--a200);border-radius:4px;padding:0 4px;height:15px;white-space:nowrap}
.rs-c.ok{color:var(--e700);background:var(--e50);border-color:var(--e200)}
.dcl{display:flex;flex-direction:column;gap:2px;align-items:flex-start;line-height:1.1}
.dcl .w{font-size:9.5px;color:var(--tx-s);white-space:nowrap}.dcl .w.w-u{color:var(--a800);font-weight:700}.dcl .w.w-d{color:var(--e700);font-weight:700}
.xbar{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;min-height:30px;padding:3px 8px;border-bottom:1px solid var(--div);background:var(--surf)}
.xbar .sp{flex:1}
.xbar .btn.xs{gap:3px}
.xbar .cnt{background:var(--a800);color:#fff;border-radius:999px;font-size:8.5px;padding:0 4px;line-height:12px}
.att{display:flex;align-items:center;gap:6px;min-height:28px;padding:3px 8px;border-top:1px solid var(--div);font-size:10.5px;background:var(--surf-m);white-space:nowrap;overflow:hidden}
.att b{font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--tx-s)}
.chp{display:inline-flex;align-items:center;gap:3px;border:1px solid var(--bd);background:var(--surf);border-radius:999px;padding:0 6px;height:18px;font-size:10px;font-weight:700;color:var(--tx-b)}
.chp.on{border-color:var(--pri-ring);background:var(--pri-soft);color:var(--pri-ink)}
.trkic{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px}
.trkic.reg{color:var(--e700);background:var(--e50)}.trkic.pause{color:var(--a800);background:var(--a50)}.trkic.none{color:var(--g500);background:var(--div)}
.lockb{display:flex;align-items:center;gap:6px;border:1px dashed var(--bd-s);border-radius:8px;background:var(--surf-m);padding:7px 9px;font-size:10.5px;color:var(--tx-m);line-height:1.35}
.sl{display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:700}
/* row tint by status (today: STATUS_MAP[].row + decoration tint); wins over .sel/.open, the ring stays */
.tone-red{background:#fee2e2}.tr.tone-red:hover{background:#fecaca}
.tone-gray{background:#f3f4f6}.tr.tone-gray:hover{background:#e5e7eb}
.tone-amber{background:#fef3c7}.tr.tone-amber:hover{background:#fde68a}
.tone-blue{background:#dbeafe}.tr.tone-blue:hover{background:#bfdbfe}
.tone-green{background:#dcfce7}.tr.tone-green:hover{background:#bbf7d0}
.tone-restock{background:#fffbeb}.tr.tone-restock:hover{background:#fef3c7}
.tone-emb{background:#f5f3ff}.tr.tone-emb:hover{background:#ede9fe}
.tone-prt{background:#f0f9ff}.tr.tone-prt:hover{background:#e0f2fe}
/* always-visible strip under a row: decoration files + remarks (Admin only, as today) */
.under{display:flex;align-items:center;gap:16px;min-height:var(--uh,32px);padding:3px 10px 3px 38px;border-bottom:1px solid var(--div);font-size:10.5px;color:var(--tx-b);white-space:nowrap}
.under .uf{display:flex;align-items:center;gap:6px;flex:none}
.under .uf>b{font-size:9.5px;font-weight:400;color:var(--tx-s)}
.under .uf .lnk{display:inline-flex;align-items:center;gap:3px}
.under .uf .cn2{font-weight:700;color:var(--tx-b)}
.under .rem{display:flex;align-items:center;gap:6px;flex:1;min-width:150px}
.under .rem>b{font-size:9.5px;font-weight:400;color:var(--tx-s)}
.under .rem .inp{flex:1;min-width:0;height:22px;background:var(--surf);color:var(--tx-b);overflow:hidden;text-overflow:ellipsis;display:block;line-height:20px}
.under .rem .inp.ph{color:var(--g400)}
`;

/* ----- line level ----- */
export const nameChip = (x, cap) => (x.nameAttr && cap.names ? `<span class="nm-a" title="Custom attribute &quot;name&quot;. Tick to include in the name export"><span class="ck"></span>Name: ${x.nameAttr}</span>` : '');
export const restockLine = (x) => (x.restock ? `<span class="rs-c${x.restock.status === 'back' ? ' ok' : ''}" title="Back-in-stock request: ${x.restock.restocked}/${x.restock.qty} restocked, due ${x.restock.due}">${RESTOCK_SHORT[x.restock.status]} ${x.restock.restocked}/${x.restock.qty}</span>` : '');
const RESTOCK_SHORT = { pending: 'Restock', partial: 'Restock', back: 'Restocked' };
/** Decoration column: EMB/PRT, progress and who is on it. Admin can assign and mark done; staff read-only. */
export function lineDeco(x, cap) {
  if (!x.deco) return '';
  const w = x.work || { state: 'unassigned', done: 0 };
  const kind = `<span class="bdg ${x.deco === 'EMB' ? 'emb' : 'prt'}">${x.deco}</span>`;
  if (w.state === 'unassigned') return `<span class="dcl">${kind}${cap.deco === 2 ? `<button class="btn xs soft" style="height:16px;padding:0 5px">${ic('plus', 'i10')}Assign</button>` : '<span class="w w-u">Unassigned</span>'}</span>`;
  const cls = w.state === 'done' ? 'w-d' : '';
  return `<span class="dcl">${kind}<span class="w ${cls}" title="${w.who} · due ${w.due}">${w.state === 'done' ? '✓ Done' : `${w.done}/${x.qty}`} · ${w.who.split(' ')[0]}</span></span>`;
}
export const lineEdit = () => `<span class="cell" style="gap:0;justify-content:flex-end"><button class="ib" title="Edit line item" style="width:22px">${ic('pencil', 'i')}</button><button class="ib" title="Remove line item" style="width:22px">${ic('trash', 'i')}</button></span>`;

/* ----- order level chips ----- */
export const labelChip = (r, cap) => (cap.labels && r.label ? `<span class="bdg ok" title="Shipping label printed">${ic('tag', 'i10')}Label printed</span>` : '');
export function restockChip(r, cap) {
  const st = cap.reqStock ? restockState(r) : null;
  return st ? `<span class="bdg ${st === 'back' ? 'ok' : 'warn'}" title="Back-in-stock request">${RESTOCK_LABEL[st]}</span>` : '';
}
export function decoProg(r, cap) {
  if (!cap.deco) return '';
  return ['EMB', 'PRT'].map((k) => {
    const d = decoDone(r, k);
    return d.total ? `<span class="bdg ${k === 'EMB' ? 'emb' : 'prt'}" title="${d.done} of ${d.total} ${k === 'EMB' ? 'embroidery' : 'print'} lines done">${d.done}/${d.total} ${k}</span>` : '';
  }).join('');
}
export const closedBadge = (r) => (r.closed ? `<span class="bdg" title="Order closed in Shopify">Closed</span>` : '');
/** Tracking (17track) state icon, admin only. */
export function trackingIcon(r, cap) {
  if (!cap.track || !r.trk) return '';
  const st = r.trk.st === 'Delivered' ? 'reg' : r.req ? 'pause' : 'reg';
  return `<button class="trkic ${st}" title="${st === 'pause' ? 'Tracking paused. Click to restart' : 'Tracking: ' + r.trk.st}">${ic('navTracking', 'i')}</button>`;
}

/** One strip of order-level extras: state chips on the left, role-gated actions on the right. */
export function extrasBar(r, cap, { names = true, track = true } = {}) {
  const chips = [labelChip(r, cap), restockChip(r, cap), decoProg(r, cap), closedBadge(r)].filter(Boolean).join('');
  const nNames = r.items.filter((x) => x.nameAttr).length;
  const acts = [
    cap.reqStock && !r.canceled ? `<button class="btn xs ghost" title="Ask for a supplier restock of lines that are out of stock">${ic('cube', 'i10')}Request stock${restockCount(r) ? `<i class="cnt">${restockCount(r)}</i>` : ''}</button>` : '',
    cap.stockAdj ? `<button class="btn xs ghost" title="Manage stock adjustment">${ic('adjust', 'i10')}Stock ${stockAdjOf(r) ? `${stockAdjOf(r).managed}/${stockAdjOf(r).total}` : '-'}</button>` : '',
    names && cap.names && nNames ? `<button class="btn xs ghost" title="Export name attributes as CSV or print">${ic('download', 'i10')}Export names (${nNames})${ic('chevronDown', 'i10')}</button>` : '',
    cap.lineEdit && !r.canceled && !r.closed ? `<button class="btn xs ghost" title="Edit or remove lines, add a store product or custom item">${ic('pencil', 'i10')}Edit lines</button><button class="btn xs ghost">${ic('plus', 'i10')}Add line</button>` : '',
    track ? trackingIcon(r, cap) : '',
  ].filter(Boolean).join('');
  if (!chips && !acts) return '';
  return `<div class="xbar">${chips}<span class="sp"></span>${acts}</div>`;
}
const restockCount = (r) => r.items.filter((x) => x.restock).length;

/** Attachments (admin, embroidery / print orders). */
export function attachmentsStrip(r, cap) {
  if (!cap.attach || !r.items.some((x) => x.deco)) return '';
  return `<div class="att"><b>${ic('paperclip', 'i10')} Attachments</b><span class="chp on">Files 2</span><span class="chp">Customer design 1</span><span class="chp">Photos 0</span><button class="lnk">${ic('upload', 'i10')} Upload</button><span class="muted ell" style="min-width:0">Customer remark: Crest on left chest, 80 mm, thread matches the club navy.</span></div>`;
}

/** Strip rendered directly under a row, no expanding needed (Admin, EMB / PRT orders; as on today's Orders page):
 *  Files / Customer design / Photo (add files) + Customer remarks. Returns '' for everyone else. */
export function underRow(r, cap, tone = '') {
  if (!(cap.attach && r.items.some((x) => x.deco))) return '';
  const a = r.att || { files: 0, design: 0, photos: 0, remark: '' };
  const f = (label, n, unit) => `<span class="uf"><b>${label}</b><button class="lnk">${ic('paperclip', 'i10')}${n ? `<span class="cn2">${n} ${unit} ·</span> ` : ''}Add files</button></span>`;
  return `<div class="under ${tone}">${f('Files', a.files, a.files === 1 ? 'file' : 'files')}${f('Customer design', a.design, a.design === 1 ? 'file' : 'files')}${f('Photo', a.photos, a.photos === 1 ? 'photo' : 'photos')}<span class="rem"><b>Customer remarks</b><span class="inp${a.remark ? '' : ' ph'}">${a.remark || 'Add a remark for the decorator…'}</span></span></div>`;
}

/** Icon-only order flags for tight rows (full wording in the title). */
export function miniChips(r, cap) {
  const out = [];
  if (cap.labels && r.label) out.push(`<span class="bdg ok" style="padding:0 3px" title="Shipping label printed">${ic('tag', 'i10')}</span>`);
  if (cap.reqStock && restockState(r)) out.push(`<span class="bdg ${restockState(r) === 'back' ? 'ok' : 'warn'}" style="padding:0 3px" title="${RESTOCK_LABEL[restockState(r)]}: back-in-stock request">${ic('cube', 'i10')}</span>`);
  if (r.closed) out.push(closedBadge(r));
  return out.join('');
}
export const lbl = (r, cap) => (cap.labels && r.label ? ' lbl' : '');

/** Customer note (Order.note), shown only inside the expanded order, as today.
 *  Orders page: "Note" box in the actions panel (white, blue border). Picking List (picker): amber box. */
export function customerNote(r, cap) {
  if (!r.note) return '';
  return cap.ful
    ? `<div class="allow-copy" style="border:1px solid var(--b100);border-radius:6px;background:rgba(255,255,255,.7);padding:6px 9px"><h4 style="font-size:9.5px;font-weight:700;text-transform:uppercase;color:var(--g400)">Note</h4><p style="margin-top:3px;font-size:11px;color:var(--tx-m);line-height:1.4;white-space:pre-wrap">${r.note}</p></div>`
    : `<div class="allow-copy" style="border:1px solid var(--a200);border-radius:6px;background:var(--a50);padding:6px 9px;font-size:11px;color:var(--a800);line-height:1.4;white-space:pre-wrap">${r.note}</div>`;
}
