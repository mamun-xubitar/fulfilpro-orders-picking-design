"use client";
import { useState, useEffect, useRef } from "react";

type SessionUser = { name: string; username: string; role: string; initials: string; tfa: boolean };

const STRENGTH_LEVELS = [
  { w: "0%", c: "", t: "", lc: "" },
  { w: "25%", c: "bg-red-400", t: "Weak", lc: "text-red-500" },
  { w: "50%", c: "bg-amber-400", t: "Fair", lc: "text-amber-500" },
  { w: "75%", c: "bg-yellow-400", t: "Good", lc: "text-amber-500" },
  { w: "100%", c: "bg-green-500", t: "Strong", lc: "text-green-600" },
];

export default function ProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
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
  const [tfaConnected, setTfaConnected] = useState(false);
  const [showTfaSteps, setShowTfaSteps] = useState(false);
  const [showTfaQr, setShowTfaQr] = useState(false);
  const [step, setStep] = useState(1);
  const [showConnectedActions, setShowConnectedActions] = useState(false);
  const [showConnectBtn, setShowConnectBtn] = useState(false);
  const [tfaDigits, setTfaDigits] = useState(["", "", "", "", "", ""]);
  const [saveMsg, setSaveMsg] = useState("");
  const [showSaveMsg, setShowSaveMsg] = useState(false);
  const tfaRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("fp_user");
      if (stored) {
        const u = JSON.parse(stored) as SessionUser;
        setUser(u);
        setTfaConnected(u.tfa);
        if (u.tfa) {
          setShowConnectedActions(true);
          setShowConnectBtn(false);
        } else {
          setShowConnectedActions(false);
          setShowConnectBtn(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

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

  function updatePw() {
    if (!pwCur || !pwNew || !pwConf) {
      setPwMsg("Please fill in all password fields.");
      setPwMsgClass("text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200");
      setShowPwMsg(true); return;
    }
    if (pwNew !== pwConf) {
      setPwMsg("New passwords do not match.");
      setPwMsgClass("text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200");
      setShowPwMsg(true); return;
    }
    setPwMsg("Password updated successfully.");
    setPwMsgClass("text-sm px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200");
    setShowPwMsg(true);
    setPwCur(""); setPwNew(""); setPwConf("");
    setPwBarWidth("0%"); setPwBarColor(""); setPwLabel("");
    setTimeout(() => setShowPwMsg(false), 3000);
  }

  function relinkAuth() {
    setShowTfaSteps(true);
    setShowTfaQr(true);
    setShowConnectedActions(false);
    setStep(1);
  }

  function connectAuth() {
    setShowTfaSteps(true);
    setShowTfaQr(true);
    setShowConnectBtn(false);
    setStep(1);
  }

  function verifyTfa() {
    const code = tfaDigits.join("");
    if (code.length < 6) { alert("Please enter all 6 digits."); return; }
    setStep(3);
    setShowTfaQr(false);
    setShowTfaSteps(false);
    setTfaConnected(true);
    setShowConnectedActions(true);
    setShowConnectBtn(false);
  }

  function tfaDigitInput(idx: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...tfaDigits];
    next[idx] = cleaned;
    setTfaDigits(next);
    if (cleaned && idx < 5) tfaRefs.current[idx + 1]?.focus();
  }

  function tfaDigitKeydown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !tfaDigits[idx] && idx > 0) {
      tfaRefs.current[idx - 1]?.focus();
    }
  }

  function saveProfile() {
    setSaveMsg("✓ Profile saved successfully.");
    setShowSaveMsg(true);
    setTimeout(() => setShowSaveMsg(false), 3000);
  }

  const tfaBadge = tfaConnected
    ? { text: "Connected", cls: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700" }
    : { text: "Not connected", cls: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600" };

  function stepClass(n: number) {
    return `px-2 py-1 rounded-full font-medium ${n <= step ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`;
  }

  return (
    <main className="flex-1 p-6">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Avatar header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3">
              {user?.initials}
            </div>
            <h2 className="text-white font-bold text-xl">{user?.name}</h2>
            <p className="text-blue-200 text-sm mt-1">{user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Info display */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Full Name</p>
                <p className="text-sm font-medium text-gray-800" data-protected>{user?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Username</p>
                <p className="text-sm font-medium text-gray-800" data-protected>{user?.username}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Role</p>
                <p className="text-sm font-medium text-gray-800">{user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Account Status</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
              </div>
            </div>

            <hr className="border-gray-100"/>

            {/* Change password */}
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
                <button onClick={updatePw} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer">Update Password</button>
              </div>
            </div>

            <hr className="border-gray-100"/>

            {/* Authenticator */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Authenticator App</h3>
                <span className={tfaBadge.cls}>{tfaBadge.text}</span>
              </div>

              {/* Step indicator */}
              {showTfaSteps && (
                <div className="flex items-center gap-2 mb-4 text-xs">
                  <span className={stepClass(1)}>1. Scan QR</span>
                  <span className="text-gray-300">→</span>
                  <span className={stepClass(2)}>2. Enter code</span>
                  <span className="text-gray-300">→</span>
                  <span className={stepClass(3)}>3. Confirmed ✓</span>
                </div>
              )}

              {/* QR flow */}
              {showTfaQr && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 mb-3">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white flex-shrink-0">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Manual key</p>
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs text-gray-600" data-protected style={{ userSelect: "none" }}>ABCD EFGH IJKL MNOP</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 justify-center">
                    {tfaDigits.map((d, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { tfaRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => tfaDigitInput(idx, e.target.value)}
                        onKeyDown={(e) => tfaDigitKeydown(idx, e)}
                        className="digit-input w-10 h-11 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    ))}
                  </div>
                  <button onClick={verifyTfa} className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-150 cursor-pointer">Verify Code</button>
                </div>
              )}

              {showConnectedActions && (
                <div>
                  <button onClick={relinkAuth} className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-150 cursor-pointer">Re-link Authenticator</button>
                </div>
              )}
              {showConnectBtn && (
                <div>
                  <button onClick={connectAuth} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-150 cursor-pointer">Connect Authenticator App</button>
                </div>
              )}
            </div>

            <button onClick={saveProfile} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer">Save Changes</button>
            {showSaveMsg && <div className="text-sm text-center text-green-600">{saveMsg}</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
