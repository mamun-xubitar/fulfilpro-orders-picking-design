'use client';

type Props = {
  marginInput: string;
  setMarginInput: (value: string) => void;
  savingMargin: boolean;
  marginErrors: Record<string, string>;
  onSave: () => void;
};

export default function MarginCard({ marginInput, setMarginInput, savingMargin, marginErrors, onSave }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Global Margin</h2>
          <p className="text-xs text-gray-500 mt-1">Default margin percentage used across inventory pricing tools.</p>
        </div>
        <button
          disabled={savingMargin}
          onClick={onSave}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {savingMargin ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Margin percentage</label>
        <div className="flex items-center gap-2 max-w-xs">
          <input
            type="number"
            step="0.01"
            value={marginInput}
            onChange={(e) => setMarginInput(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="0.00"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
        {marginErrors.globalMarginPercent && <p className="text-xs text-red-600 mt-1">{marginErrors.globalMarginPercent}</p>}
      </div>
    </div>
  );
}
