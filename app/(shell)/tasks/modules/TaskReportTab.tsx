'use client';

import type { ReportData } from './types';
import { formatDuration } from './utils';

type Props = {
  report: ReportData | null;
  loading: boolean;
  isAdmin: boolean;
};

export default function TaskReportTab({ report, loading, isAdmin }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Completed" value={String(report.totalCompleted)} />
        <StatCard label="Avg. Time to Complete" value={formatDuration(report.overallAvgMinutes)} />
      </div>

      {report.byAssignee.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">{isAdmin ? 'Per-Assignee Breakdown' : 'Breakdown'}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Assignee</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Completed</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Avg. Time</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">On Time</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Overdue</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Seriously Late</th>
              </tr>
            </thead>
            <tbody>
              {report.byAssignee.map((row) => (
                <tr key={row.assigneeId} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{row.assigneeName}</p>
                    <p className="text-xs text-gray-500">{row.assigneeEmail}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{row.count}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{formatDuration(row.avgMinutes)}</td>
                  <td className="px-4 py-2.5 text-right text-green-700 font-medium">{row.onTime}</td>
                  <td className="px-4 py-2.5 text-right text-orange-600 font-medium">{row.overdue}</td>
                  <td className="px-4 py-2.5 text-right text-red-600 font-medium">{row.seriouslyLate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
