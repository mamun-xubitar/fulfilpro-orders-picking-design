"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { isOrderPickerRole, isRestrictedSessionRole } from "@/lib/roles";

type StaffAccessInfo = {
  allowed: boolean;
  timezone: string;
  currentTime: string;
  staffAccessDays: string[];
  staffAccessStart: string;
  staffAccessEnd: string;
  allowedDay: boolean;
  allowedTime: boolean;
};

type SessionPolicy = {
  sessionTimeoutMinutes: number | null;
  staffAccess: StaffAccessInfo | null;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export default function RestrictedPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user.role;
  const [staffAccess, setStaffAccess] = useState<StaffAccessInfo | null>(null);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Still clear the local auth session if the tracking update fails.
    }
    await signOut({ callbackUrl: "/" });
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status === "authenticated" && !isRestrictedSessionRole(role)) {
      router.push("/orders");
    }
  }, [role, router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !isRestrictedSessionRole(role)) return;
    let cancelled = false;

    async function loadPolicy() {
      const response = await fetch("/api/auth/session-policy");
      const json = (await response.json()) as ApiResponse<SessionPolicy>;
      if (!response.ok || !json.success) return;
      if (!cancelled) {
        setStaffAccess(json.data.staffAccess);
        if (json.data.staffAccess?.allowed) {
          router.push(isOrderPickerRole(role) ? "/picking-list" : "/orders");
        }
      }
    }

    void loadPolicy();
    const intervalId = window.setInterval(() => {
      void loadPolicy();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [role, router, status]);

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4" onContextMenu={(event) => event.preventDefault()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h1>
        <p className="text-gray-500 text-sm mb-5">Your staff account is outside the allowed access days or time window.</p>

        <div className="text-left bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 space-y-1 mb-5">
          <p><span className="font-medium text-gray-800">Timezone:</span> {staffAccess?.timezone ?? "Loading..."}</p>
          <p><span className="font-medium text-gray-800">Current time:</span> {staffAccess?.currentTime ?? "Loading..."}</p>
          <p><span className="font-medium text-gray-800">Allowed days:</span> {staffAccess?.staffAccessDays.join(", ") ?? "Loading..."}</p>
          <p><span className="font-medium text-gray-800">Allowed time:</span> {staffAccess ? `${staffAccess.staffAccessStart} - ${staffAccess.staffAccessEnd}` : "Loading..."}</p>
        </div>

        <button
          onClick={() => void logout()}
          className="w-full bg-red-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors duration-150 cursor-pointer"
        >
          Logout
        </button>
      </div>
    </main>
  );
}
