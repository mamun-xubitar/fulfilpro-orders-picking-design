"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type ApiResponse<T> = { success: boolean; message: string; data: T; errors?: string[] };
type LoginMode = "form" | "waiting" | "restricted";
type StaffAccessInfo = {
  timezone: string;
  currentTime: string;
  staffAccessDays: string[];
  staffAccessStart: string;
  staffAccessEnd: string;
  allowedDay: boolean;
  allowedTime: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timedOut = searchParams.get("timeout") === "1";
  const [mode, setMode] = useState<LoginMode>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [approvalRequestId, setApprovalRequestId] = useState("");
  const [approvalExpiresAt, setApprovalExpiresAt] = useState("");
  const [waitingMessage, setWaitingMessage] = useState("Waiting for admin approval...");
  const [restrictedInfo, setRestrictedInfo] = useState<StaffAccessInfo | null>(null);
  const completingRef = useRef(false);

  async function attemptLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const intent = await postJson<{
        mode: "direct" | "approval_required";
        requestId?: string;
        expiresAt?: string;
      }>("/api/auth/login-intent", { email, password });

      if (intent.mode === "approval_required" && intent.requestId) {
        setApprovalRequestId(intent.requestId);
        setApprovalExpiresAt(intent.expiresAt ?? "");
        setWaitingMessage("Waiting for admin approval...");
        setMode("waiting");
        return;
      }

      await completeSignIn();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403) {
        setRestrictedInfo(parseAccessInfo(err.errors?.[0]));
        setMode("restricted");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function completeSignIn(requestId?: string) {
    const result = await signIn("credentials", {
      email,
      password,
      approvalRequestId: requestId,
      redirect: false,
    });

    if (result?.error) {
      console.log("my error", result.error);
      throw new Error("Unable to sign in. Please try again.");
    }

    const callbackUrl = searchParams.get("callbackUrl") || "/orders";
    router.push(callbackUrl);
    router.refresh();
  }

  useEffect(() => {
    if (!approvalRequestId || mode !== "waiting") return;

    const intervalId = window.setInterval(async () => {
      if (completingRef.current) return;

      try {
        const status = await getJson<{
          status: string;
          expiresAt: string;
        }>(`/api/auth/staff-login-approvals/${approvalRequestId}`);

        if (status.status === "approved") {
          completingRef.current = true;
          setWaitingMessage("Approved. Signing you in...");
          await completeSignIn(approvalRequestId);
          return;
        }

        if (status.status === "rejected") {
          setWaitingMessage("Your login request was rejected.");
          window.clearInterval(intervalId);
        }

        if (status.status === "expired") {
          setWaitingMessage("This approval request expired. Please try again.");
          window.clearInterval(intervalId);
        }
      } catch (err) {
        setWaitingMessage(err instanceof Error ? err.message : "Unable to check approval status.");
      }
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [approvalRequestId, mode]);

  function resetToLogin() {
    setMode("form");
    setError("");
    setApprovalRequestId("");
    setApprovalExpiresAt("");
    setWaitingMessage("Waiting for admin approval...");
    completingRef.current = false;
  }

  if (mode === "restricted") {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center" onContextMenu={(e) => e.preventDefault()}>
        <div className="w-full max-w-md px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h1>
            <p className="text-sm text-gray-500 mb-5">
              Staff access is not available for your current day or time window.
            </p>
            {restrictedInfo && (
              <div className="text-left bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 space-y-1 mb-5">
                <p><span className="font-medium text-gray-800">Timezone:</span> {restrictedInfo.timezone}</p>
                <p><span className="font-medium text-gray-800">Current time:</span> {restrictedInfo.currentTime}</p>
                <p><span className="font-medium text-gray-800">Allowed days:</span> {restrictedInfo.staffAccessDays.join(", ")}</p>
                <p><span className="font-medium text-gray-800">Allowed time:</span> {restrictedInfo.staffAccessStart} - {restrictedInfo.staffAccessEnd}</p>
              </div>
            )}
            <button onClick={resetToLogin} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer">
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "waiting") {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center" onContextMenu={(e) => e.preventDefault()}>
        <div className="w-full max-w-md px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4Z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Approval Required</h1>
            <p className="text-sm text-gray-500 mb-4">A confirmation email was sent to the admins. This page checks every 2 seconds.</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 mb-5">
              <p>{waitingMessage}</p>
              {approvalExpiresAt && <p className="text-xs text-gray-500 mt-1">Expires at {new Date(approvalExpiresAt).toLocaleTimeString()}</p>}
            </div>
            <button onClick={resetToLogin} className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors duration-150 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center" onContextMenu={(e) => e.preventDefault()}>
      <div className="w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-blue-600 text-center mb-1">FulfilPro</h1>
            <p className="text-center text-gray-400 text-sm mb-8">Fulfilment Management System</p>
            {timedOut && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg mb-4">
                Your session timed out. Please log in again.
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
            )}
            <form onSubmit={attemptLogin} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {!showPw ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 1.563-3.029m5.858.908a3 3 0 1 1 4.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88 6.59 6.59m7.532 7.532 3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0 1 12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 0 1-4.132 4.411m0 0L21 21"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

async function postJson<T>(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new ApiRequestError(json.message || "Request failed", res.status, json.errors);
  }
  return json.data;
}

async function getJson<T>(url: string) {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new ApiRequestError(json.message || "Request failed", res.status, json.errors);
  }
  return json.data;
}

function parseAccessInfo(value: string | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value) as StaffAccessInfo;
  } catch {
    return null;
  }
}

class ApiRequestError extends Error {
  constructor(message: string, public status: number, public errors?: string[]) {
    super(message);
  }
}
