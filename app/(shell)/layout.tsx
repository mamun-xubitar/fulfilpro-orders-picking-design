"use client";
// import LoginManager from "@/app/(shell)/LoginManager";
import LoginManagerModal from "@/app/(shell)/LoginManagerModal";
import LoginManagerNavTrigger from "@/app/(shell)/LoginManagerNavTrigger";
import MessagesChatButton from "@/app/(shell)/MessagesChatButton";
import NotificationBell from "@/app/(shell)/NotificationBell";
import TasksButton from "@/app/(shell)/TasksButton";
import useLoginManager from "@/app/(shell)/useLoginManager";
import { PageHeadingProvider, usePageHeading } from "@/components/PageHeadingContext";
import { isDecoratorRole, isOrderPickerRole, isRestrictedSessionRole } from "@/lib/roles";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MESSAGES_POLL_INTERVAL_MS = 15_000;

type SessionPolicy = {
  forceLogout: boolean;
  sessionTimeoutMinutes: number | null;
  inactivityTimeoutMinutes: number | null;
  staffAccess: null | {
    allowed: boolean;
    timezone: string;
    currentTime: string;
    staffAccessDays: string[];
    staffAccessStart: string;
    staffAccessEnd: string;
    allowedDay: boolean;
    allowedTime: boolean;
  };
};

