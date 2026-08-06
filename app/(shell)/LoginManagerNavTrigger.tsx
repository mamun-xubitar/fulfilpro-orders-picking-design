"use client";

export default function LoginManagerNavTrigger({
  collapsed,
  label,
  onOpen,
}: {
  collapsed: boolean;
  label: string;
  onOpen: () => void;
}) {
  if (!collapsed) {
    return (
      <button
        onClick={onOpen}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white hover:bg-gray-700 rounded p-1 cursor-pointer"
        aria-label="Login Manager"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-.7-.06-1.386-.382-2.016z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 pl-2 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50">
      <div className="flex items-center gap-2 rounded bg-gray-700 px-2 py-1 text-xs text-white whitespace-nowrap">
        <span>{label}</span>
        <button
          onClick={onOpen}
          aria-label="Login Manager"
          className="text-gray-300 hover:text-white cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-.7-.06-1.386-.382-2.016z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
