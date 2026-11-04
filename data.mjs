// SAMPLE DATA. Synthetic orders for a team/club-merchandise supplier (the real dev DB only holds
// Shopify demo snowboards). Customer names, addresses and order numbers are invented.
// "Now" for every relative time is Fri 30 Oct 2026, 14:20 (Australia/Sydney).

export const STORES = {
  HFC: { code: 'HFC', name: 'Harbour FC Shop', hue: '#4f46e5' },
  NNC: { code: 'NNC', name: 'Northside Netball', hue: '#0891b2' },
  BSC: { code: 'BSC', name: 'Bayside Surf Club', hue: '#c026d3' },
  WRU: { code: 'WRU', name: 'Westgate Rugby', hue: '#475569' },
};

export const PRODUCTS = {
  tee:    { name: 'Club Training Tee',   kind: 'tee',    sku: 'TEE' },
  polo:   { name: 'Pro Match Polo',      kind: 'polo',   sku: 'POL' },
  hood:   { name: 'Team Hoodie',         kind: 'hoodie', sku: 'HOD' },
  cap:    { name: 'Heritage Baseball Cap', kind: 'cap',  sku: 'CAP' },
  bucket: { name: 'Flex School Bucket Hat', kind: 'bucket', sku: 'BKT' },
  visor:  { name: 'Sun Visor',           kind: 'visor',  sku: 'VIS' },
  bag:    { name: 'Kit Bag 60L',         kind: 'bag',    sku: 'BAG' },
};

const COLOR = { Navy: '#1e3a8a', Sky: '#38bdf8', White: '#e5e7eb', Black: '#1f2937', Grey: '#9ca3af', Maroon: '#9f1239', Green: '#15803d', Gold: '#ca8a04' };
const BIN = { tee: 'A-04', polo: 'A-11', hood: 'B-02', cap: 'C-07', bucket: 'C-09', visor: 'C-12', bag: 'D-01' };

// i(product, colour, size, qty, packed, deco?)  deco: 'EMB' | 'PRT'
const i = (p, c, s, qty, packed = 0, deco = null) => {
  const pr = PRODUCTS[p];
  return { prod: p, name: pr.name, kind: pr.kind, colour: c, hex: COLOR[c], size: s, sku: `${pr.sku}-${c.slice(0, 3).toUpperCase()}-${s}`, bin: BIN[p], qty, packed, deco };
};

// o(no, store, customer, placed, items, extra)
// extra: slip (hours since picking slip printed, undefined = not printed), ful ('partial'|'full'),
//        trk (tracking), notes, msgs, req (pending fulfilment request), canceled, ship, addr, label
const o = (no, store, customer, placed, items, x = {}) => ({ no, store, customer, placed, items, ...x });

