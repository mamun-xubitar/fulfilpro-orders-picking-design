'use client';

import { useDropdownPosition } from './hooks/useDropdownPosition';
import type { CarrierOption } from './types';

type CarrierFieldProps = {
  carrierName: string;
  carrierAutoDetected: boolean;
  carrierSearch: string;
  carrierResults: CarrierOption[];
  carrierSearching: boolean;
  carrierDropdownOpen: boolean;
  onCarrierSearchChange: (value: string) => void;
  onSelectCarrier: (carrier: CarrierOption) => void;
  onFocusCarrierSearch: () => void;
  onBlurCarrierSearch: () => void;
  onClearCarrier: () => void;
};

export default function CarrierField({
  carrierName, carrierAutoDetected, carrierSearch, carrierResults, carrierSearching, carrierDropdownOpen,
  onCarrierSearchChange, onSelectCarrier, onFocusCarrierSearch, onBlurCarrierSearch, onClearCarrier,
}: CarrierFieldProps) {
  const { anchorRef, openUpward, computeDirection } = useDropdownPosition<HTMLInputElement>();

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Carrier (optional)</p>
      {carrierName ? (
        <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <span className="text-sm text-gray-800">
            {carrierName}
            {carrierAutoDetected && <span className="ml-1.5 text-xs text-gray-400">(auto-detected)</span>}
          </span>
          <button
            type="button"
            onClick={onClearCarrier}
            className="text-xs text-gray-500 hover:text-red-500 cursor-pointer"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={anchorRef}
            type="text"
            value={carrierSearch}
            onChange={(e) => onCarrierSearchChange(e.target.value)}
            onFocus={() => { computeDirection(); onFocusCarrierSearch(); }}
            onBlur={onBlurCarrierSearch}
            placeholder="Search carrier…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {carrierDropdownOpen && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className={`absolute left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1 ${
                openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
              }`}
            >
              {carrierSearching ? (
                <p className="px-3 py-2 text-sm text-gray-500">Searching…</p>
              ) : carrierResults.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500">No carriers found.</p>
              ) : (
                carrierResults.map((carrier) => (
                  <button
                    key={carrier.code}
                    type="button"
                    onClick={() => onSelectCarrier(carrier)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    {carrier.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
