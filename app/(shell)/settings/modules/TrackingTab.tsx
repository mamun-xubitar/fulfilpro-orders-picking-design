'use client';

import { useSettingsData } from "./useSettingsData";
import { RuleCard, UserChecklist } from "./EmailRulesSection";
import type { EmailRuleUser } from "@/lib/email-rules.server";

type Props = {
  s: ReturnType<typeof useSettingsData>;
  activeUsers: EmailRuleUser[];
};

export default function TrackingTab({ s, activeUsers }: Props) {
  const t = s.tracking;
  const set = s.setTracking;
  const saving = s.savingSection === "tracking";

  const addReminderDay = () => {
    const next = (t.pickupReminderDays[t.pickupReminderDays.length - 1] ?? 0) + 2;
    set((prev) => ({ ...prev, pickupReminderDays: [...prev.pickupReminderDays, next] }));
  };

  const updateReminderDay = (idx: number, val: string) => {
    const n = parseInt(val, 10);
    if (!Number.isFinite(n) || n < 1) return;
    set((prev) => {
      const days = [...prev.pickupReminderDays];
      days[idx] = n;
      return { ...prev, pickupReminderDays: days };
    });
  };

  const removeReminderDay = (idx: number) => {
    set((prev) => ({ ...prev, pickupReminderDays: prev.pickupReminderDays.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Shipment Tracking</h2>
          <p className="text-xs text-gray-500 mt-1">Automatically track shipments using the 17track API.</p>
        </div>
        <button
          disabled={saving || s.loading}
          onClick={() => void s.save("tracking")}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
        >
          {saving ? "Saving..." : "Save Tracking"}
        </button>
      </div>

      <RuleCard title="17track API Key" hint="Paste your 17track API key (v2.4). Required for all tracking features.">
        <input
          type="password"
          autoComplete="off"
          value={t.seventrackApiKey ?? ""}
          onChange={(e) => set((prev) => ({ ...prev, seventrackApiKey: e.target.value || null }))}
          placeholder="Enter API key"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </RuleCard>

      <RuleCard title="Auto-Register" hint="Automatically register a tracking number with 17track when an order receives one.">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={t.autoRegisterEnabled}
            onChange={(e) => set((prev) => ({ ...prev, autoRegisterEnabled: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-sm text-gray-700">Start tracking when an order gets a tracking number</span>
        </label>
      </RuleCard>

      <RuleCard title="Pending Shipment Alert" hint="Alert staff when a shipment has not moved for this many days after shipping.">
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={t.pendingAlertDays}
            onChange={(e) => set((prev) => ({ ...prev, pendingAlertDays: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">days</span>
        </div>
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">Alert recipients</p>
          <UserChecklist
            users={activeUsers}
            selectedUserIds={t.pendingAlertUserIds}
            onChange={(ids) => set((prev) => ({ ...prev, pendingAlertUserIds: ids }))}
          />
        </div>
      </RuleCard>

      <RuleCard title="Customer Pickup Reminders" hint="Email the customer at these day offsets after their parcel becomes available for pickup. Leave empty to disable.">
        <div className="space-y-2">
          {t.pickupReminderDays.map((day, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={day}
                onChange={(e) => updateReminderDay(idx, e.target.value)}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">days after available</span>
              <button
                type="button"
                onClick={() => removeReminderDay(idx)}
                className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addReminderDay}
            className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            + Add reminder day
          </button>
        </div>
      </RuleCard>
    </div>
  );
}
