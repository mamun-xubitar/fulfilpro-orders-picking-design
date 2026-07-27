'use client';

type SupplierPoPanelProps = {
  expanded: boolean;
  onToggle: () => void;
};

export default function SupplierPoPanel({ expanded, onToggle }: SupplierPoPanelProps) {
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={onToggle}
        className="absolute -left-7 top-4 z-10 flex items-center gap-1 bg-gray-900 text-white text-xs rounded-l-lg px-2 py-2 cursor-pointer [writing-mode:vertical-rl]"
      >
        Supplier PO
      </button>

      {expanded && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 h-full flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-gray-700">No purchase orders yet</p>
          <p className="text-xs text-gray-400 mt-1">Supplier PO history for this product will appear here.</p>
        </div>
      )}
    </div>
  );
}
