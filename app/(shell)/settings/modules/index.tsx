"use client";
import { useEffect, useState } from "react";
import type { AppSettingsRow } from "@/models/settings.model.server";

const TIMEZONES = [
  "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
  "Australia/Perth", "Australia/Adelaide", "America/New_York",
  "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Asia/Dubai", "Asia/Dhaka", "UTC",
];

const DEFAULT_EMAIL_RULES: AppSettingsRow["emailRules"] = {
  loginApprovalRecipientUserIds: [],
  backInStockAdminRecipientUserIds: [],
  stockAdjustmentRecipientUserIds: [],
  fulfillmentRequestAllowedUserIds: [],
  fulfillmentRequestDefaultUserIds: [],
  pickingPackingAllowedUserIds: [],
  pickingPackingDefaultUserIds: [],
  directMessageAllowedUserIds: [],
  directMessageDefaultUserIds: [],
  backInStockRequesterUpdatesEnabled: true,
  eligibleUsers: {
    activeUsers: [],
    activeAdminUsers: [],
  },
};

const DEFAULT_DECORATION_DIGEST: AppSettingsRow["decorationDigest"] = {
  mode: "global_time",
  time: "17:00",
  recipientUserIds: [],
};

const SECTION_LABELS: Record<string, string> = {
  timezone: "Timezone",
  emailRules: "Email Sending Rules",
  decorationDigest: "Decoration Work Digest",
};

type ApiResponse<T> = { success: boolean; message: string; data: T };
type SettingsSection = keyof typeof SECTION_LABELS;

type RuleUser = AppSettingsRow["emailRules"]["eligibleUsers"]["activeUsers"][number];

