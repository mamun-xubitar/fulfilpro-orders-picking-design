'use client';

import Link from 'next/link';
import { STATUS_BADGE } from './constants';
import type { ProductDetail } from './types';

type ProductHeaderProps = {
  product: ProductDetail;
  stale: boolean;
  onResync: () => void;
  refreshing: boolean;
};

export default function ProductHeader({ product, stale, onResync, refreshing }: ProductHeaderProps) {
  const badge = STATUS_BADGE[product.status];

  return (
    <div className="flex items-center flex-wrap gap-3 mb-5">
      <Link
        href="/inventory"
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        aria-label="Back to inventory"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Link>

      <h1 className="text-lg font-semibold text-gray-900">{product.title}</h1>

      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
        {badge.label}
      </span>

      {product.onlineStoreUrl && (
        <a
          href={product.onlineStoreUrl}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          title="View product"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}

      <div className="ml-auto flex items-center gap-2">
        {stale && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            Showing cached data — store unavailable
          </span>
        )}
        <button
          onClick={onResync}
          disabled={refreshing}
          className="flex items-center gap-1.5 border border-gray-300 bg-white text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
        >
          <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );
}