type ApiResponse<T> = { success: boolean; message: string; data: T };

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [policy, setPolicy] = useState<SessionPolicy | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [sessionWarningDismissed, setSessionWarningDismissed] = useState(false);
  const [blockedActionMessage, setBlockedActionMessage] = useState("");
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
  const inactivityWarningActiveRef = useRef(false);
  const inactivityLogoutTriggeredRef = useRef(false);
  const blockedActionWarningAt = useRef(0);
  const blockedActionTimer = useRef<number | null>(null);
  const isOrdersPath = pathname === "/orders" || pathname.startsWith("/orders/") || pathname === "/decoration" || pathname.startsWith("/decoration/") || pathname === "/picking-list" || pathname.startsWith("/picking-list/");
  const userIsOrderPicker = isOrderPickerRole(session?.user?.role);
  const userIsDecorator = isDecoratorRole(session?.user?.role);
  const blockOrdersCopy = isOrdersPath && session?.user?.role !== "admin";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function loadPolicy() {
      try {
        const nextPolicy = await getJson<SessionPolicy>("/api/auth/session-policy");
        if (!cancelled) setPolicy(nextPolicy);
      } catch {
        // Keep the current session usable if policy refresh fails briefly.
      }
    }

    void loadPolicy();
    const policyInterval = window.setInterval(() => {
      void loadPolicy();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(policyInterval);
    };
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function loadUnreadMessageCount() {
      try {
        const data = await getJson<{ unreadCount: number }>("/api/conversations/unread-count");
        if (!cancelled) setUnreadMessageCount(data.unreadCount);
      } catch {
        // Keep the last known count if the poll fails briefly.
      }
    }

    void loadUnreadMessageCount();
    const messagesInterval = window.setInterval(() => {
      void loadUnreadMessageCount();
    }, MESSAGES_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(messagesInterval);
    };
  }, [status]);

  useEffect(() => {
    const checkWidth = () => setSidebarCollapsed(window.innerWidth < 1500);
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const avatarBtn = document.getElementById("avatar-btn");
      const userMenu = document.getElementById("user-menu");
      if (!avatarBtn?.contains(target) && !userMenu?.contains(target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!blockOrdersCopy) {
      return;
    }

    const showBlockedActionMessage = () => {
      const currentTime = Date.now();
      if (currentTime - blockedActionWarningAt.current < 1200) return;
      blockedActionWarningAt.current = currentTime;
      setBlockedActionMessage("Copy and selection are blocked on the orders page.");
      if (blockedActionTimer.current !== null) {
        window.clearTimeout(blockedActionTimer.current);
      }
      blockedActionTimer.current = window.setTimeout(() => {
        setBlockedActionMessage("");
        blockedActionTimer.current = null;
      }, 2200);
    };

    const isCopyAllowed = (node: Node | null | undefined) => {
      const element = node instanceof Element ? node : node?.parentElement ?? null;
      return Boolean(element?.closest(".allow-copy"));
    };

    const eventIsAllowed = (event: Event) =>
      isCopyAllowed(event.target as Node | null) ||
      isCopyAllowed(window.getSelection()?.anchorNode);

    const blockAction = (event: Event) => {
      if (eventIsAllowed(event)) return;
      event.preventDefault();
      showBlockedActionMessage();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blocksSelectOrCopy = (event.ctrlKey || event.metaKey) && (key === "a" || key === "c");

      if (!blocksSelectOrCopy) return;
      if (eventIsAllowed(event)) return;

      event.preventDefault();
      event.stopPropagation();
      showBlockedActionMessage();
    };

    document.addEventListener("copy", blockAction);
    document.addEventListener("cut", blockAction);
    document.addEventListener("selectstart", blockAction);
    document.addEventListener("dragstart", blockAction);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("copy", blockAction);
      document.removeEventListener("cut", blockAction);
      document.removeEventListener("selectstart", blockAction);
      document.removeEventListener("dragstart", blockAction);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [blockOrdersCopy]);

  useEffect(() => {
    return () => {
      if (blockedActionTimer.current !== null) {
        window.clearTimeout(blockedActionTimer.current);
      }
    };
  }, []);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Still clear the local auth session if the tracking update fails.
    }
    await signOut({ callbackUrl: "/" });
  }

  type NavItem = {
    id: string;
    label: string;
    href: string;
    icon: React.ReactNode;
    adminOnly: boolean;
    pickerHidden?: boolean;
    pickerOnly?: boolean;
    adminDecoratorOnly: boolean;
    children?: { id: string; label: string; href: string }[];
  };

  const navItems: NavItem[] = [
    {
      id: "orders", label: "Orders", href: "/orders",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>,
      adminOnly: false,
      pickerHidden: true,
      adminDecoratorOnly: false,
    },
    {
      id: "decoration", label: "Decoration", href: "/decoration",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>,
      adminOnly: false,
      pickerHidden: true,
      adminDecoratorOnly: true,
    },
    {
      id: "picking-list", label: "Picking List", href: "/picking-list",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-6 4h4M7 3h10a2 2 0 012 2v14l-3-2-3 2-3-2-3 2V5a2 2 0 012-2z" />,
      adminOnly: false,
      pickerOnly: true,
      adminDecoratorOnly: false,
    },
    {
      id: "back-in-stock", label: "Back In Stock", href: "/back-in-stock",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7h-9m0 0 3-3m-3 3 3 3M4 17h9m0 0-3-3m3 3-3 3M5 7h2m10 10h2" />,
      adminOnly: false,
      pickerHidden: true,
      adminDecoratorOnly: false,
    },
    {
      id: "tasks", label: "Tasks", href: "/tasks",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
      adminOnly: false,
      pickerHidden: false,
      adminDecoratorOnly: false,
    },
    {
      id: "messages", label: "Messages", href: "/messages",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />,
      adminOnly: false,
      pickerHidden: false,
      adminDecoratorOnly: false,
    },
    {
      id: "tracking", label: "Tracking", href: "/tracking",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
      adminOnly: false,
      pickerHidden: true,
      adminDecoratorOnly: false,
    },
    {
      id: "stores", label: "Stores", href: "/stores",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>,
      adminOnly: true,
      pickerHidden: true,
      adminDecoratorOnly: false,
    },
    {
      id: "inventory", label: "Inventory", href: "/inventory",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>,
      adminOnly: true,
      pickerHidden: true,
      adminDecoratorOnly: false,
    },
    {
      id: "users", label: "Users", href: "/users",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>,
      adminOnly: true,
      pickerHidden: true,
      adminDecoratorOnly: false,
    },
    {
      id: "settings", label: "Settings", href: "/settings",
      icon: (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </>
      ),
      adminOnly: true,
      pickerHidden: true,
      adminDecoratorOnly: false,
    },
  ];

  const pageTitles: Record<string, string> = { orders: "Orders", decoration: "Decoration", "picking-list": "Picking List", "back-in-stock": "Back In Stock", tasks: "Tasks", messages: "Messages", tracking: "Tracking", stores: "Stores", inventory: "Inventory", users: "Users", profile: "Profile", settings: "Settings" };
  const activeId = pathname.split("/")[1] || "";
  const activeChildId = pathname.split("/")[2] || "";
  const activeChild = navItems.find((i) => i.id === activeId)?.children?.find((c) => c.id === activeChildId);

  const sidebarWidth = sidebarCollapsed ? "64px" : "240px";
  const user = session?.user;
  const loginManager = useLoginManager(user?.role === "admin");
  const initials = getInitials(user?.name ?? user?.email ?? "");
  const isStaff = isRestrictedSessionRole(user?.role);
  const loginAt = user?.loginAt ?? now;
  const timeoutMinutes = isStaff ? policy?.sessionTimeoutMinutes ?? null : null;
  const expiresAt = timeoutMinutes ? loginAt + timeoutMinutes * 60 * 1000 : null;
  const remainingMs = expiresAt ? expiresAt - now : null;
  const remainingMinutes = remainingMs === null ? 0 : Math.max(0, Math.ceil(remainingMs / 60_000));
  const showSessionWarning = Boolean(
    isStaff && remainingMs && remainingMs > 0 && remainingMs <= 15 * 60 * 1000 && !sessionWarningDismissed
  );
  const staffRestricted = policy?.staffAccess && !policy.staffAccess.allowed;

  const inactivityThresholdMs = isStaff && policy?.inactivityTimeoutMinutes
    ? policy.inactivityTimeoutMinutes * 60 * 1000
    : null;
  const inactiveForMs = now - lastActivityAt;
  const inactivityCountdownMs = inactivityThresholdMs !== null
    ? Math.max(0, inactivityThresholdMs - inactiveForMs)
    : null;
  const showInactivityWarning = Boolean(inactivityCountdownMs !== null && inactivityCountdownMs <= 60_000);
  const inactivityCountdownSecs = inactivityCountdownMs !== null
    ? Math.ceil(inactivityCountdownMs / 1000)
    : 0;

  useEffect(() => {
    if (status !== "authenticated" || !policy?.forceLogout) return;
    void logout();
  }, [status, policy]);

  useEffect(() => {
    if (status !== 'authenticated' || !isStaff || !policy || remainingMs === null || remainingMs > 0) return;
    router.push('/session-expired');
  }, [isStaff, policy, remainingMs, router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !isStaff) return;

    function handleActivity() {
      if (inactivityWarningActiveRef.current) return;
      setLastActivityAt(Date.now());
    }

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;
    events.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }));
    return () => events.forEach((e) => document.removeEventListener(e, handleActivity));
  }, [status, isStaff]);

  useEffect(() => {
    inactivityWarningActiveRef.current = showInactivityWarning;
  }, [showInactivityWarning]);

  useEffect(() => {
    if (!showInactivityWarning || inactivityCountdownSecs > 0) return;
    if (inactivityLogoutTriggeredRef.current) return;
    inactivityLogoutTriggeredRef.current = true;
    void logout();
  });

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </main>
    );
  }

  return (
    <PageHeadingProvider>
    <div className={blockOrdersCopy ? "protected-orders-page" : undefined}>
      {blockOrdersCopy && blockedActionMessage && (
        <div
          role="alert"
          className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-lg"
        >
          {blockedActionMessage}
        </div>
      )}

      {showInactivityWarning && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-gray-900/60">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-2">Still there?</h2>
            <p className="text-sm text-gray-500 text-center mb-5">You will be logged out due to inactivity in</p>
            <div className="text-5xl font-bold text-amber-500 text-center mb-6 tabular-nums">
              {inactivityCountdownSecs}
              <span className="text-lg font-medium text-gray-400 ml-1">s</span>
            </div>
            <button
              onClick={() => {
                inactivityWarningActiveRef.current = false;
                inactivityLogoutTriggeredRef.current = false;
                setLastActivityAt(Date.now());
              }}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
            >
              Stay Logged In
            </button>
          </div>
        </div>
      )}

      {showSessionWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-amber-950 px-4 py-2 flex items-center justify-between shadow-md">
          <span className="text-sm font-medium">Your session expires in {remainingMinutes} minute{remainingMinutes === 1 ? "" : "s"}. Please save your work.</span>
          <button
            onClick={() => setSessionWarningDismissed(true)}
            className="bg-amber-900 text-amber-50 text-xs font-semibold px-3 py-1 rounded hover:bg-amber-800 transition-colors duration-150 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {staffRestricted && (
        <div className="fixed inset-0 z-[60] bg-gray-900 flex flex-col items-center justify-center text-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-500 text-sm mb-5">Your staff account is outside the allowed access days or time window.</p>
            <div className="text-left bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 space-y-1 mb-5">
              <p><span className="font-medium text-gray-800">Timezone:</span> {policy.staffAccess?.timezone}</p>
              <p><span className="font-medium text-gray-800">Current time:</span> {policy.staffAccess?.currentTime}</p>
              <p><span className="font-medium text-gray-800">Allowed days:</span> {policy.staffAccess?.staffAccessDays.join(", ")}</p>
              <p><span className="font-medium text-gray-800">Allowed time:</span> {policy.staffAccess?.staffAccessStart} - {policy.staffAccess?.staffAccessEnd}</p>
            </div>
            <button
              onClick={() => void logout()}
              className="w-full bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors duration-150 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {loginManager.open && (
        <LoginManagerModal
          today={loginManager.today}
          users={loginManager.users}
          selectedIds={loginManager.selectedIds}
          saving={loginManager.saving}
          onToggleUser={loginManager.toggleUser}
          onToggleSelectAll={loginManager.toggleSelectAll}
          onSave={loginManager.handleSave}
          onClose={loginManager.handleClose}
        />
      )}

      {/* Sidebar */}
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-[35] bg-gray-900/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <aside
        id="sidebar"
        className={`bg-gray-900 text-white flex flex-col fixed top-0 left-0 h-full z-40 transition-transform duration-200 md:translate-x-0 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700 min-h-[60px]">
          {!sidebarCollapsed && <span className="app-name text-lg font-bold text-blue-400 whitespace-nowrap">FulfilPro</span>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:block text-gray-400 hover:text-white transition-colors duration-150 cursor-pointer ml-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
              )}
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white transition-colors duration-150 cursor-pointer ml-auto"
            aria-label="Close navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            if (userIsDecorator && item.id !== "decoration" && item.id !== "tasks" && item.id !== "messages") return null;
            if (item.adminDecoratorOnly && user?.role !== "admin" && !userIsDecorator) return null;
            if (item.adminOnly && user?.role !== "admin") return null;
            if (item.pickerHidden && userIsOrderPicker) return null;
            if (item.pickerOnly && user?.role !== "admin" && !userIsOrderPicker) return null;
            const isActive = activeId === item.id;
            return (
              <div key={item.id}>
                <div className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
                    style={sidebarCollapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}
                  >
                    <span className="relative flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {item.icon}
                      </svg>
                      {item.id === "messages" && sidebarCollapsed && unreadMessageCount > 0 && (
                        <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                          {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                        </span>
                      )}
                    </span>
                    {!sidebarCollapsed && <span className="label-text">{item.label}</span>}
                    {item.id === "messages" && !sidebarCollapsed && unreadMessageCount > 0 && (
                      <span className="ml-auto min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </span>
                    )}
                  </Link>
                  {item.id === "users" && user?.role === "admin" ? (
                    <LoginManagerNavTrigger
                      collapsed={sidebarCollapsed}
                      label={item.label}
                      onOpen={() => loginManager.setOpen(true)}
                    />
                  ) : sidebarCollapsed ? (
                    <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 rounded bg-gray-700 px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                      {item.label}
                    </span>
                  ) : null}
                </div>
                {item.children && isActive && item.children.map((child) => {
                  const isChildActive = activeChildId === child.id;
                  return (
                    <Link
                      key={child.id}
                      href={child.href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`nav-item relative group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${isChildActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
                      style={sidebarCollapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : { paddingLeft: "2.25rem" }}
                    >
                      {sidebarCollapsed ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                      ) : (
                        <span className="label-text">{child.label}</span>
                      )}
                      {sidebarCollapsed && (
                        <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 rounded bg-gray-700 px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                          {child.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="px-2 py-4 border-t border-gray-700">
          <Link
            href="/profile"
            onClick={() => setMobileSidebarOpen(false)}
            className={`nav-item relative group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${activeId === "profile" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
            style={sidebarCollapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            {!sidebarCollapsed && <span className="label-text">Profile</span>}
            {sidebarCollapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 rounded bg-gray-700 px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                Profile
              </span>
            )}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div
        id="main-content"
        className="flex flex-col min-h-screen"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 min-h-[60px]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden -ml-1 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150 cursor-pointer"
              aria-label="Open navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <PageHeadingText base={activeChild?.label ?? pageTitles[activeId] ?? ""} />
          </div>
          <div className="flex items-center gap-3 relative">

            <TasksButton isAdmin={user?.role === "admin"} />
            {user?.id && <MessagesChatButton unreadCount={unreadMessageCount} currentUserId={user.id} />}
            {/* <LoginManager isAdmin={user?.role === "admin"} onOpen={() => loginManager.setOpen(true)} /> */}
            <NotificationBell isAdmin={user?.role === "admin"} />
            <span className="text-sm text-gray-600 hidden sm:block">{user?.name}</span>
            <button
              id="avatar-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
            >
              {initials}
            </button>
            {userMenuOpen && (
              <div
                id="user-menu"
                className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50"
              >
                <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">My Profile</Link>
                <hr className="my-1 border-gray-100"/>
                <button
                  onClick={() => void logout()}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {children}
      </div>
    </div>
    </PageHeadingProvider>
  );
}

async function getJson<T>(url: string) {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Request failed");
  }
  return json.data;
}

/** Reads the suffix a page contributes (e.g. the focused product's name in single-product
 * Inventory view) and appends it to the shell's own title — a separate component so it can
 * consume PageHeadingContext, which wraps this whole layout including the page below it. */
function PageHeadingText({ base }: { base: string }) {
  const { suffix } = usePageHeading();
  return (
    <h1 className="truncate text-lg font-semibold text-gray-900">
      {base}
      {suffix && (
        <>
          <span className="mx-1.5 font-normal text-gray-300">/</span>
          <span className="font-medium text-gray-600">{suffix}</span>
        </>
      )}
    </h1>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}
