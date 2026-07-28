'use client';

import Pagination from '@/components/Pagination';
import type { PaginationItem, PaginationState } from '@/hooks/usePagination';
import type { SupplierRow } from './types';
import SupplierRowActions from './SupplierRowActions';

type Props = {
  suppliers: SupplierRow[];
  loading: boolean;
  pagination: PaginationState;
  pageNumbers: PaginationItem[];
  onPageChange: (page: number) => void;
  onEdit: (supplier: SupplierRow) => void;
  onConnections: (supplier: SupplierRow) => void;
  onDelete: (supplier: SupplierRow) => void;
};

const SKELETON_ROWS = Array.from({ length: 5 });

export default function SuppliersTable({ suppliers, loading, pagination, pageNumbers, onPageChange, onEdit, onConnections, onDelete }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">PO email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Connections</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? SKELETON_ROWS.map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-40" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-40" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-48" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16 ml-auto" /></td>
                  </tr>
                ))
              : suppliers.length === 0
              ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No suppliers found</td>
                  </tr>
                )
              : suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-gray-200 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{supplier.name}</td>
                    <td className="px-4 py-3 text-gray-700">{supplier.poEmail}</td>
                    <td className="px-4 py-3 text-gray-700">{supplier.contactEmail ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{supplier.description ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {supplier.productCount} product{supplier.productCount === 1 ? '' : 's'} · {supplier.collectionCount} collection{supplier.collectionCount === 1 ? '' : 's'}
                    </td>
                    <td className="px-4 py-3">
                      <SupplierRowActions supplier={supplier} onEdit={onEdit} onConnections={onConnections} onDelete={onDelete} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <Pagination pagination={pagination} loading={loading} pageNumbers={pageNumbers} onPageChange={onPageChange} itemLabel="suppliers" />
    </div>
  );
}