export const ORDERS = [
  o('4821', 'HFC', 'Amelia Brooks',    'Today 09:42',     [i('tee', 'Navy', 'L', 2), i('polo', 'Black', 'M', 1)],                        { ship: 'Standard', addr: 'Paddington NSW' }),
  o('1190', 'NNC', 'Priya Nair',       'Today 09:15',     [i('hood', 'Grey', 'S', 3, 0, 'PRT')],                                          { notes: 1, ship: 'Express', addr: 'Chatswood NSW' }),
  o('0733', 'BSC', 'Liam O’Connor',    'Today 08:58',     [i('cap', 'Navy', 'OS', 4, 0, 'EMB')],                                          { slip: 1.2, notes: 2, ship: 'Standard', addr: 'Manly NSW' }),
  o('2204', 'WRU', 'Tom Whitaker',     'Yesterday 17:21', [i('tee', 'Maroon', 'XL', 4, 3), i('hood', 'Black', 'L', 2, 0), i('bag', 'Black', 'OS', 2, 0)], { slip: 21, msgs: 1, ship: 'Standard', addr: 'Parramatta NSW' }),
  o('4809', 'HFC', 'Grace Lim',        'Yesterday 15:40', [i('tee', 'Sky', 'M', 6), i('bucket', 'Navy', 'OS', 1, 0, 'EMB')],             { codes: ['CLUB5'], slip: 31, notes: 1, ship: 'Standard', addr: 'Mosman NSW' }),
  o('1184', 'NNC', 'Hannah Wójcik',    'Yesterday 14:05', [i('polo', 'White', 'S', 5, 0), i('visor', 'White', 'OS', 5, 0, 'EMB')],      { codes: ['TEAM10'], slip: 26, ship: 'Express', addr: 'Lane Cove NSW' }),
  o('0729', 'BSC', 'Marcus Hill',      'Yesterday 11:12', [i('hood', 'Navy', 'M', 2, 2, 'PRT'), i('tee', 'Navy', 'M', 3, 3)],             { label: true, slip: 22, ship: 'Standard', addr: 'Dee Why NSW' }),
  o('1176', 'NNC', 'Zoe Kapoor',       'Wed 28 Oct',      [i('hood', 'Maroon', 'S', 2, 2, 'PRT'), i('tee', 'White', 'S', 2, 2), i('cap', 'Black', 'OS', 1, 1)], { slip: 40, msgs: 2, notes: 1, ship: 'Express', addr: 'Neutral Bay NSW', label: true }),
  o('4790', 'HFC', 'Daniel Okafor',    'Wed 28 Oct',      [i('polo', 'Navy', 'L', 8, 8), i('polo', 'Navy', 'XL', 4, 4)],                     { label: true, slip: 52, ship: 'Standard', addr: 'Balmain NSW' }),
  o('2188', 'WRU', 'Isla McKenzie',    'Wed 28 Oct',      [i('tee', 'Green', 'M', 12, 12), i('bag', 'Green', 'OS', 3, 3)],                  { confs: [{ date: 'Mon 26 Oct · 11:31', carrier: 'AusPost', no: '36K8Z40291', st: 'In transit', lines: ['Club Training Tee · Green M × 12'], barcodes: '9300 1122 3344' }, { date: 'Tue 27 Oct · 09:05', carrier: 'AusPost', no: '36K8Z40377', st: 'Delivered', lines: ['Kit Bag 60L · Green OS × 3'], barcodes: '9300 5566 7788' }], label: true, slip: 47, ful: 'full', trk: { carrier: 'AusPost', no: '36K8Z40291', st: 'In transit' }, ship: 'Standard', addr: 'Penrith NSW' }),
  o('0702', 'BSC', 'Jack Tran',        'Tue 27 Oct',      [i('cap', 'White', 'OS', 6, 6, 'EMB')],                                             { slip: 70, ful: 'full', trk: { carrier: 'StarTrack', no: 'ST9920451', st: 'Out for delivery' }, req: 'Edit', ship: 'Express', addr: 'Bondi NSW' }),
  o('4771', 'HFC', 'Sofia Marino',     'Tue 27 Oct',      [i('tee', 'Navy', 'S', 3, 3), i('tee', 'Navy', 'M', 4, 4)],                         { slip: 75, ful: 'full', trk: { carrier: 'AusPost', no: '36K8Z37710', st: 'Delivered' }, ship: 'Standard', addr: 'Newtown NSW' }),
  o('1163', 'NNC', 'Chloe Barrett',    'Tue 27 Oct',      [i('visor', 'Black', 'OS', 2, 0)],                                                  { canceled: true, ship: 'Standard', addr: 'Ryde NSW' }),
  o('2181', 'WRU', 'Ben Kowalski',     'Tue 27 Oct',      [i('hood', 'Green', 'XL', 5, 2, 'PRT'), i('cap', 'Green', 'OS', 5, 0, 'EMB')],      { slip: 29, notes: 1, ship: 'Standard', addr: 'Blacktown NSW' }),
  o('4768', 'HFC', 'Ruby Chen',        'Tue 27 Oct',      [i('bucket', 'Sky', 'OS', 2, 2)],                                                   { slip: 60, ful: 'partial', trk: { carrier: 'AusPost', no: '36K8Z35552', st: 'In transit' }, ship: 'Standard', addr: 'Glebe NSW' }),
  o('0718', 'BSC', 'Oscar Davies',     'Mon 26 Oct',      [i('tee', 'Sky', 'L', 8, 0), i('polo', 'Sky', 'L', 2, 0)],                          { notes: 1, msgs: 1, ship: 'Standard', addr: 'Collaroy NSW' }),
  o('1159', 'NNC', 'Mei Tanaka',       'Mon 26 Oct',      [i('polo', 'Gold', 'M', 4, 4), i('visor', 'Gold', 'OS', 4, 4, 'EMB')],              { slip: 90, ful: 'full', trk: { carrier: 'StarTrack', no: 'ST9917003', st: 'Delivered' }, ship: 'Express', addr: 'Artarmon NSW' }),
  o('2176', 'WRU', 'Callum Reid',      'Mon 26 Oct',      [i('bag', 'Maroon', 'OS', 6, 6), i('tee', 'Maroon', 'L', 6, 6)],                    { slip: 92, ful: 'full', trk: { carrier: 'AusPost', no: '36K8Z31188', st: 'Delivered' }, ship: 'Standard', addr: 'Granville NSW' }),
  o('4752', 'HFC', 'Evelyn Park',      'Mon 26 Oct',      [i('cap', 'Navy', 'OS', 3, 1, 'EMB'), i('tee', 'White', 'M', 3, 3)],                { slip: 8, ship: 'Standard', addr: 'Double Bay NSW' }),
  o('0711', 'BSC', 'Noah Fitzgerald',  'Mon 26 Oct',      [i('hood', 'Black', 'L', 1, 0, 'PRT')],                                             { ship: 'Standard', addr: 'Freshwater NSW' }),
  o('1142', 'NNC', 'Rosa Delgado',     'Sat 24 Oct',      [i('tee', 'Grey', 'M', 2, 2)],                                                      { slip: 130, ful: 'full', closed: true, trk: { carrier: 'AusPost', no: '36K8Z29904', st: 'Delivered' }, ship: 'Standard', addr: 'Epping NSW' }),
  o('1150', 'NNC', 'Aisha Rahman',     'Sun 25 Oct',      [i('tee', 'Sky', 'XS', 10, 0)],                                                     { slip: 3, ship: 'Standard', addr: 'Willoughby NSW' }),
];

