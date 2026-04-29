"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [router, status]);

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

  async function logout() {
    await signOut({ callbackUrl: "/" });
  }

  const navItems = [
    {
      id: "orders", label: "Orders", href: "/orders",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>,
      adminOnly: false,
    },
    {
      id: "stores", label: "Stores", href: "/stores",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>,
      adminOnly: false,
    },
    {
      id: "users", label: "Users", href: "/users",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>,
      adminOnly: true,
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
    },
  ];

  const pageTitles: Record<string, string> = { orders: "Orders", stores: "Stores", users: "Users", profile: "Profile", settings: "Settings" };
  const activeId = pathname.split("/")[1] || "";

  const sidebarWidth = sidebarCollapsed ? "64px" : "240px";
  const user = session?.user;
  const initials = getInitials(user?.name ?? user?.email ?? "");

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </main>
    );
  }

  return (
    <div onContextMenu={(e) => e.preventDefault()}>
      {/* Sidebar */}
      <aside
        id="sidebar"
        className="bg-gray-900 text-white flex flex-col fixed top-0 left-0 h-full z-40 overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700 min-h-[60px]">
          {!sidebarCollapsed && <span className="app-name text-lg font-bold text-blue-400 whitespace-nowrap">FulfilPro</span>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-400 hover:text-white transition-colors duration-150 cursor-pointer ml-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
              )}
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== "admin") return null;
            const isActive = activeId === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
                style={sidebarCollapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon}
                </svg>
                {!sidebarCollapsed && <span className="label-text">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-4 border-t border-gray-700">
          <Link
            href="/profile"
            className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${activeId === "profile" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
            style={sidebarCollapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            {!sidebarCollapsed && <span className="label-text">Profile</span>}
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
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 min-h-[60px]">
          <h1 className="text-lg font-semibold text-gray-900">{pageTitles[activeId] || ""}</h1>
          <div className="flex items-center gap-3 relative">
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
