"use client";
import { useState, useEffect, useRef } from "react";
import useRequest from "@/hooks/useRequest";

type RestrictedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  autoApproved: boolean;
};

type ListData = { today: string; users: RestrictedUser[] };

const SHOWN_DATE_KEY = "loginManagerShownDate";

export default function LoginManager({ isAdmin }: { isAdmin: boolean }) {
  const { request: fetchList } = useRequest<ListData>();
  const { request: save, loading: saving } = useRequest();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");
  const [users, setUsers] = useState<RestrictedUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function load() {
    fetchList({
      url: "/api/auth/login-auto-approvals",
      method: "GET",
      showToast: false,
      onSuccess: ({ data }) => {
        setToday(data.today);
        setUsers(data.users);
        setSelectedIds(data.users.filter((u) => u.autoApproved).map((u) => u.id));

        if (typeof window !== "undefined" && window.localStorage.getItem(SHOWN_DATE_KEY) !== data.today) {
          setOpen(true);
        }
      },
    });
  }

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    if (open) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    if (typeof window !== "undefined" && today) {
      window.localStorage.setItem(SHOWN_DATE_KEY, today);
    }
    setOpen(false);
  }

  function toggleUser(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.length === users.length ? [] : users.map((u) => u.id)));
  }

  function handleSave() {
    save({
      url: "/api/auth/login-auto-approvals",
      method: "PATCH",
      data: { userIds: selectedIds },
      successMessage: "Auto-approvals updated for today",
    });
  }

  if (!isAdmin) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150 cursor-pointer"
        aria-label="Login Manager"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-.7-.06-1.386-.382-2.016z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4" onClick={handleClose}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">Login Manager</h3>
              <p className="text-sm text-gray-500">Auto-approve staff logins for today ({today})</p>
            </div>
            <div className="space-y-1 px-5 py-4 max-h-96 overflow-y-auto">
              {users.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No staff users found</p>
              )}
              {users.length > 0 && (
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 border-b border-gray-100 mb-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === users.length}
                    onChange={toggleSelectAll}
                    className="cursor-pointer rounded border-gray-300 text-blue-600"
                  />
                  <span className="font-medium text-gray-900">Select all</span>
                </label>
              )}
              {users.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="cursor-pointer rounded border-gray-300 text-blue-600"
                  />
                  <span className="font-medium text-gray-900">{u.name}</span>
                  <span className="text-xs text-gray-400">{u.email}</span>
                  <span className="ml-auto text-xs text-gray-400">{u.role}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
              <button
                onClick={handleClose}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
