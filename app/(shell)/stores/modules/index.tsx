"use client";
import { useState } from "react";

type Store = { id: number; name: string; domain: string; status: string; synced: string };

const INITIAL_STORES: Store[] = [
  { id: 1, name: "AU Flagship", domain: "auflagship.myshopify.com", status: "connected", synced: "3 min ago" },
  { id: 2, name: "NZ Store", domain: "nzstore.myshopify.com", status: "connected", synced: "3 min ago" },
  { id: 3, name: "UK Store", domain: "ukstore.myshopify.com", status: "disconnected", synced: "2 hrs ago" },
];

const SYNC_MAP: Record<string, { chip: string; label: string }> = {
  connected: { chip: "bg-green-100 text-green-700", label: "Live" },
  disconnected: { chip: "bg-gray-100 text-gray-500", label: "Disconnected" },
  error: { chip: "bg-red-100 text-red-600", label: "Error" },
};

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>(INITIAL_STORES);
  const [view, setView] = useState<"table" | "cards">("table");
  const [sName, setSName] = useState("");
  const [sUrl, setSUrl] = useState("");
  const [sKey, setSKey] = useState("");
  const [sSecret, setSSecret] = useState("");
  const [connectMsg, setConnectMsg] = useState("");
  const [connectMsgClass, setConnectMsgClass] = useState("");

  function connectStore() {
    if (!sName || !sUrl || !sKey || !sSecret) {
      setConnectMsg("Please fill in all fields.");
      setConnectMsgClass("text-sm text-red-600");
      return;
    }
    setStores((prev) => [...prev, { id: Date.now(), name: sName, domain: sUrl, status: "connected", synced: "Just now" }]);
    setConnectMsg(`✓ ${sName} connected!`);
    setConnectMsgClass("text-sm text-green-600");
    setSName(""); setSUrl(""); setSKey(""); setSSecret("");
    setTimeout(() => setConnectMsg(""), 4000);
  }

  function disconn(id: number) {
    setStores((prev) => prev.map((s) => s.id === id ? { ...s, status: "disconnected" } : s));
  }

  function reconn(id: number) {
    setStores((prev) => prev.map((s) => s.id === id ? { ...s, status: "connected", synced: "Just now" } : s));
  }

  function delStore(id: number) {
    if (!confirm("Delete this store?")) return;
    setStores((prev) => prev.filter((s) => s.id !== id));
  }

  function StoreActions({ s }: { s: Store }) {
    if (s.status === "connected") {
      return (
        <button onClick={() => disconn(s.id)} className="px-2.5 py-1 text-xs border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors duration-150 cursor-pointer">Disconnect</button>
      );
    }
    return (
      <>
        <button onClick={() => reconn(s.id)} className="px-2.5 py-1 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer mr-1">Reconnect</button>
        <button onClick={() => delStore(s.id)} className="px-2.5 py-1 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors duration-150 cursor-pointer">Delete</button>
      </>
    );
  }

  return (
    <main className="flex-1 p-6 space-y-6">

      {/* Connect New Store */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Connect New Store</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Store Name</label>
            <input type="text" placeholder="My Shopify Store" value={sName} onChange={(e) => setSName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Shopify Store URL</label>
            <input type="text" placeholder="yourstore.myshopify.com" value={sUrl} onChange={(e) => setSUrl(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
            <input type="password" placeholder="••••••••••••••••" value={sKey} onChange={(e) => setSKey(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">API Secret</label>
            <input type="password" placeholder="••••••••••••••••" value={sSecret} onChange={(e) => setSSecret(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={connectStore} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-150 cursor-pointer">Connect Store</button>
          {connectMsg && <span className={connectMsgClass}>{connectMsg}</span>}
        </div>
      </div>

      {/* Connected Stores */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Connected Stores</h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("table")}
              className={`view-btn px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${view === "table" ? "bg-white text-gray-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              ≡ Table
            </button>
            <button
              onClick={() => setView("cards")}
              className={`view-btn px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${view === "cards" ? "bg-white text-gray-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              ⊞ Cards
            </button>
          </div>
        </div>

        {/* Table view */}
        {view === "table" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Store Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Shopify Domain</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sync Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Synced</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => {
                const sc = SYNC_MAP[s.status] || SYNC_MAP.disconnected;
                return (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono" data-protected style={{ userSelect: "none" }}>{s.domain}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.chip}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.synced}</td>
                    <td className="px-4 py-3"><StoreActions s={s} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Cards view */}
        {view === "cards" && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((s) => {
              const sc = SYNC_MAP[s.status] || SYNC_MAP.disconnected;
              return (
                <div key={s.id} className="store-card bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{s.name}</h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5" data-protected style={{ userSelect: "none" }}>{s.domain}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.chip}`}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Last synced: {s.synced}</p>
                  <div className="flex gap-2"><StoreActions s={s} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </main>
  );
}
