'use client';

import type { CurrencyRateRow } from './types';
import { BASE_CURRENCY } from './constants';

type Props = {
  currencies: CurrencyRateRow[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (currency: CurrencyRateRow) => void;
  onDelete: (currency: CurrencyRateRow) => void;
};

const SKELETON_ROWS = Array.from({ length: 5 });

export default function CurrencyRatesCard({ currencies, loading, onAdd, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Currency Exchange Rates</h2>
          <p className="text-xs text-gray-500 mt-1">Rates against the base currency, {BASE_CURRENCY}.</p>
        </div>
        <button
          onClick={onAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
        >
          Add currency
        </button>
      </div>

      <div className="overflow-x-auto -mx-4 md:-mx-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Currency</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Rate</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Last updated</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? SKELETON_ROWS.map((_, i) => (
                  <tr key={i} className="border-b border-gray-200 last:border-0">
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-40" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16 ml-auto" /></td>
                  </tr>
                ))
              : currencies.length === 0
              ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">No currencies added yet</td>
                  </tr>
                )
              : currencies.map((currency) => (
                  <tr key={currency.id} className="border-b border-gray-200 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{currency.code}</td>
                    <td className="px-4 py-3 text-gray-700">
                      1 {currency.code} = {currency.rate.toFixed(4)} {BASE_CURRENCY}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(currency.updatedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEdit(currency)}
                          title="Edit"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(currency)}
                          title="Delete"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
