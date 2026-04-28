"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type UserRecord = {
  pass: string;
  name: string;
  username: string;
  role: string;
  initials: string;
  tfa: boolean;
  firstTime: boolean;
};

const USERS_DB: Record<string, UserRecord> = {
  admin: { pass: "password", name: "John Doe", username: "johndoe", role: "admin", initials: "JD", tfa: true, firstTime: false },
  staff: { pass: "password", name: "Alice Wong", username: "awong", role: "staff", initials: "AW", tfa: false, firstTime: true },
};

function isWithinStaffHours() {
  const now = new Date(), day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
  return day >= 1 && day <= 5 && mins >= 480 && mins < 960;
}

export default function LoginPage() {
  const router = useRouter();
  const [panel, setPanel] = useState<"login" | "2fa">("login");
  const [tfaView, setTfaView] = useState<"setup" | "code">("code");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [tfaError, setTfaError] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pendingUser = useRef<UserRecord | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("fp_user")) {
      router.push("/orders");
    }
  }, [router]);

  function attemptLogin() {
    setLoginError("");
    const rec = USERS_DB[loginUsername];
    if (!rec) { setLoginError("Invalid username or password."); return; }
    if (rec.pass !== loginPassword) { setLoginError("Invalid username or password."); return; }
    if (loginUsername === "inactive") { setLoginError("This account has been deactivated."); return; }
    if (rec.role === "staff" && !isWithinStaffHours()) {
      setLoginError("Access restricted to Mon–Fri 8:00 am – 4:00 pm."); return;
    }
    pendingUser.current = rec;
    setPanel("2fa");
    setTfaView(rec.firstTime ? "setup" : "code");
  }

  function backToLogin() {
    setPanel("login");
    setLoginError("");
    setTfaError("");
  }

  function verifyCode() {
    const code = digits.join("");
    setTfaError("");
    if (code.length < 6) { setTfaError("Please enter all 6 digits."); return; }
    if (code === "123456") {
      sessionStorage.setItem("fp_user", JSON.stringify(pendingUser.current));
      router.push("/orders");
    } else {
      setTfaError("Invalid code. Please try again.");
      setDigits(["", "", "", "", "", ""]);
      digitRefs.current[0]?.focus();
    }
  }

  function digitInput(idx: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = cleaned;
    setDigits(next);
    if (cleaned && idx < 5) digitRefs.current[idx + 1]?.focus();
  }

  function digitKeydown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
    }
  }

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center" onContextMenu={(e) => e.preventDefault()}>
      <div className="w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* LOGIN PANEL */}
          {panel === "login" && (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-blue-600 text-center mb-1">FulfilPro</h1>
              <p className="text-center text-gray-400 text-sm mb-8">Fulfilment Management System</p>
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{loginError}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && attemptLogin()}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && attemptLogin()}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {!showPw ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={attemptLogin}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
                >
                  Login
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 mt-5">
                Demo: <code className="bg-gray-100 px-1 rounded">admin / password</code> → code <code className="bg-gray-100 px-1 rounded">123456</code>
              </p>
            </div>
          )}

          {/* 2FA PANEL */}
          {panel === "2fa" && (
            <div className="p-8">
              <button
                onClick={backToLogin}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-6 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
                Back to login
              </button>

              {/* First-time setup */}
              {tfaView === "setup" && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Connect Authenticator App</h2>
                  <p className="text-sm text-gray-500 mb-5">Scan this QR code with Google Authenticator or Authy.</p>
                  <div className="flex flex-col items-center mb-5">
                    <div className="w-36 h-36 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 mb-3">
                      <svg className="w-10 h-10 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                      </svg>
                      <span className="text-xs text-gray-400 text-center px-2">Scan with Authenticator</span>
                    </div>
                    <div className="w-full">
                      <p className="text-xs text-gray-500 mb-1">Manual setup key</p>
                      <div className="bg-gray-100 rounded-lg px-3 py-2 font-mono text-sm text-gray-600 select-none tracking-widest" style={{ userSelect: "none" }}>ABCD EFGH IJKL MNOP</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setTfaView("code")}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
                  >
                    I&apos;ve scanned it →
                  </button>
                </div>
              )}

              {/* Code entry */}
              {tfaView === "code" && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Enter Authenticator Code</h2>
                  <p className="text-sm text-gray-500 mb-5">Enter the 6-digit code from your authenticator app.</p>
                  {tfaError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{tfaError}</div>
                  )}
                  <div className="flex gap-2 justify-center mb-5">
                    {digits.map((d, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { digitRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => digitInput(idx, e.target.value)}
                        onKeyDown={(e) => digitKeydown(idx, e)}
                        className="digit-input w-11 h-12 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    ))}
                  </div>
                  <button
                    onClick={verifyCode}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
                  >
                    Verify
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
