"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

type ApiResponse<T> = { success: boolean; message: string; data: T; errors?: string[] };

const STRENGTH_LEVELS = [
  { w: "0%", c: "", t: "", lc: "" },
  { w: "25%", c: "bg-red-400", t: "Weak", lc: "text-red-500" },
  { w: "50%", c: "bg-amber-400", t: "Fair", lc: "text-amber-500" },
  { w: "75%", c: "bg-yellow-400", t: "Good", lc: "text-amber-500" },
  { w: "100%", c: "bg-green-500", t: "Strong", lc: "text-green-600" },
];

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConf, setPwConf] = useState("");
  const [pwBarWidth, setPwBarWidth] = useState("0%");
  const [pwBarColor, setPwBarColor] = useState("");
  const [pwLabel, setPwLabel] = useState("");
  const [pwLabelClass, setPwLabelClass] = useState("text-xs mt-1");
  const [pwMsg, setPwMsg] = useState("");
  const [pwMsgClass, setPwMsgClass] = useState("");
  const [showPwMsg, setShowPwMsg] = useState(false);
  const [saving, setSaving] = useState(false);

  const user = session?.user;

  function checkStrength(v: string) {
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    const lv = v.length === 0 ? STRENGTH_LEVELS[0] : STRENGTH_LEVELS[Math.max(1, s)];
    setPwBarWidth(lv.w);
    setPwBarColor(lv.c);
    setPwLabel(lv.t);
    setPwLabelClass(`text-xs mt-1 ${lv.lc}`);
  }

  async function updatePw() {
    if (!pwCur || !pwNew || !pwConf) {
      showPasswordMessage("Please fill in all password fields.", "error");
      return;
    }
    if (pwNew !== pwConf) {
      showPasswordMessage("New passwords do not match.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwCur,
          newPassword: pwNew,
          confirmPassword: pwConf,
        }),
      });
      const json = (await res.json()) as ApiResponse<null>;

      if (!res.ok || !json.success) {
        throw new Error(json.errors?.[0] || json.message || "Failed to update password");
      }

      showPasswordMessage("Password updated successfully.", "success");
      setPwCur("");
      setPwNew("");
      setPwConf("");
      setPwBarWidth("0%");
      setPwBarColor("");
      setPwLabel("");
      void update();
    } catch (error) {
      showPasswordMessage(error instanceof Error ? error.message : "Failed to update password.", "error");
    } finally {
      setSaving(false);
    }
  }

  function showPasswordMessage(message: string, type: "success" | "error") {
    setPwMsg(message);
    setPwMsgClass(
      type === "success"
        ? "text-sm px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200"
        : "text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200"
    );
    setShowPwMsg(true);
    if (type === "success") {
      setTimeout(() => setShowPwMsg(false), 3000);
    }
  }

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3">
              {getInitials(user?.name ?? user?.email ?? "")}
            </div>
            <h2 className="text-white font-bold text-xl">{user?.name}</h2>
            <p className="text-blue-200 text-sm mt-1">{formatRole(user?.role)}</p>
          </div>

          <div className="p-4 space-y-6 md:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Full Name</p>
                <p className="text-sm font-medium text-gray-800" data-protected>{user?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Email</p>
                <p className="text-sm font-medium text-gray-800 break-words" data-protected>{user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Role</p>
                <p className="text-sm font-medium text-gray-800">{formatRole(user?.role)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Account Status</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
              </div>
            </div>

            <hr className="border-gray-100"/>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Change Password</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
                  <input type="password" value={pwCur} onChange={(e) => setPwCur(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                  <input
                    type="password"
                    value={pwNew}
                    onChange={(e) => { setPwNew(e.target.value); checkStrength(e.target.value); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`strength-bar h-full rounded-full ${pwBarColor}`} style={{ width: pwBarWidth }}></div>
                  </div>
                  <p className={pwLabelClass}>{pwLabel}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
                  <input type="password" value={pwConf} onChange={(e) => setPwConf(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                {showPwMsg && <div className={pwMsgClass}>{pwMsg}</div>}
                <button disabled={saving} onClick={() => void updatePw()} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function formatRole(role: string | undefined) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "";
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}