// ---- derived state --------------------------------------------------------------------------
export const totalQty = (r) => r.items.reduce((a, b) => a + b.qty, 0);
export const packedQty = (r) => r.items.reduce((a, b) => a + b.packed, 0);
export const fulfilled = (r) => r.ful === 'full';

/** Queue an order belongs to (one only). */
export function queueOf(r) {
  if (r.canceled || r.closed) return 'issues';
  if (r.req) return 'issues';
  if (r.ful === 'full' || r.ful === 'partial') return 'shipped';
  const p = packedQty(r), t = totalQty(r);
  if (p >= t) return 'packed';
  if (r.slip != null) return 'picking';
  return 'topick';
}

export const stage = (r) => {
  const p = packedQty(r), t = totalQty(r);
  return {
    slip: r.slip != null,
    packed: p >= t ? 'done' : p > 0 ? 'part' : 'none',
    ful: r.ful === 'full' ? 'done' : r.ful === 'partial' ? 'part' : 'none',
    trk: r.trk ? (r.trk.st === 'Delivered' ? 'done' : 'part') : 'none',
  };
};

/** Staff cannot see "slip printed", so their queues follow packing status only. */
export function queueOfStaff(r) {
  const q = queueOf(r);
  if (q === 'topick' || q === 'picking') return packedQty(r) > 0 ? 'partial' : 'notpacked';
  return q;
}
export const queueFor = (r, role) => (role === 'staff' ? queueOfStaff(r) : queueOf(r));

