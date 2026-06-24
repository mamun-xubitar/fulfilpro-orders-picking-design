'use client';

import type { TrackingRow } from './types';
import { trackingLinkUrl } from './utils';

type TrackingEvent = {
  time?: string;
  description?: string;
  location?: string;
};

const STATUS_COLORS: Record<string, string> = {
  Delivered: 'bg-green-100 text-green-700',
  AvailableForPickup: 'bg-sky-100 text-sky-700',
  InTransit: 'bg-blue-100 text-blue-700',
  OutForDelivery: 'bg-indigo-100 text-indigo-700',
  InfoReceived: 'bg-gray-100 text-gray-600',
  NotFound: 'bg-gray-100 text-gray-500',
  Expired: 'bg-amber-100 text-amber-700',
  DeliveryFailure: 'bg-red-100 text-red-700',
  Exception: 'bg-red-100 text-red-700',
};

const REG_STATUS_COLORS: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-700',
  paused: 'bg-amber-100 text-amber-800',
  pending: 'bg-gray-100 text-gray-500',
};

type TrackingTableRowProps = {
  row: TrackingRow;
  isExpanded: boolean;
  onToggle: (id: string) => void;
};

export default function TrackingTableRow({ row, isExpanded, onToggle }: TrackingTableRowProps) {
  const statusColor = row.status ? (STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-400';
  const regColor = REG_STATUS_COLORS[row.registrationStatus] ?? 'bg-gray-100 text-gray-500';
  const events = (row.events ?? []) as TrackingEvent[];

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-100"
        onClick={() => onToggle(row.id)}
      >
        <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{row.orderNumber}</td>
        <td className="px-4 py-3 text-sm font-mono">
          <a
            href={trackingLinkUrl(row)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:underline"
          >
            {row.trackingNumber}
          </a>
        </td>
        <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-500">{row.storeName ?? '—'}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${regColor}`}>
            {row.registrationStatus}
          </span>
        </td>
        <td className="px-4 py-3">
          {row.status ? (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor}`}>{row.status}</span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className="hidden md:table-cell px-4 py-3 text-xs text-gray-500">
          {row.lastEventDesc ?? '—'}
        </td>
        <td className="hidden lg:table-cell px-4 py-3 text-xs text-gray-400">
          {row.lastSyncedAt ? new Date(row.lastSyncedAt).toLocaleString() : '—'}
        </td>
        <td className="px-4 py-3 text-center">
          <svg className={`inline h-4 w-4 text-gray-400 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs text-gray-600 mb-4">
              <div><span className="font-semibold text-gray-500">Shipped:</span> {row.shippedAt ? new Date(row.shippedAt).toLocaleString() : '—'}</div>
              <div><span className="font-semibold text-gray-500">Registered:</span> {row.registeredAt ? new Date(row.registeredAt).toLocaleString() : '—'}</div>
              <div><span className="font-semibold text-gray-500">Available for pickup:</span> {row.availableForPickupAt ? new Date(row.availableForPickupAt).toLocaleString() : '—'}</div>
              <div><span className="font-semibold text-gray-500">Delivered:</span> {row.deliveredAt ? new Date(row.deliveredAt).toLocaleString() : '—'}</div>
              <div><span className="font-semibold text-gray-500">Pending alert sent:</span> {row.pendingAlertSentAt ? new Date(row.pendingAlertSentAt).toLocaleString() : '—'}</div>
              <div><span className="font-semibold text-gray-500">Pickup reminders sent:</span> {row.pickupRemindersSent.length > 0 ? `Day ${row.pickupRemindersSent.join(', ')}` : '—'}</div>
            </div>
            {events.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Events</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {events.map((ev, idx) => (
                    <div key={idx} className="flex gap-3 text-xs text-gray-700">
                      <span className="text-gray-400 shrink-0">{ev.time ? new Date(ev.time).toLocaleString() : '—'}</span>
                      <span className="truncate">{ev.description ?? '—'}</span>
                      {ev.location && <span className="text-gray-400 shrink-0">{ev.location}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No events recorded.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
