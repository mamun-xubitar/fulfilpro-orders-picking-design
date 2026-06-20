"use client";
import { useState, useEffect, useRef } from "react";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  orderNumber: string | null;
  lineItemId: string | null;
  relatedRequestId: string | null;
  actionable: boolean;
  actionStatus: string | null;
  readAt: string | null;
  createdAt: string;
};

type Data = { notifications: NotificationRow[]; unreadCount: number };

export default function NotificationBell({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data>({ notifications: [], unreadCount: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  function load() {
    fetch("/api/notifications")
      .then((r) => r.json() as Promise<{ success: boolean; data: Data }>)
      .then((r) => { if (r.success) setData(r.data); })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 3000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  async function markRead(id: string) {
    const wasUnread = !!data.notifications.find((n) => n.id === id && !n.readAt);
    setData((prev) => ({
      unreadCount: Math.max(0, prev.unreadCount - (wasUnread ? 1 : 0)),
      notifications: prev.notifications.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n),
    }));
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read" }),
    });
  }

  async function markAllRead() {
    setData((prev) => ({
      unreadCount: 0,
      notifications: prev.notifications.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    }));
    await fetch(`/api/notifications`, { method: "POST" });
  }

  async function actOnRequest(notifId: string, action: "accept" | "reject") {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.relatedRequestId === prev.notifications.find((x) => x.id === notifId)?.relatedRequestId && n.actionable
          ? { ...n, actionStatus: action === "accept" ? "accepted" : "rejected" }
          : n
      ),
    }));
    await fetch(`/api/notifications/${notifId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150 cursor-pointer"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {data.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {data.unreadCount > 99 ? "99+" : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[520px] flex flex-col bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {data.unreadCount > 0 && (
              <button
                onClick={() => void markAllRead()}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {data.notifications.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-gray-400">No notifications</div>
            )}

            {data.notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => { if (!n.readAt) void markRead(n.id); }}
                className={`px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors duration-100 ${!n.readAt ? "bg-blue-50/40 cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.readAt ? "bg-blue-500" : "bg-transparent"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 leading-snug">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                    {n.orderNumber && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">Order #{n.orderNumber}</p>
                    )}
                    {n.actionable && isAdmin && (
                      <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={!!n.actionStatus}
                          onClick={() => void actOnRequest(n.id, "accept")}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors duration-150 ${
                            n.actionStatus
                              ? n.actionStatus === "accepted"
                                ? "bg-green-100 text-green-700 opacity-70 cursor-default"
                                : "bg-gray-100 text-gray-400 opacity-60 cursor-default"
                              : "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                          }`}
                        >
                          {n.actionStatus === "accepted" ? "Approved" : "Approve"}
                        </button>
                        <button
                          disabled={!!n.actionStatus}
                          onClick={() => void actOnRequest(n.id, "reject")}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors duration-150 ${
                            n.actionStatus
                              ? n.actionStatus === "rejected"
                                ? "bg-red-100 text-red-700 opacity-70 cursor-default"
                                : "bg-gray-100 text-gray-400 opacity-60 cursor-default"
                              : "bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                          }`}
                        >
                          {n.actionStatus === "rejected" ? "Rejected" : "Reject"}
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1.5">{formatAge(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatAge(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
