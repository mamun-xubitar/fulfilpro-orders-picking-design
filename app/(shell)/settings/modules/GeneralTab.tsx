'use client';

import { useSettingsData } from './useSettingsData';
import EmailProviderCard from './EmailProviderCard';

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

      <EmailProviderCard s={s} />
    </div>
  );
}
