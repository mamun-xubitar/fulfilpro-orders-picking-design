"use client";
import { useEffect, useState } from "react";
import type { AppSettingsRow } from "@/models/settings.model.server";

const TIMEZONES = [
  "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
  "Australia/Perth", "Australia/Adelaide", "America/New_York",
  "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Asia/Dubai", "UTC",
];

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_ON = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);
const SESSION_TIMEOUT_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
  { value: 480, label: "8 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "1 day" },
  { value: 2880, label: "2 days" },
  { value: 10080, label: "7 days" },
];

const INACTIVITY_UNITS = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
] as const;
type InactivityUnit = "minutes" | "hours" | "days";

function minutesToUnitValue(minutes: number | null): { value: string; unit: InactivityUnit } {
  if (!minutes) return { value: "", unit: "minutes" };
  if (minutes % 1440 === 0) return { value: String(minutes / 1440), unit: "days" };
  if (minutes % 60 === 0) return { value: String(minutes / 60), unit: "hours" };
  return { value: String(minutes), unit: "minutes" };
}

function unitValueToMinutes(value: string, unit: InactivityUnit): number | null {
  const n = parseInt(value, 10);
  if (!n || n <= 0) return null;
  if (unit === "hours") return n * 60;
  if (unit === "days") return n * 1440;
  return n;
}

const SECTION_LABELS: Record<string, string> = {
  timezone: "Timezone",
  access: "Staff access restrictions",
  session: "Session settings",
  inactivity: "Inactivity logout",
};

type ApiResponse<T> = { success: boolean; message: string; data: T };
type SettingsSection = keyof typeof SECTION_LABELS;

export default function SettingsPage() {
  const [tz, setTz] = useState("Australia/Sydney");
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(DEFAULT_ON));
  const [tStart, setTStart] = useState("08:00");
  const [tEnd, setTEnd] = useState("16:00");
  const [session, setSession] = useState(30);
  const [inactivityValue, setInactivityValue] = useState("");
  const [inactivityUnit, setInactivityUnit] = useState<InactivityUnit>("minutes");
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

  function toggleDay(day: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  }

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

    if (section === "access") {
      return {
        staffAccessDays: ALL_DAYS.filter((day) => selectedDays.has(day)),
        staffAccessStart: tStart,
        staffAccessEnd: tEnd,
      };
    }

    if (section === "inactivity") {
      return { inactivityTimeoutMinutes: unitValueToMinutes(inactivityValue, inactivityUnit) };
    }

    return { sessionTimeoutMinutes: session };
  }

  function applySettings(settings: AppSettingsRow) {
    setTz(settings.timezone);
    setSelectedDays(new Set(settings.staffAccessDays));
    setTStart(settings.staffAccessStart);
    setTEnd(settings.staffAccessEnd);
    setSession(settings.sessionTimeoutMinutes);
    const { value: iVal, unit: iUnit } = minutesToUnitValue(settings.inactivityTimeoutMinutes);
    setInactivityValue(iVal);
    setInactivityUnit(iUnit);
    setGoogleEmail(settings.googleEmail);
    setGoogleConnected(settings.googleConnected);
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
        <div className="max-w-2xl space-y-5">
          <div className="text-sm text-center text-gray-500 pb-2">Loading settings...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="max-w-2xl space-y-5">

        {/* Timezone */}
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

        {/* Staff Access Restrictions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Staff Access Restrictions</h2>
          <p className="text-xs text-gray-500 mb-4">Staff users can only log in during the selected days and time window. Admin accounts are unaffected.</p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">Allowed Days</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => {
                const on = selectedDays.has(day);
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`day-chip px-3 py-1.5 rounded-full text-xs font-medium border ${on ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Access Start Time</label>
              <input type="time" value={tStart} onChange={(e) => setTStart(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Access End Time</label>
              <input type="time" value={tEnd} onChange={(e) => setTEnd(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"/>
            </div>
          </div>
          {tEnd && tStart && tEnd <= tStart ? (
            <p className="mt-2 mb-2 text-xs text-red-600">End time must be later than start time.</p>
          ) : (
            <div className="mb-4" />
          )}
          <button disabled={savingSection === "access" || loading || (!!tEnd && !!tStart && tEnd <= tStart)} onClick={() => save("access")} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{savingSection === "access" ? "Saving..." : "Save Restrictions"}</button>
        </div>

        {/* Session Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Session Settings</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">User session timeout</label>
              <select value={session} onChange={(e) => setSession(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                {SESSION_TIMEOUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <button disabled={savingSection === "session" || loading} onClick={() => save("session")} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{savingSection === "session" ? "Saving..." : "Save"}</button>
          </div>
        </div>

        {/* Inactivity Logout */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Inactivity Logout</h2>
          <p className="text-xs text-gray-500 mb-4">Automatically log out staff members after a period of inactivity. Admins are not affected. Leave the value empty to disable.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Inactivity timeout</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={inactivityValue}
                  onChange={(e) => setInactivityValue(e.target.value)}
                  placeholder="Disabled"
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={inactivityUnit}
                  onChange={(e) => setInactivityUnit(e.target.value as InactivityUnit)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                >
                  {INACTIVITY_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              disabled={savingSection === "inactivity" || loading}
              onClick={() => save("inactivity")}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
            >
              {savingSection === "inactivity" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Google Account */}
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

async function getJson<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Request failed");
  }
  return json.data;
}
