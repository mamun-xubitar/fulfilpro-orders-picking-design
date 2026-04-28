"use client";
import { useState } from "react";

type User = { id: number; name: string; username: string; email: string; phone: string; role: string; tfa: boolean; active: boolean };

const INITIAL_USERS: User[] = [
  { id: 1, name: "John Doe", username: "johndoe", email: "john@example.com", phone: "+61 400 111 222", role: "admin", tfa: true, active: true },
  { id: 2, name: "Alice Wong", username: "awong", email: "alice@example.com", phone: "+61 400 333 444", role: "staff", tfa: true, active: true },
  { id: 3, name: "Bob Nguyen", username: "bnguyen", email: "bob@example.com", phone: "+61 400 555 666", role: "staff", tfa: false, active: false },
];

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";

function genPwValue() {
  return Array.from({ length: 12 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ufName, setUfName] = useState("");
  const [ufUsername, setUfUsername] = useState("");
  const [ufEmail, setUfEmail] = useState("");
  const [ufPhone, setUfPhone] = useState("");
  const [ufRole, setUfRole] = useState("staff");
  const [autogen, setAutogen] = useState(false);
  const [tempPw, setTempPw] = useState("");
  const [showTfa, setShowTfa] = useState(false);
  const [tfaBadgeText, setTfaBadgeText] = useState("Not connected");
  const [tfaBadgeClass, setTfaBadgeClass] = useState("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600");
  const [formMsg, setFormMsg] = useState("");
  const [formMsgClass, setFormMsgClass] = useState("");
  const [formTitle, setFormTitle] = useState("Add New User");
  const [submitLabel, setSubmitLabel] = useState("Create User");
  const [showCancel, setShowCancel] = useState(false);

  function editUser(id: number) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    setEditingId(id);
    setUfName(u.name);
    setUfUsername(u.username);
    setUfEmail(u.email);
    setUfPhone(u.phone);
    setUfRole(u.role);
    setFormTitle("Edit User");
    setSubmitLabel("Save Changes");
    setShowCancel(true);
    setShowTfa(true);
    setTfaBadgeText(u.tfa ? "Connected" : "Not connected");
    setTfaBadgeClass(`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.tfa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setUfName(""); setUfUsername(""); setUfEmail(""); setUfPhone("");
    setUfRole("staff");
    setFormTitle("Add New User");
    setSubmitLabel("Create User");
    setShowCancel(false);
    setShowTfa(false);
    setFormMsg("");
    setAutogen(false);
    setTempPw("");
  }

  function submitForm() {
    if (!ufName || !ufUsername || !ufEmail) {
      setFormMsg("Please fill in all required fields.");
      setFormMsgClass("text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200");
      return;
    }
    if (editingId) {
      setUsers((prev) => prev.map((u) => u.id === editingId ? { ...u, name: ufName, username: ufUsername, email: ufEmail, phone: ufPhone, role: ufRole } : u));
      setFormMsg("User updated successfully.");
    } else {
      setUsers((prev) => [...prev, { id: Date.now(), name: ufName, username: ufUsername, email: ufEmail, phone: ufPhone, role: ufRole, tfa: false, active: true }]);
      setFormMsg("User created. QR code shown above.");
      setShowTfa(true);
    }
    setFormMsgClass("text-sm px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200");
    setTimeout(() => { setFormMsg(""); cancelEdit(); }, 2500);
  }

  function toggleActive(id: number) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, active: !u.active } : u));
  }

  function handleAutogen(checked: boolean) {
    setAutogen(checked);
    if (checked) setTempPw(genPwValue());
  }

  return (
    <main className="flex-1 p-6">
      <div className="flex flex-col gap-6">

        {/* Add/Edit User Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{formTitle}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input type="text" placeholder="Jane Smith" value={ufName} onChange={(e) => setUfName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Username *</label>
                <input type="text" placeholder="jsmith" value={ufUsername} onChange={(e) => setUfUsername(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" placeholder="jane@example.com" value={ufEmail} onChange={(e) => setUfEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                <input type="tel" placeholder="+61 400 000 000" value={ufPhone} onChange={(e) => setUfPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select value={ufRole} onChange={(e) => setUfRole(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                <option value="admin">Admin — 24/7 access</option>
                <option value="staff">Staff — restricted hours</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autogen} onChange={(e) => handleAutogen(e.target.checked)} className="rounded border-gray-300 text-blue-600 cursor-pointer"/>
                <span className="text-sm text-gray-700">Auto-generate Password</span>
              </label>
              {autogen && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Temporary Password</label>
                  <div className="relative">
                    <input type="text" readOnly value={tempPw} className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-20 text-sm bg-gray-50 font-mono"/>
                    <button onClick={() => setTempPw(genPwValue())} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:underline cursor-pointer">Generate</button>
                  </div>
                </div>
              )}
            </div>

            {/* 2FA section */}
            {showTfa && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Authenticator App</h3>
                <p className="text-xs text-gray-500 mb-3">User must scan this QR code on first login to connect their authenticator app.</p>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white flex-shrink-0">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">2FA Status</p>
                    <span className={tfaBadgeClass}>{tfaBadgeText}</span>
                  </div>
                </div>
              </div>
            )}

            {formMsg && <div className={formMsgClass}>{formMsg}</div>}

            <button onClick={submitForm} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer">{submitLabel}</button>
            {showCancel && (
              <button onClick={cancelEdit} className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors duration-150 cursor-pointer">Cancel</button>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">All Users</h2>
            <span className="text-xs text-gray-400">{users.length} user{users.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">2FA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.tfa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {u.tfa ? "Connected" : "Not connected"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => editUser(u.id)} className="px-2.5 py-1 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer">Edit</button>
                        <button
                          onClick={() => toggleActive(u.id)}
                          className={`px-2.5 py-1 text-xs border rounded-lg transition-colors duration-150 cursor-pointer ${u.active ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                        >
                          {u.active ? "Deactivate" : "Activate"}
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