export const QUEUES = {
  // Admin and picker pivot on the picking slip: not printed yet / printed, still to pack. Staff cannot see slips.
  admin:  [['all', 'All'], ['topick', 'Slip not printed'], ['picking', 'Slip printed'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['issues', 'Issues']],
  staff:  [['all', 'All'], ['notpacked', 'Not packed'], ['partial', 'Partial'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['issues', 'Issues']],
  picker: [['all', 'Open'], ['topick', 'Slip not printed'], ['picking', 'Slip printed'], ['packed', 'Packed']],
};
export const countOf = (q, role) => {
  const pool = role === 'picker' ? ORDERS.filter((r) => !['shipped', 'issues'].includes(queueOf(r))) : ORDERS;
  return q === 'all' ? pool.length : pool.filter((r) => queueFor(r, role) === q).length;
};
export const byNo = (n) => ORDERS.find((r) => r.no === n);
/** Optional secondary filter (was the only "late" rule): slip printed over 24 h ago and the order is still not fully packed. */
export const slipOver24 = (r) => r.slip != null && r.slip > 24 && !r.canceled && !r.ful && packedQty(r) < totalQty(r);

/* ---------- round 2: store domains, hub stock, purchase orders, Shopify ids ---------- */
// Real mapping when built: domain = Store.storeDomain, productId = Order.lineItems[].productId,
// avail = max(0, SupplierProductVariant.stockOnHand - allocated), po = open PurchaseOrderItem (status: REQUESTED |
// PARTIALLY_RECEIVED | RECEIVED | CANCELLED).
const DOMAIN = { HFC: 'harbour-fc-shop.myshopify.com', NNC: 'northside-netball.myshopify.com', BSC: 'bayside-surf-club.myshopify.com', WRU: 'westgate-rugby.myshopify.com' };
for (const k of Object.keys(STORES)) STORES[k].domain = DOMAIN[k];
const SUPPLIER = { tee: 'Harmony Threads', polo: 'Harmony Threads', hoodie: 'Harmony Threads', cap: 'Coastal Headwear', bucket: 'Coastal Headwear', visor: 'Coastal Headwear', bag: 'Ridgeline Bags' };
const PO = (no, status, ordered, received, eta) => ({ no, status, ordered, received, eta });
const STOCK = {
  'TEE-SKY-M': [2, PO('1042', 'REQUESTED', 24, 0, '3 Nov')],
  'POL-WHI-S': [4, PO('1038', 'PARTIALLY_RECEIVED', 10, 6, '2 Nov')],
  'VIS-WHI-OS': [1, null],
  'TEE-SKY-L': [5, null],
  'CAP-GRE-OS': [2, PO('1044', 'REQUESTED', 12, 0, '5 Nov')],
  'TEE-SKY-XS': [4, PO('1031', 'REQUESTED', 20, 0, '4 Nov')],
  'HOD-GRE-XL': [6, PO('1030', 'RECEIVED', 12, 12, '26 Oct')],
  'BKT-NAV-OS': [3, null],
  'CAP-NAV-OS': [3, PO('1040', 'REQUESTED', 20, 0, '4 Nov')],
  'POL-SKY-L': [0, null],
  'HOD-BLA-L': [14, null],
  'BAG-BLA-OS': [1, PO('1036', 'REQUESTED', 8, 0, '3 Nov')],
};
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
for (const r of ORDERS) for (const x of r.items) {
  const [avail, po] = STOCK[x.sku] || [40 + (hash(x.sku) % 60), null];
  Object.assign(x, { avail, po, supplier: SUPPLIER[x.kind], productId: String(7400000000000 + (hash(x.sku + r.store) % 900000000)) });
}
export const shopifyUrl = (r, x) => `https://${STORES[r.store].domain}/admin/products/${x.productId}`;
/** Still to pick on a line, and whether hub availability does not cover it. */
export const need = (x) => Math.max(0, x.qty - x.packed);
export const isShort = (r, x) => !r.canceled && r.ful !== 'full' && x.avail < need(x) && need(x) > 0;
export const shortCount = (r) => r.items.filter((x) => isShort(r, x)).length;
export const PO_LABEL = { REQUESTED: 'Requested', PARTIALLY_RECEIVED: 'Part received', RECEIVED: 'Received', CANCELLED: 'Cancelled' };

/** Products view: open order lines aggregated by variant. */
export function productRows() {
  const m = new Map();
  for (const r of ORDERS) {
    if (r.canceled || r.ful === 'full') continue;
    for (const x of r.items) {
      if (need(x) === 0) continue;
      const e = m.get(x.sku) || { ...x, qty: 0, packed: 0, orders: [], stores: new Set() };
      e.qty += x.qty; e.packed += x.packed; e.stores.add(r.store);
      e.orders.push({ no: r.no, store: r.store, customer: r.customer, qty: x.qty, packed: x.packed, slipped: r.slip != null, slip: r.slip, placed: r.placed });
      m.set(x.sku, e);
    }
  }
  return [...m.values()].map((e) => ({ ...e, stores: [...e.stores], short: e.avail < e.qty - e.packed })).sort((a, b) => a.bin.localeCompare(b.bin));
}

/** Who the packing notification can go to (today: every staff / admin user, name + email, all ticked by default). Synthetic. */
export const RECIPIENTS = [
  { name: 'Alice Wong', email: 'alice.wong@example.com', role: 'Staff' },
  { name: 'John Doe', email: 'admin@example.com', role: 'Admin' },
  { name: 'Mamun K.', email: 'mamun@example.com', role: 'Admin' },
  { name: 'Customer service', email: 'service@example.com', role: 'Staff' },
  { name: 'Warehouse lead', email: 'warehouse@example.com', role: 'Staff' },
];
/** Customer contact block (full address as in today's Customer Details; email and phone are order fields not shown today; Admin only here). Synthetic. */
const hsh = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
const STREETS = ['Harbour St', 'Elm Ave', 'Station Rd', 'Park Lane', 'Wattle Cres', 'King St'];
export function contactOf(r) {
  const h = hsh(r.no + r.customer), [sub, st] = [r.addr.slice(0, r.addr.lastIndexOf(' ')), r.addr.slice(r.addr.lastIndexOf(' ') + 1)];
  const slug = r.customer.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim().split(/\s+/);
  return { lines: [`${10 + (h % 190)} ${STREETS[h % STREETS.length]}`, `${sub} ${st} ${2000 + (h % 180)}`, 'Australia'], email: `${slug[0]}.${slug[slug.length - 1]}@example.com`, phone: `04${String(10 + (h % 89))} ${String(100 + (h % 899))} ${String(100 + ((h >> 3) % 899))}` };
}

/** Shipping line as today's Orders page shows it: title, price before discount, price after (a shipping code can zero it). Synthetic. */
export function shipLineOf(r) {
  const price = r.ship === 'Express' ? 14 : 10.69;
  const codes = (r.codes || []).filter((c) => c === 'CLUB5');
  return { title: r.ship, price, final: codes.length ? 0 : price, codes };
}

/* ---------- round 3: parity data (restock requests, decoration work, name attributes, confirmations) ---------- */
// Back-in-stock request (today: free-text supplier, no PO link). status: pending | partial | back
const RESTOCK = {
  'VIS-WHI-OS': { status: 'pending', qty: 5, restocked: 0, due: '5 Nov', supplier: 'Coastal Headwear' },
  'CAP-GRE-OS': { status: 'partial', qty: 5, restocked: 2, due: '6 Nov', supplier: 'Coastal Headwear' },
  'HOD-GRE-XL': { status: 'back', qty: 5, restocked: 5, due: '26 Oct', supplier: 'Harmony Threads' },
};
// Decoration work per line. state: unassigned | assigned | working | done
const WORK = {
  'CAP-NAV-OS': { state: 'assigned', done: 0, who: 'Mia K.', due: 'Mon 2 Nov' },
  'VIS-WHI-OS': { state: 'unassigned', done: 0 },
  'BKT-NAV-OS': { state: 'working', done: 0, who: 'Mia K.', due: 'Sat 31 Oct' },
  'HOD-GRE-S': { state: 'assigned', done: 0, who: 'Sam T.', due: 'Mon 2 Nov' },
  'HOD-GRE-XL': { state: 'working', done: 2, who: 'Sam T.', due: 'Sun 1 Nov' },
  'CAP-GRE-OS': { state: 'unassigned', done: 0 },
  'HOD-NAV-M': { state: 'done', done: 2, who: 'Sam T.', due: 'Thu 29 Oct' },
  'HOD-MAR-S': { state: 'done', done: 2, who: 'Sam T.', due: 'Tue 27 Oct' },
  'CAP-WHI-OS': { state: 'done', done: 6, who: 'Mia K.', due: 'Mon 26 Oct' },
  'HOD-BLA-L': { state: 'unassigned', done: 0 },
};
// Name attributes (custom attribute "name" on the line; exported as CSV / print)
const NAMEATTR = { 'HOD-GRE-S': 'PRIYA 12', 'TEE-SKY-M': 'GRACE L.', 'HOD-NAV-M': 'MARCUS 7', 'TEE-MAR-XL': 'WHITAKER 4', 'HOD-MAR-S': 'ZOE 9' };
for (const r of ORDERS) for (const x of r.items) {
  if (RESTOCK[x.sku]) x.restock = RESTOCK[x.sku];
  if (x.deco && WORK[x.sku]) x.work = WORK[x.sku];
  else if (x.deco) x.work = { state: 'unassigned', done: 0 };
  if (NAMEATTR[x.sku]) x.nameAttr = NAMEATTR[x.sku];
}
// Customer note = Order.note (the Shopify checkout note). Shown for every role, as on today's Orders and Picking List pages.
const CUSTOMER_NOTE = {
  '2188': 'Please deliver to the front desk and ask for Isla. Thanks!',
  '4821': 'Please pack the polo separately, it is a gift.',
  '4809': 'Deliver to the club house, not the home address. Gate code 4471.',
  '1184': 'Crest on left chest only. Match the club navy.',
  '2204': 'Captain collects Saturday morning, keep the box sealed.',
  '0702': 'Please leave the parcel with the neighbour at no. 14 if nobody is home.',
  '1176': 'Gift wrap the hoodie please.',
  '2181': 'Split delivery is fine if the caps are late.',
  '0718': 'Need these before the 31st if at all possible, thank you!',
};
// Decoration attachments per order (today: OrderDecorationAttachment). Counts of uploaded files + customer remarks.
const ATTACH = {
  '4809': { files: 2, design: 1, photos: 0, remark: 'Crest on left chest, 80 mm, thread matches the club navy.' },
  '1184': { files: 1, design: 0, photos: 2, remark: '' },
};
for (const r of ORDERS) {
  if (CUSTOMER_NOTE[r.no]) r.note = CUSTOMER_NOTE[r.no];
  r.att = ATTACH[r.no] || { files: 0, design: 0, photos: 0, remark: '' };
}
// Packing confirmations (today: OrderPackingConfirmation, newest first; the Picking List shows up to 5). Orders not listed get one entry.
const PACK_HIST = { '2204': [{ at: 'Thu 09:12', n: 2 }, { at: 'Wed 14:02', n: 1 }] };
export const packHistOf = (r) => PACK_HIST[r.no] || (packedQty(r) > 0 ? [{ at: 'Wed 14:02', n: packedQty(r) }] : []);
export const hasRestock = (r) => r.items.some((x) => x.restock);
/** Order-level back-in-stock state: Need restock (pending) / Partially restocked / Restocked. */
export function restockState(r) {
  const rs = r.items.filter((x) => x.restock).map((x) => x.restock);
  if (!rs.length) return null;
  if (rs.every((q) => q.status === 'back')) return 'back';
  return rs.some((q) => q.restocked > 0) ? 'partial' : 'pending';
}
export const RESTOCK_LABEL = { pending: 'Need restock', partial: 'Partly restocked', back: 'Restocked' };
export const decoDone = (r, kind) => { const l = r.items.filter((x) => x.deco === kind); return { done: l.filter((x) => x.work && x.work.state === 'done').length, total: l.length }; };
/** Fulfilment confirmations (an order can be fulfilled in several parcels). Derived from trk unless set. */
export const confsOf = (r) => r.confs || (r.trk ? [{ date: 'Mon 26 Oct · 11:31', carrier: r.trk.carrier, no: r.trk.no, st: r.trk.st, lines: r.items.map((x) => `${x.name} · ${x.colour} ${x.size} × ${x.qty}`), barcodes: '' }] : []);

/** Stock-adjustment state, as in today's Orders column: lines whose hub stock is settled (fully packed) / all lines. null = nothing to adjust. */
export function stockAdjOf(r) {
  if (r.canceled) return null;
  const total = r.items.length, managed = r.items.filter((x) => x.packed >= x.qty).length;
  return { managed, total, status: managed === total ? 'managed' : managed > 0 ? 'partial' : 'none' };
}
