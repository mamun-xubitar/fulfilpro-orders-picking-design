'use client';

import { useSettingsData } from './useSettingsData';

const TIMEZONES = [
  "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
  "Australia/Perth", "Australia/Adelaide", "America/New_York",
  "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Asia/Dubai", "Asia/Dhaka", "UTC",
];

type Props = {
  s: ReturnType<typeof useSettingsData>;
};

export default function GeneralTab({ s }: Props) {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Timezone</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select value={s.tz} onChange={(e) => s.setTz(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
            {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <button disabled={s.savingSection === "timezone" || s.loading} onClick={() => void s.save("timezone")} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{s.savingSection === "timezone" ? "Saving..." : "Save"}</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
        <div className="flex flex-col items-start justify-between gap-3 mb-4 sm:flex-row sm:gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Google Account</h2>
            <p className="text-xs text-gray-500">Connect Google so the app can use the approved account for Google-powered email access.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.googleConnected ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
            {s.googleConnected ? "Connected" : "Not connected"}
          </span>
        </div>
        {s.googleStatus && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${s.googleStatus.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{s.googleStatus.message}</div>
        )}
        {s.googleConnected ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Connected as</p>
              <p className="truncate text-sm font-medium text-gray-900">{s.googleEmail}</p>
            </div>
            <button type="button" disabled={s.googleDisconnecting || s.loading} onClick={() => void s.disconnectGoogle()} className="w-full border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">
              {s.googleDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        ) : (
          <button type="button" disabled={s.googleConnecting || s.loading} onClick={() => void s.connectGoogle()} className="inline-flex w-full items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M21.35 11.1h-9.18v2.73h5.28c-.23 1.48-1.6 4.34-5.28 4.34-3.18 0-5.77-2.63-5.77-5.87s2.59-5.87 5.77-5.87c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.78 3.91 14.66 3 12.17 3 7.37 3 3.48 6.89 3.48 11.69s3.89 8.69 8.69 8.69c5.01 0 8.33-3.52 8.33-8.48 0-.57-.06-.8-.15-1.15v.35Z" />
            </svg>
            {s.googleConnecting ? "Connecting..." : "Connect with Google"}
          </button>
        )}
      </div>
    </div>
  );
}
