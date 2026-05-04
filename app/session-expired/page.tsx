"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function SessionExpiredPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

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

    if (status === "authenticated" && session.user.role !== "staff") {
      router.push("/orders");
    }
  }, [router, session?.user.role, status]);

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4" onContextMenu={(event) => event.preventDefault()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h1>
        <p className="text-gray-500 text-sm mb-6">
          Your staff session has timed out. Please log out, then sign in again to continue.
        </p>
        <button
          onClick={() => void logout()}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
        >
          Logout
        </button>
      </div>
    </main>
  );
}
