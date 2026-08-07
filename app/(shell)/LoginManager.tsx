"use client";

export default function LoginManager({ isAdmin, onOpen }: { isAdmin: boolean; onOpen: () => void }) {
  if (!isAdmin) return null;

  return (
    <div className="relative hidden">
      <button
        onClick={onOpen}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150 cursor-pointer"
        aria-label="Login Manager"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-.7-.06-1.386-.382-2.016z" />
        </svg>
      </button>
    </div>
  );
}
