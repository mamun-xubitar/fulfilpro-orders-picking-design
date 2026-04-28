"use client";
import { useState, useRef } from "react";

type OrderItem = { name: string; sku: string; qty: number };
type Order = { id: number; number: string; store: string; customer: string; address: string; status: string; date: string; items: OrderItem[] };

const INITIAL_ORDERS: Order[] = [
  { id: 1, number: "#1001", store: "AU Flagship", customer: "Sarah Mitchell", address: "12 George St, Sydney NSW 2000", status: "pending", date: "2026-04-25", items: [{ name: "Classic White Tee", sku: "CWT-M", qty: 2 }, { name: "Blue Denim Jeans", sku: "BDJ-32", qty: 1 }] },
  { id: 2, number: "#1002", store: "NZ Store", customer: "James Thornton", address: "88 Queen St, Auckland 1010, NZ", status: "partial", date: "2026-04-10", items: [{ name: "Running Shoes", sku: "RS-10", qty: 1 }] },
  { id: 3, number: "#1003", store: "AU Flagship", customer: "Emily Chen", address: "55 Collins St, Melbourne VIC 3000", status: "shipped", date: "2026-03-15", items: [{ name: "Linen Shirt", sku: "LS-L", qty: 3 }, { name: "Cotton Socks 3-Pack", sku: "CS3P", qty: 2 }, { name: "Canvas Tote Bag", sku: "CTB-BLK", qty: 1 }] },
  { id: 4, number: "#1004", store: "UK Store", customer: "Oliver Bennett", address: "10 Baker St, London W1U 3BW", status: "pending", date: "2025-12-20", items: [{ name: "Wool Sweater", sku: "WS-XL", qty: 1 }] },
  { id: 5, number: "#1005", store: "NZ Store", customer: "Aroha Williams", address: "44 Lambton Quay, Wellington 6011", status: "partial", date: "2026-04-27", items: [{ name: "Puffer Jacket", sku: "PJ-M", qty: 1 }, { name: "Beanie Hat", sku: "BH-OS", qty: 2 }] },
];

