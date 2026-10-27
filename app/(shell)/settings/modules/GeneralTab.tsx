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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Invoice numbering</h2>
        <p className="text-xs text-gray-500 mb-3">
          One counter is shared by every store. A store&apos;s own invoice prefix (Stores → Tax invoice) is used instead of the global prefix; leave both empty for plain numbers. Numbers already issued never change.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-medium text-gray-700">
            Global prefix
            <input type="text" maxLength={10} value={s.invoiceNumbering.prefix} onChange={(e) => s.setInvoiceNumbering((prev) => ({ ...prev, prefix: e.target.value }))} placeholder="e.g. INV-" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </label>
          <label className="flex-1 text-xs font-medium text-gray-700">
            Starting / next invoice number
            <input type="number" min={1} step={1} value={s.invoiceNumbering.nextNumber} onChange={(e) => s.setInvoiceNumbering((prev) => ({ ...prev, nextNumber: Number(e.target.value) }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </label>
          <button disabled={s.savingSection === "invoiceNumbering" || s.loading} onClick={() => void s.save("invoiceNumbering")} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{s.savingSection === "invoiceNumbering" ? "Saving..." : "Save"}</button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Next invoice: {s.invoiceNumbering.prefix.trim()}{s.invoiceNumbering.nextNumber}</p>
      </div>

      <EmailProviderCard s={s} />
    </div>
  );
}
