"use client";

import { useEffect, useState } from "react";
import type { UserRow } from "@/models/user.model.server";

type ApiResponse<T> = { success: boolean; message: string; data: T; errors?: string[] };

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
const EMPTY_FORM = {
  name: "",
  email: "",
  role: "staff",
  password: "",
};

function genPwValue() {
  return Array.from({ length: 12 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [autogen, setAutogen] = useState(false);
  const [tempPw, setTempPw] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [formMsgClass, setFormMsgClass] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const editing = editingId !== null;
  const formTitle = editing ? "Edit User" : "Add New User";
  const submitLabel = saving ? "Saving..." : editing ? "Save Changes" : "Create User";

  function showMessage(message: string, type: "success" | "error") {
    setFormMsg(message);
    setFormMsgClass(
      type === "success"
        ? "text-sm px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200"
        : "text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200"
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function loadUsers(showInitialLoading = false) {
      if (showInitialLoading) setLoading(true);
      try {
        const data = await getJson<UserRow[]>("/api/users");
        if (cancelled) return;
        setUsers(data);
      } catch (error) {
        if (!cancelled) {
          showMessage(error instanceof Error ? error.message : "Failed to load users", "error");
        }
      } finally {
        if (!cancelled && showInitialLoading) setLoading(false);
      }
    }

    void loadUsers(true);
    const intervalId = window.setInterval(() => {
      void loadUsers();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  function updateForm(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function editUser(user: UserRow) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    });
    setAutogen(false);
    setTempPw("");
    setFormMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAutogen(false);
    setTempPw("");
    setFormMsg("");
  }

  async function submitForm() {
    const password = autogen ? tempPw : form.password;
    const errors = validateForm(password);
    if (errors.length) {
      showMessage(errors[0], "error");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
      };

      if (!editing || password) {
        payload.password = password;
        payload.isTempPassword = autogen;
      }

      const url = editing ? `/api/users/${editingId}` : "/api/users";
      const method = editing ? "PATCH" : "POST";
      const saved = await getJson<UserRow>(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setUsers((prev) => {
        if (editing) return prev.map((user) => user.id === saved.id ? saved : user);
        return [saved, ...prev];
      });

      showMessage(autogen && password ? `User saved. Temporary password: ${password}` : "User saved successfully.", "success");
      setTimeout(cancelEdit, 2500);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Failed to save user", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserRow) {
    setUpdatingId(user.id);
    try {
      const updated = await getJson<UserRow>(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      setUsers((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Failed to update user", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleAutogen(checked: boolean) {
    setAutogen(checked);
    if (checked) {
      const generated = genPwValue();
      setTempPw(generated);
      updateForm("password", "");
    } else {
      setTempPw("");
    }
  }

  function validateForm(password: string) {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push("Full name is required.");
    if (!form.email.trim()) errors.push("Email is required.");
    if (!editing && !password.trim()) errors.push("Password is required.");
    if (password.trim() && password.trim().length < 8) errors.push("Password must be at least 8 characters.");
    return errors;
  }

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{formTitle}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input type="text" placeholder="Jane Smith" value={form.name} onChange={(e) => updateForm("name", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" placeholder="jane@example.com" value={form.email} onChange={(e) => updateForm("email", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select value={form.role} onChange={(e) => updateForm("role", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                <option value="admin">Admin - 24/7 access</option>
                <option value="staff">Staff - restricted hours</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autogen} onChange={(e) => handleAutogen(e.target.checked)} className="rounded border-gray-300 text-blue-600 cursor-pointer"/>
                <span className="text-sm text-gray-700">Auto-generate Password</span>
              </label>

              {autogen ? (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Temporary Password</label>
                  <div className="relative">
                    <input type="text" readOnly value={tempPw} className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-20 text-sm bg-gray-50 font-mono"/>
                    <button onClick={() => setTempPw(genPwValue())} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:underline cursor-pointer">Generate</button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{editing ? "New Password" : "Password *"}</label>
                  <input type="password" placeholder={editing ? "Leave blank to keep current password" : "Minimum 8 characters"} value={form.password} onChange={(e) => updateForm("password", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              )}
            </div>

            {formMsg && <div className={formMsgClass}>{formMsg}</div>}

            <button disabled={saving} onClick={submitForm} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">{submitLabel}</button>
            {editing && (
              <button onClick={cancelEdit} className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors duration-150 cursor-pointer">Cancel</button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">All Users</h2>
            <span className="text-xs text-gray-400">{loading ? "Loading..." : `${users.length} user${users.length !== 1 ? "s" : ""}`}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Session</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No users found.</td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span title={user.sessionStatusDetail} className={`inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSessionBadgeClass(user.sessionStatus)}`}>
                          {user.sessionStatusLabel}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {getSessionTimeText(user)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => editUser(user)} className="px-2.5 py-1 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer">Edit</button>
                        <button
                          disabled={updatingId === user.id}
                          onClick={() => toggleActive(user)}
                          className={`px-2.5 py-1 text-xs border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${user.active ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                        >
                          {user.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function getSessionBadgeClass(status: UserRow["sessionStatus"]) {
  switch (status) {
    case "logged_in":
      return "bg-emerald-100 text-emerald-700";
    case "access_restricted":
      return "bg-amber-100 text-amber-700";
    case "session_timeout":
      return "bg-red-100 text-red-700";
    case "logout":
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function getSessionTimeText(user: UserRow) {
  if (user.sessionStatus === "logout") {
    return user.lastLogoutAt ? `Logged out ${formatDateTime(user.lastLogoutAt)}` : "No active session";
  }

  return user.lastLoginAt ? `Login ${formatDateTime(user.lastLoginAt)}` : "Login time unknown";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

async function getJson<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.errors?.[0]?.split(":").slice(1).join(":").trim() || json.message || "Request failed");
  }
  return json.data;
}