const STORES = ["All Stores", ...Array.from(new Set(INITIAL_ORDERS.map((o) => o.store)))];
const PERIODS = [
  { label: "All", value: "all" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
];

function inPeriod(dateStr: string, period: string): boolean {
  if (period === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (period === "year") return d.getFullYear() === now.getFullYear();
  if (period === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  if (period === "week") {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
  }
  return true;
}

const STATUS_MAP: Record<string, { chip: string; label: string }> = {
  pending: { chip: "bg-white border border-gray-300 text-gray-600", label: "Pending" },
  partial: { chip: "bg-amber-100 text-amber-700 border border-amber-200", label: "Partially Shipped" },
  shipped: { chip: "bg-blue-600 text-white", label: "Fully Shipped" },
};

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [barcodeLists, setBarcodeLists] = useState<Record<number, string[]>>({});
  const [bcInputs, setBcInputs] = useState<Record<number, string>>({});
  const [copies, setCopies] = useState<Record<number, number>>({});
  const [fullChecks, setFullChecks] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    INITIAL_ORDERS.forEach((o) => o.items.forEach((_, ii) => { m[`${o.id}-${ii}`] = true; }));
    return m;
  });
  const [partialValues, setPartialValues] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    INITIAL_ORDERS.forEach((o) => o.items.forEach((it, ii) => { m[`${o.id}-${ii}`] = it.qty; }));
    return m;
  });
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [fulMessages, setFulMessages] = useState<Record<number, string>>({});
  const [lastSynced, setLastSynced] = useState("Last synced: 2 min ago");
  const [refreshRotation, setRefreshRotation] = useState(0);
  const refreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = INITIAL_ORDERS.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = o.customer.toLowerCase().includes(q) || o.number.toLowerCase().includes(q) || o.store.toLowerCase().includes(q);
    const matchStore = storeFilter === "All Stores" || o.store === storeFilter;
    const matchPeriod = inPeriod(o.date, periodFilter);
    return matchSearch && matchStore && matchPeriod;
  });

  function toggleRow(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function toggleFull(oid: number, ii: number, max: number) {
    const key = `${oid}-${ii}`;
    const nowChecked = !fullChecks[key];
    setFullChecks((prev) => ({ ...prev, [key]: nowChecked }));
    if (nowChecked) setPartialValues((prev) => ({ ...prev, [key]: max }));
  }

  function toggleAllFull(oid: number, items: OrderItem[]) {
    const allChecked = items.every((_, ii) => fullChecks[`${oid}-${ii}`] ?? true);
    const next = !allChecked;
    setFullChecks((prev) => {
      const updated = { ...prev };
      items.forEach((_, ii) => { updated[`${oid}-${ii}`] = next; });
      return updated;
    });
    if (next) {
      setPartialValues((prev) => {
        const updated = { ...prev };
        items.forEach((it, ii) => { updated[`${oid}-${ii}`] = it.qty; });
        return updated;
      });
    }
  }

  function validPartial(oid: number, ii: number, max: number, value: string) {
    const v = parseInt(value);
    const clamped = isNaN(v) || v < 1 ? 1 : v > max ? max : v;
    setPartialValues((prev) => ({ ...prev, [`${oid}-${ii}`]: clamped }));
  }

  function addBC(id: number) {
    const v = (bcInputs[id] || "").trim();
    if (!v) return;
    setBarcodeLists((prev) => {
      const existing = prev[id] || [];
      if (existing.includes(v)) return prev;
      return { ...prev, [id]: [...existing, v] };
    });
    setBcInputs((prev) => ({ ...prev, [id]: "" }));
  }

  function removeBC(id: number, v: string) {
    setBarcodeLists((prev) => ({ ...prev, [id]: (prev[id] || []).filter((b) => b !== v) }));
  }

  function confirmFul(id: number) {
    setFulMessages((prev) => ({ ...prev, [id]: "✓ Fulfilment confirmed!" }));
    setTimeout(() => setFulMessages((prev) => ({ ...prev, [id]: "" })), 3000);
  }

  function stepCp(id: number, d: number) {
    setCopies((prev) => ({ ...prev, [id]: Math.max(1, (prev[id] || 1) + d) }));
  }

  function doRefresh() {
    setRefreshRotation((r) => r + 360);
    setLastSynced("Syncing...");
    if (refreshRef.current) clearTimeout(refreshRef.current);
    refreshRef.current = setTimeout(() => setLastSynced("Last synced: just now"), 1200);
  }

  function printLabel(num: string) {
    alert("Print label for " + num);
  }

  return (
    <main className="flex-1 p-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm focus:outline-none cursor-pointer"
        >
          {STORES.map((s) => <option key={s}>{s}</option>)}
        </select>

        <div className="flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm text-sm">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodFilter(p.value)}
              className={`px-3 py-2 transition-colors duration-150 cursor-pointer ${periodFilter === p.value ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={doRefresh}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ transition: "transform .6s ease", transform: `rotate(${refreshRotation}deg)` }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
          <span className="text-xs text-gray-400 whitespace-nowrap">{lastSynced}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order No.</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Store</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-16 text-sm">No orders found.</td>
                </tr>
              )}
              {filtered.map((o, i) => {
                const total = o.items.reduce((s, it) => s + it.qty, 0);
                const s = STATUS_MAP[o.status];
                const isExpanded = expandedId === o.id;
                return (
                  <>
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100">
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900" data-protected style={{ userSelect: "none" }}>{o.number}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">{o.store}</td>
                      <td className="px-4 py-3 text-sm text-gray-700" data-protected style={{ userSelect: "none" }}>{o.customer}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.chip}`}>{s.label}</span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">{total} item{total !== 1 ? "s" : ""}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <div className="tooltip">
                            <button onClick={() => toggleRow(o.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors duration-150 cursor-pointer text-xs font-medium">▼</button>
                            <span className="tt">View Details</span>
                          </div>
                          <div className="tooltip">
                            <button onClick={() => printLabel(o.number)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-150 cursor-pointer">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                              </svg>
                            </button>
                            <span className="tt">Print Label</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`exp-${o.id}`}>
                        <td colSpan={7} className="p-0">
                          <div className="bg-blue-50 border-b border-blue-100 p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                              {/* Customer & Order */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer &amp; Order</h4>
                                <p className="text-sm font-semibold text-gray-800" data-protected style={{ userSelect: "none" }}>{o.customer}</p>
                                <p className="text-xs text-gray-500 mt-1" data-protected style={{ userSelect: "none" }}>{o.address}</p>
                                <p className="text-xs text-gray-400 mt-2">{o.store} · {o.number}</p>
                              </div>

                              {/* Product Fulfilment */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Product Fulfilment</h4>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-blue-200">
                                      <th className="text-left py-1 text-gray-400 font-medium">Product</th>
                                      <th className="text-left py-1 text-gray-400 font-medium">SKU</th>
                                      <th className="text-center py-1 text-gray-400 font-medium">Ord</th>
                                      <th className="text-center py-1 text-gray-400 font-medium">
                                        <label className="inline-flex items-center gap-1 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={o.items.every((_, ii) => fullChecks[`${o.id}-${ii}`] ?? true)}
                                            onChange={() => toggleAllFull(o.id, o.items)}
                                            className="rounded border-gray-300 text-blue-600 cursor-pointer"
                                          />
                                          Full
                                        </label>
                                      </th>
                                      <th className="text-center py-1 text-gray-400 font-medium">Partial</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {o.items.map((it, ii) => {
                                      const key = `${o.id}-${ii}`;
                                      const isFull = fullChecks[key] ?? true;
                                      const pv = partialValues[key] ?? it.qty;
                                      return (
                                        <tr key={ii} className="border-b border-blue-100">
                                          <td className="py-1.5 pr-2 text-gray-700" data-protected style={{ userSelect: "none" }}>{it.name}</td>
                                          <td className="py-1.5 pr-2 font-mono text-gray-500" data-protected style={{ userSelect: "none" }}>{it.sku}</td>
                                          <td className="py-1.5 text-center text-gray-700">{it.qty}</td>
                                          <td className="py-1.5 text-center">
                                            <input
                                              type="checkbox"
                                              checked={isFull}
                                              onChange={() => toggleFull(o.id, ii, it.qty)}
                                              className="rounded border-gray-300 text-blue-600 cursor-pointer"
                                            />
                                          </td>
                                          <td className="py-1.5 text-center">
                                            <input
                                              type="number"
                                              min={1}
                                              max={it.qty}
                                              value={pv}
                                              disabled={isFull}
                                              onChange={(e) => validPartial(o.id, ii, it.qty, e.target.value)}
                                              className="w-14 border border-blue-200 rounded px-1 py-0.5 text-center text-xs bg-white disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Barcode & Actions */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Barcode &amp; Actions</h4>
                                <div className="flex gap-2 mb-2">
                                  <input
                                    type="text"
                                    placeholder="Scan or enter barcode"
                                    value={bcInputs[o.id] ?? o.items[0]?.sku ?? ""}
                                    onChange={(e) => setBcInputs((prev) => ({ ...prev, [o.id]: e.target.value }))}
                                    onKeyDown={(e) => e.key === "Enter" && addBC(o.id)}
                                    className="flex-1 border border-blue-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                  <button
                                    onClick={() => addBC(o.id)}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
                                  >
                                    Add
                                  </button>
                                </div>
                                <div className="chip-list mb-3 min-h-[20px]">
                                  {(barcodeLists[o.id] || []).map((b) => (
                                    <span key={b} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-mono">
                                      {b}
                                      <button onClick={() => removeBC(o.id, b)} className="hover:text-red-500 transition-colors cursor-pointer text-blue-400">×</button>
                                    </span>
                                  ))}
                                </div>
                                <button
                                  onClick={() => confirmFul(o.id)}
                                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors duration-150 cursor-pointer mb-2"
                                >
                                  Confirm Fulfilment
                                </button>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => printLabel(o.number)}
                                    className="flex-1 border border-gray-300 bg-white text-gray-600 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                  >
                                    Print Label
                                  </button>
                                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white select-none">
                                    <button onClick={() => stepCp(o.id, -1)} className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">−</button>
                                    <span className="px-2 text-xs font-medium text-gray-700">{copies[o.id] || 1}</span>
                                    <button onClick={() => stepCp(o.id, 1)} className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">+</button>
                                  </div>
                                </div>
                                {fulMessages[o.id] && (
                                  <div className="mt-2 text-xs text-center text-green-600 font-medium">{fulMessages[o.id]}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
