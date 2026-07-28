'use client';

type Props = {
  searchInput: string;
  setSearchInput: (value: string) => void;
  onAdd: () => void;
};

export default function SuppliersToolbar({ searchInput, setSearchInput, onAdd }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
      <input
        type="text"
        placeholder="Search suppliers by name..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[240px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={onAdd}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
      >
        + Add supplier
      </button>
    </div>
  );
}
