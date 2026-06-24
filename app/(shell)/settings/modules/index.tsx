"use client";

import type { AppSettingsRow } from "@/models/settings.model.server";
import { useSettingsData } from "./useSettingsData";
import EmailRulesSection, { RuleCard, UserChecklist } from "./EmailRulesSection";
import type { EmailRuleUser } from "@/lib/email-rules.server";

const TIMEZONES = [
  "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
  "Australia/Perth", "Australia/Adelaide", "America/New_York",
  "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Asia/Dubai", "Asia/Dhaka", "UTC",
];

export default function SettingsPage() {
  const s = useSettingsData();

  if (!s.mounted) {
    return (
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl space-y-5">
          <div className="text-sm text-center text-gray-500 pb-2">Loading settings...</div>
        </div>
      </main>
    );
  }

  const activeUsers = s.emailRules.eligibleUsers.activeUsers;
  const activeAdmins = s.emailRules.eligibleUsers.activeAdminUsers;

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="max-w-4xl space-y-5">

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Timezone</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select value={s.tz} onChange={(e) => s.setTz(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
              {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <button disabled={s.savingSection === "timezone" || s.loading} onClick={() => void s.save("timezone")} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{s.savingSection === "timezone" ? "Saving..." : "Save"}</button>
          </div>
        </div>

        <EmailRulesSection
          emailRules={s.emailRules}
          setEmailRules={s.setEmailRules}
          activeUsers={activeUsers}
          activeAdmins={activeAdmins}
          save={(section) => void s.save(section)}
          savingSection={s.savingSection}
          loading={s.loading}
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Decoration Work Digest</h2>
              <p className="text-xs text-gray-500 mt-1">Email a summary of completed decoration work to the selected admins. Nothing is sent when no new work was done.</p>
            </div>
            <button disabled={s.savingSection === "decorationDigest" || s.loading} onClick={() => void s.save("decorationDigest")} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{s.savingSection === "decorationDigest" ? "Saving..." : "Save Digest"}</button>
          </div>

          <RuleCard title="Schedule" hint="Choose when the digest is sent. Per-decorator mode sends each decorator's summary at the end of their own working hours.">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select value={s.decorationDigest.mode} onChange={(e) => s.setDecorationDigest((prev) => ({ ...prev, mode: e.target.value as AppSettingsRow["decorationDigest"]["mode"] }))} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                <option value="global_time">Single global time</option>
                <option value="per_user_working_hour">Per decorator at their working-hour end</option>
              </select>
              {s.decorationDigest.mode === "global_time" && (
                <input type="time" value={s.decorationDigest.time} onChange={(e) => s.setDecorationDigest((prev) => ({ ...prev, time: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer sm:w-40" />
              )}
            </div>
          </RuleCard>

          <RuleCard title="Digest Recipients" hint="Which admins receive the decoration work digest email?">
            <UserChecklist users={activeAdmins} selectedUserIds={s.decorationDigest.recipientUserIds} onChange={(ids) => s.setDecorationDigest((prev) => ({ ...prev, recipientUserIds: ids }))} />
          </RuleCard>
        </div>

        <TrackingSettingsCard s={s} activeUsers={activeUsers} />

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

        {s.loading && <div className="text-sm text-center text-gray-500 pb-2">Loading settings...</div>}
        {s.error && <div className="text-sm text-center text-red-600 pb-2">{s.error}</div>}
        {s.showSaveMsg && <div className="text-sm text-center text-green-600 pb-2">{s.saveMsg}</div>}

      </div>
    </main>
  );
}

type TrackingCardProps = {
  s: ReturnType<typeof useSettingsData>;
  activeUsers: EmailRuleUser[];
};

function TrackingSettingsCard({ s, activeUsers }: TrackingCardProps) {
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
