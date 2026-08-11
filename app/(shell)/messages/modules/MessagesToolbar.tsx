'use client';

type Props = {
  search: string;
  setSearch: (s: string) => void;
  onChat: () => void;
};

export default function MessagesToolbar({ search, setSearch, onChat }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
      <input
        type="text"
        placeholder="Search by user name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[240px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={onChat}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
      >
        + Chat
      </button>
    </div>
  );
}
