// Round 19 · Concept L1 "Order Ledger": the fields the client's FileMaker ledger shows that FulfilPro does not store yet
// (payment state, urgent / repeat / VIP, marketing, design track, decoration-room date, per-line prices, remarks,
// stock return, back order). SYNTHETIC, keyed by order number. data.mjs is not modified, so concept A1 is unchanged.
// "Now" is Fri 30 Oct 2026, 14:20 (Australia/Sydney), as in data.mjs.
import { ORDERS, totalQty, packedQty, slipOver24, shipLineOf, contactOf, packHistOf } from './data.mjs';

export const PRICE = { tee: 24.95, polo: 32.5, hoodie: 59, cap: 19.95, bucket: 22, visor: 16.5, bag: 45 };
const MON = { Oct: '10', Nov: '11' };
const p2 = (n) => String(n).padStart(2, '0');
/** "Today 09:42" / "Wed 28 Oct" → 30/10/2026 (the ledger's date format). */
export function dmy(placed) {
  if (placed.startsWith('Today')) return '30/10/2026';
  if (placed.startsWith('Yesterday')) return '29/10/2026';
  const m = placed.match(/(\d+) (\w+)$/);
  return `${p2(m[1])}/${MON[m[2]]}/2026`;
}
/** Hours before "now" → "dd/mm hh:mm". */
export function stamp(hoursAgo) {
  const t = new Date(Date.UTC(2026, 9, 30, 14, 20) - hoursAgo * 3600e3);
  return `${p2(t.getUTCDate())}/${p2(t.getUTCMonth() + 1)} ${p2(t.getUTCHours())}:${p2(t.getUTCMinutes())}`;
}
export const money = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* Per-order ledger fields. Defaults: paid, Visa, every marketing box ticked, no VIP / urgent / repeat.
   pay: paid | unpaid | partial. shipped: per-line shipped qty (overrides the A1 fulfilment for this board only).
   design: sent (designer), approved (who approved), colours (thread numbers). prod: date + time given to the decoration room. */
const OV = {
  '2204': { urgent: '02/11/2026', vip: true, method: 'Mastercard', ful: 'partial', shipped: [3, 2, 0], trk: { carrier: 'AusPost', no: '36K8Z41120', at: '29/10 15:32' }, lines: [{ remark: 'Used 1105 from stock' }, {}, { bo: 2, remark: 'Rest on PO #1036' }] },
  '4752': { urgent: '03/11/2026', method: 'Visa', design: { sent: 'Mia K.', approved: 'Coach Ellie', colours: '' }, prod: { at: '30/10 11:05', room: 'Emb' }, slipRemark: 'Crest left chest, 70 mm', lines: [{ remark: 'Thread 2045 navy' }, { remark: 'Shelf A-04' }] },
  '4821': { pay: 'unpaid', method: 'Unknown', followUp: '02/11/2026' },
  '1190': { method: 'Afterpay', design: { sent: 'Sam T.' }, prod: { at: '30/10 10:20', room: 'Print' } },
  '0733': { repeat: true, method: 'Visa', design: { sent: 'Mia K.', approved: 'Liam O.', colours: '2045 · 2150' }, prod: { at: '30/10 13:10', room: 'Emb' } },
  '4809': { pay: 'partial', paidAmt: 120, method: 'Manual', followUp: '31/10/2026', design: { sent: 'Mia K.' } },
  '1184': { vip: true, method: 'American Express', design: { sent: 'Mia K.', approved: 'Hannah W.' } },
  '0729': { method: 'Visa', design: { sent: 'Sam T.', approved: 'Marcus H.', colours: 'PMS 289' }, prod: { at: '29/10 09:40', room: 'Print' } },
  '1176': { method: 'Mastercard', repeat: true, design: { sent: 'Sam T.', approved: 'Zoe K.', colours: 'White ink' }, prod: { at: '28/10 15:05', room: 'Print' } },
  '4790': { vip: true, method: 'Visa' },
  '2188': { method: 'Visa' },
  '0702': { pay: 'unpaid', method: 'Manual', followUp: '30/10/2026', design: { sent: 'Mia K.', approved: 'Jack T.', colours: '2726' }, prod: { at: '27/10 10:00', room: 'Emb' } },
  '4771': { method: 'Afterpay', refund: 24.95 },
  '1163': { pay: 'unpaid', method: 'Unknown' },
  '2181': { method: 'Visa', design: { sent: 'Sam T.', approved: 'Ben K.' } },
  '4768': { method: 'Mastercard', shipped: [1] },
  '0718': { pay: 'unpaid', method: 'Unknown', followUp: '03/11/2026', repeat: true },
  '1159': { method: 'Visa', design: { sent: 'Mia K.', approved: 'Mei T.', colours: '2150' }, prod: { at: '26/10 09:30', room: 'Emb' } },
  '2176': { method: 'Visa', mkt: { m1: 0, m3: 1, m6: 1, anniv: 1 } },
  '0711': { method: 'Afterpay' },
  '1142': { method: 'Visa' },
  '1150': { method: 'Visa' },
};
export const METHODS = ['Visa', 'Mastercard', 'American Express', 'Afterpay', 'Manual', 'Unknown'];