export default function SettingsPage() {
  const [tz, setTz] = useState("Australia/Sydney");
  const [emailRules, setEmailRules] = useState<AppSettingsRow["emailRules"]>(DEFAULT_EMAIL_RULES);
  const [decorationDigest, setDecorationDigest] = useState<AppSettingsRow["decorationDigest"]>(DEFAULT_DECORATION_DIGEST);
  const [saveMsg, setSaveMsg] = useState("");
  const [showSaveMsg, setShowSaveMsg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [savingSection, setSavingSection] = useState<SettingsSection | null>(null);
  const [error, setError] = useState("");
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function save(section: SettingsSection) {
    setError("");
    setSavingSection(section);

    const payload = getSectionPayload(section);

    try {
      const settings = await getJson<AppSettingsRow>("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      applySettings(settings);
      setSaveMsg(`${SECTION_LABELS[section]} saved.`);
      setShowSaveMsg(true);
      setTimeout(() => setShowSaveMsg(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSection(null);
    }
  }

  function getSectionPayload(section: SettingsSection) {
    if (section === "timezone") {
      return { timezone: tz };
    }

    if (section === "decorationDigest") {
      return {
        decorationDigestMode: decorationDigest.mode,
        decorationDigestTime: decorationDigest.time,
        decorationDigestRecipientUserIds: decorationDigest.recipientUserIds,
      };
    }

    return {
      loginApprovalRecipientUserIds: emailRules.loginApprovalRecipientUserIds,
      backInStockAdminRecipientUserIds: emailRules.backInStockAdminRecipientUserIds,
      stockAdjustmentRecipientUserIds: emailRules.stockAdjustmentRecipientUserIds,
      fulfillmentRequestAllowedUserIds: emailRules.fulfillmentRequestAllowedUserIds,
      fulfillmentRequestDefaultUserIds: emailRules.fulfillmentRequestDefaultUserIds,
      pickingPackingAllowedUserIds: emailRules.pickingPackingAllowedUserIds,
      pickingPackingDefaultUserIds: emailRules.pickingPackingDefaultUserIds,
      directMessageAllowedUserIds: emailRules.directMessageAllowedUserIds,
      directMessageDefaultUserIds: emailRules.directMessageDefaultUserIds,
      backInStockRequesterUpdatesEnabled: emailRules.backInStockRequesterUpdatesEnabled,
    };
  }

  function applySettings(settings: AppSettingsRow) {
    setTz(settings.timezone);
    setGoogleEmail(settings.googleEmail);
    setGoogleConnected(settings.googleConnected);
    setEmailRules(settings.emailRules);
    setDecorationDigest(settings.decorationDigest);
  }

  async function connectGoogle() {
    setError("");
    setGoogleStatus(null);
    setGoogleConnecting(true);

    try {
      const data = await getJson<{ authUrl: string }>("/api/settings/google/auth-url");
      window.location.href = data.authUrl;
    } catch (err) {
      setGoogleStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to start Google connection",
      });
      setGoogleConnecting(false);
    }
  }

  async function disconnectGoogle() {
    setError("");
    setGoogleStatus(null);
    setGoogleDisconnecting(true);

    try {
      const settings = await getJson<AppSettingsRow>("/api/settings/google/disconnect", {
        method: "POST",
      });
      applySettings(settings);
      setGoogleStatus({ type: "success", message: "Google account disconnected." });
    } catch (err) {
      setGoogleStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to disconnect Google account",
      });
    } finally {
      setGoogleDisconnecting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const mountTimer = window.setTimeout(() => {
      if (!cancelled) setMounted(true);
    }, 0);

    async function loadSettings() {
      setLoading(true);
      setError("");

      try {
        const settings = await getJson<AppSettingsRow>("/api/settings");
        if (cancelled) return;
        applySettings(settings);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
      window.clearTimeout(mountTimer);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const params = new URLSearchParams(window.location.search);
    const googleConnectedParam = params.get("googleConnected");
    const googleErrorParam = params.get("googleError");

    let nextStatus: typeof googleStatus = null;

    if (googleConnectedParam === "1") {
      nextStatus = { type: "success", message: "Google account connected successfully." };
      params.delete("googleConnected");
    } else if (googleErrorParam) {
      nextStatus = { type: "error", message: `Google connection failed: ${googleErrorParam}` };
      params.delete("googleError");
    } else {
      return;
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
    window.setTimeout(() => setGoogleStatus(nextStatus), 0);
  }, [mounted]);

  if (!mounted) {
    return (
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl space-y-5">
          <div className="text-sm text-center text-gray-500 pb-2">Loading settings...</div>
        </div>
      </main>
    );
  }

  const activeUsers = emailRules.eligibleUsers.activeUsers;
  const activeAdmins = emailRules.eligibleUsers.activeAdminUsers;

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="max-w-4xl space-y-5">

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Timezone</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            >
              {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <button disabled={savingSection === "timezone" || loading} onClick={() => save("timezone")} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{savingSection === "timezone" ? "Saving..." : "Save"}</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Email/Notification Sending Rules</h2>
              <p className="text-xs text-gray-500 mt-1">Control who can receive each notification and who is selected by default in recipient pickers.</p>
            </div>
            <button disabled={savingSection === "emailRules" || loading} onClick={() => save("emailRules")} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{savingSection === "emailRules" ? "Saving..." : "Save Rules"}</button>
          </div>

          <RuleCard
            title="Staff/Test/Picker/Decorator Login Approval"
            hint="Who will receive login approval request emails and notifications?"
          >
            <UserChecklist
              users={activeAdmins}
              selectedUserIds={emailRules.loginApprovalRecipientUserIds}
              onChange={(ids) => setEmailRules((prev) => ({ ...prev, loginApprovalRecipientUserIds: ids }))}
            />
          </RuleCard>

          <RuleCard
            title="Back-In-Stock Request Notifications"
            hint="Who will receive emails and notifications for new back-in-stock requests?"
          >
            <UserChecklist
              users={activeUsers}
              selectedUserIds={emailRules.backInStockAdminRecipientUserIds}
              onChange={(ids) => setEmailRules((prev) => ({ ...prev, backInStockAdminRecipientUserIds: ids }))}
            />
          </RuleCard>

          <RuleCard
            title="Stock Adjustment Notifications"
            hint="Who will receive emails and notifications to adjust the stocks when staff create a fulfillment?"
          >
            <UserChecklist
              users={activeUsers}
              selectedUserIds={emailRules.stockAdjustmentRecipientUserIds}
              onChange={(ids) => setEmailRules((prev) => ({ ...prev, stockAdjustmentRecipientUserIds: ids }))}
            />
          </RuleCard>

          <RuleCard
            title="Fulfillment Permission Requests"
            hint="Who will receive emails and notifications when a user requests permission to edit/cancel an order fulfillment?"
          >
            <AllowedDefaultChecklist
              users={activeAdmins}
              allowedUserIds={emailRules.fulfillmentRequestAllowedUserIds}
              defaultUserIds={emailRules.fulfillmentRequestDefaultUserIds}
              onAllowedChange={(ids) => setEmailRules((prev) => ({
                ...prev,
                fulfillmentRequestAllowedUserIds: ids,
                fulfillmentRequestDefaultUserIds: prev.fulfillmentRequestDefaultUserIds.filter((id) => ids.includes(id)),
              }))}
              onDefaultChange={(ids) => setEmailRules((prev) => ({ ...prev, fulfillmentRequestDefaultUserIds: ids }))}
            />
          </RuleCard>

          <RuleCard
            title="Picking List Packing Notifications"
            hint="Who will receive emails and notifications if an order is packed/canceled?"
          >
            <AllowedDefaultChecklist
              users={activeUsers}
              allowedUserIds={emailRules.pickingPackingAllowedUserIds}
              defaultUserIds={emailRules.pickingPackingDefaultUserIds}
              onAllowedChange={(ids) => setEmailRules((prev) => ({
                ...prev,
                pickingPackingAllowedUserIds: ids,
                pickingPackingDefaultUserIds: prev.pickingPackingDefaultUserIds.filter((id) => ids.includes(id)),
              }))}
              onDefaultChange={(ids) => setEmailRules((prev) => ({ ...prev, pickingPackingDefaultUserIds: ids }))}
            />
          </RuleCard>

          <RuleCard
            title="Order & Picking-List Direct Messages"
            hint="Who will receive email and notification for direct messages on orders and picking list tables?"
          >
            <AllowedDefaultChecklist
              users={activeUsers}
              allowedUserIds={emailRules.directMessageAllowedUserIds}
              defaultUserIds={emailRules.directMessageDefaultUserIds}
              onAllowedChange={(ids) => setEmailRules((prev) => ({
                ...prev,
                directMessageAllowedUserIds: ids,
                directMessageDefaultUserIds: prev.directMessageDefaultUserIds.filter((id) => ids.includes(id)),
              }))}
              onDefaultChange={(ids) => setEmailRules((prev) => ({ ...prev, directMessageDefaultUserIds: ids }))}
            />
          </RuleCard>

          <RuleCard
            title="Back-In-Stock Requester Updates"
            hint="Dynamic recipient toggle for update emails to the original requester."
          >
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={emailRules.backInStockRequesterUpdatesEnabled}
                onChange={(event) => setEmailRules((prev) => ({ ...prev, backInStockRequesterUpdatesEnabled: event.target.checked }))}
                className="rounded border-gray-300 text-blue-600 cursor-pointer"
              />
              Send requester email and notification updates when admins post back-in-stock updates
            </label>
          </RuleCard>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Decoration Work Digest</h2>
              <p className="text-xs text-gray-500 mt-1">Email a summary of completed decoration work to the selected admins. Nothing is sent when no new work was done.</p>
            </div>
            <button disabled={savingSection === "decorationDigest" || loading} onClick={() => save("decorationDigest")} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{savingSection === "decorationDigest" ? "Saving..." : "Save Digest"}</button>
          </div>

          <RuleCard
            title="Schedule"
            hint="Choose when the digest is sent. Per-decorator mode sends each decorator's summary at the end of their own working hours."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={decorationDigest.mode}
                onChange={(e) => setDecorationDigest((prev) => ({ ...prev, mode: e.target.value as AppSettingsRow["decorationDigest"]["mode"] }))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
              >
                <option value="global_time">Single global time</option>
                <option value="per_user_working_hour">Per decorator at their working-hour end</option>
              </select>
              {decorationDigest.mode === "global_time" && (
                <input
                  type="time"
                  value={decorationDigest.time}
                  onChange={(e) => setDecorationDigest((prev) => ({ ...prev, time: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer sm:w-40"
                />
              )}
            </div>
          </RuleCard>

          <RuleCard
            title="Digest Recipients"
            hint="Which admins receive the decoration work digest email?"
          >
            <UserChecklist
              users={activeAdmins}
              selectedUserIds={decorationDigest.recipientUserIds}
              onChange={(ids) => setDecorationDigest((prev) => ({ ...prev, recipientUserIds: ids }))}
            />
          </RuleCard>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex flex-col items-start justify-between gap-3 mb-4 sm:flex-row sm:gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Google Account</h2>
              <p className="text-xs text-gray-500">Connect Google so the app can use the approved account for Google-powered email access.</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${googleConnected ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
              {googleConnected ? "Connected" : "Not connected"}
            </span>
          </div>

          {googleStatus && (
            <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${googleStatus.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
              {googleStatus.message}
            </div>
          )}

          {googleConnected ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Connected as</p>
                <p className="truncate text-sm font-medium text-gray-900">{googleEmail}</p>
              </div>
              <button
                type="button"
                disabled={googleDisconnecting || loading}
                onClick={() => void disconnectGoogle()}
                className="w-full border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
              >
                {googleDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={googleConnecting || loading}
              onClick={() => void connectGoogle()}
              className="inline-flex w-full items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M21.35 11.1h-9.18v2.73h5.28c-.23 1.48-1.6 4.34-5.28 4.34-3.18 0-5.77-2.63-5.77-5.87s2.59-5.87 5.77-5.87c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.78 3.91 14.66 3 12.17 3 7.37 3 3.48 6.89 3.48 11.69s3.89 8.69 8.69 8.69c5.01 0 8.33-3.52 8.33-8.48 0-.57-.06-.8-.15-1.15v.35Z" />
              </svg>
              {googleConnecting ? "Connecting..." : "Connect with Google"}
            </button>
          )}
        </div>

        {loading && <div className="text-sm text-center text-gray-500 pb-2">Loading settings...</div>}
        {error && <div className="text-sm text-center text-red-600 pb-2">{error}</div>}
        {showSaveMsg && <div className="text-sm text-center text-green-600 pb-2">{saveMsg}</div>}

      </div>
    </main>
  );
}

function RuleCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 mb-3">{hint}</p>
      {children}
    </section>
  );
}

function UserChecklist({
  users,
  selectedUserIds,
  onChange,
}: {
  users: RuleUser[];
  selectedUserIds: string[];
  onChange: (ids: string[]) => void;
}) {
  if (users.length === 0) {
    return <p className="text-xs text-gray-500">No eligible active users.</p>;
  }

  return (
    <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-1">
      {users.map((user) => (
        <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
          <input
            type="checkbox"
            checked={selectedUserIds.includes(user.id)}
            onChange={() => onChange(toggleId(selectedUserIds, user.id))}
            className="cursor-pointer rounded border-gray-300 text-blue-600"
          />
          <span>{user.name}</span>
          <span className="text-xs text-gray-400">{user.email}</span>
        </label>
      ))}
    </div>
  );
}

function AllowedDefaultChecklist({
  users,
  allowedUserIds,
  defaultUserIds,
  onAllowedChange,
  onDefaultChange,
}: {
  users: RuleUser[];
  allowedUserIds: string[];
  defaultUserIds: string[];
  onAllowedChange: (ids: string[]) => void;
  onDefaultChange: (ids: string[]) => void;
}) {
  if (users.length === 0) {
    return <p className="text-xs text-gray-500">No eligible active users.</p>;
  }

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white">
      <div className="grid grid-cols-[minmax(0,1fr)_92px_92px] gap-2 border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase text-gray-500">
        <span>User</span>
        <span className="text-center">Allowed</span>
        <span className="flex items-center justify-center gap-1 text-center">
          Default
          <span className="tooltip inline-flex" aria-label="User can't deselect receiver from sender list">
            <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-11.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 8V8H8v2h1v4H8v2h4v-2h-1Z"
                clipRule="evenodd"
              />
            </svg>
            <span
              className="tt normal-case"
              style={{ bottom: "auto", left: "auto", right: 0, top: "140%", transform: "none", whiteSpace: "normal", width: "220px" }}
            >
              User can&apos;t deselect receiver from sender list
            </span>
          </span>
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {users.map((user) => {
          const isAllowed = allowedUserIds.includes(user.id);
          const isDefault = defaultUserIds.includes(user.id);

          return (
            <div key={user.id} className="grid grid-cols-[minmax(0,1fr)_92px_92px] items-center gap-2 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate text-gray-800">{user.name}</p>
                <p className="truncate text-xs text-gray-400">{user.email}</p>
              </div>
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={isAllowed}
                  onChange={() => {
                    const nextAllowed = toggleId(allowedUserIds, user.id);
                    onAllowedChange(nextAllowed);
                  }}
                  className="cursor-pointer rounded border-gray-300 text-blue-600"
                />
              </div>
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={isDefault}
                  disabled={!isAllowed}
                  onChange={() => {
                    const nextDefaults = toggleId(defaultUserIds, user.id);
                    onDefaultChange(nextDefaults.filter((id) => allowedUserIds.includes(id) || id === user.id));
                  }}
                  className="cursor-pointer rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

async function getJson<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Request failed");
  }
  return json.data;
}