function lineOf(r, x, i, o, ful) {
  const last = i === r.items.length - 1;
  const shipped = o.shipped ? (o.shipped[i] ?? 0) : ful === 'full' ? x.qty : ful === 'partial' && !last ? x.qty : 0;
  const price = PRICE[x.kind], disc = (r.codes || []).includes('TEAM10') ? 10 : 0;
  const total = +(x.qty * price * (1 - disc / 100)).toFixed(2);
  const onPo = x.po && x.po.status !== 'CANCELLED';
  const status = shipped >= x.qty ? 'SHIPPED' : shipped > 0 ? 'PART' : onPo ? 'PO' : x.packed >= x.qty ? 'PACKED' : 'NEW';
  const tone = { SHIPPED: 'ship', PART: 'part', PO: 'purch' }[status] || '';
  const extra = (o.lines || [])[i] || {};
  return { price, disc, total, shipped, refund: 0, used: x.packed, status, tone, remark: extra.remark || '', bo: extra.bo || 0, ret: extra.ret || 0 };
}

/** Everything the ledger shows for one order, derived from data.mjs plus OV. */
export function ledgerOf(r) {
  const o = OV[r.no] || {};
  const ful = o.ful || r.ful || null;
  const lines = r.items.map((x, i) => lineOf(r, x, i, o, ful));
  const gross = r.items.reduce((a, x) => a + x.qty * PRICE[x.kind], 0);
  const sub = lines.reduce((a, l) => a + l.total, 0), ship = shipLineOf(r).final, total = +(sub + ship).toFixed(2);
  const pay = o.pay || 'paid';
  const paid = r.canceled ? 0 : pay === 'paid' ? total : pay === 'partial' ? o.paidAmt : 0;
  const refunded = o.refund || 0, net = +(paid - refunded).toFixed(2), owing = r.canceled ? 0 : Math.max(0, +(total - paid).toFixed(2));
  const anyShipped = lines.some((l) => l.shipped > 0);
  const star = r.canceled ? 'none' : owing <= 0 ? 'paid' : anyShipped ? 'red' : pay === 'partial' ? 'orange' : 'yellow';
  const late = !r.canceled && !r.closed && slipOver24(r) && ful !== 'full';
  const head = r.canceled ? 'cx' : r.closed ? 'closed' : late ? 'late' : ful === 'full' ? 'ship' : ful === 'partial' ? 'part' : star === 'paid' ? 'paid' : 'new';
  const packedAll = packedQty(r) >= totalQty(r);
  const foot = r.canceled || r.closed ? 'cx' : ful === 'full' ? 'ship' : ful === 'partial' ? 'part' : r.slip != null && !packedAll ? 'pick' : 'new';
  const pos = [...new Set(r.items.filter((x) => x.po && x.po.status !== 'CANCELLED').map((x) => x.po.no))];
  const trk = o.trk || (r.trk ? { carrier: r.trk.carrier, no: r.trk.no, at: '26/10 11:31' } : null);
  const c = contactOf(r);
  return {
    no: r.no, date: dmy(r.placed), ful, lines, head, foot, late, star, pay,
    totals: { gross, disc: +(gross - sub).toFixed(2), sub, ship, tax: +(total / 11).toFixed(2), freight: 0, total, qty: totalQty(r) },
    paid, refunded, net, owing, method: o.method || 'Visa', followUp: o.followUp || '',
    urgent: o.urgent || '', repeat: !!o.repeat, vip: !!o.vip,
    mkt: { m1: 1, m3: 1, m6: 1, anniv: 1, ...(o.mkt || {}) },
    design: o.design || {}, prod: o.prod || null, deco: r.items.some((x) => x.deco),
    pickAt: r.slip != null ? stamp(r.slip) : '', packedAt: packedAll && packedQty(r) ? `${packHistOf(r)[0].at}` : '', packedAll,
    pos, trk, email: c.email, shipTo: c.lines.slice(0, 2).join(', '), slipRemark: o.slipRemark || '',
  };
}
/** Sort the board: urgent orders first (client rule: they float to the top of every list), then the queue order. */
export const ledgerSort = (rows) => [...rows].sort((a, b) => (ledgerOf(b).urgent ? 1 : 0) - (ledgerOf(a).urgent ? 1 : 0));
/** Bottom bar: total net payment and the split by payment method (non-canceled orders of the found set). */
export function paymentTotals(rows) {
  const by = Object.fromEntries(METHODS.map((m) => [m, 0]));
  let all = 0;
  for (const r of rows) { if (r.canceled) continue; const l = ledgerOf(r); by[l.method] += l.net; all += l.net; }
  return { all, by };
}
export { ORDERS };
