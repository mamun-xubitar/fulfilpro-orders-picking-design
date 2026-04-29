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

const SECTION_LABELS: Record<string, string> = {
  timezone: "Timezone",
  access: "Staff access restrictions",
  session: "Session settings",
};

type ApiResponse<T> = { success: boolean; message: string; data: T };
type SettingsSection = keyof typeof SECTION_LABELS;

export default function SettingsPage() {
  const [tz, setTz] = useState("Australia/Sydney");
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(DEFAULT_ON));
  const [tStart, setTStart] = useState("08:00");
  const [tEnd, setTEnd] = useState("16:00");
  const [session, setSession] = useState(30);
  const [saveMsg, setSaveMsg] = useState("");
  const [showSaveMsg, setShowSaveMsg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [savingSection, setSavingSection] = useState<SettingsSection | null>(null);
  const [error, setError] = useState("");

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

    return { sessionTimeoutMinutes: session };
  }

  function applySettings(settings: AppSettingsRow) {
    setTz(settings.timezone);
    setSelectedDays(new Set(settings.staffAccessDays));
    setTStart(settings.staffAccessStart);
    setTEnd(settings.staffAccessEnd);
    setSession(settings.sessionTimeoutMinutes);
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

  if (!mounted) {
    return (
      <main className="flex-1 p-6">
        <div className="max-w-2xl space-y-5">
          <div className="text-sm text-center text-gray-500 pb-2">Loading settings...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="max-w-2xl space-y-5">

        {/* Timezone */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Timezone</h2>
          <div className="flex items-center gap-3">
            <select
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            >
              {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <button disabled={savingSection === "timezone" || loading} onClick={() => save("timezone")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">{savingSection === "timezone" ? "Saving..." : "Save"}</button>
          </div>
        </div>

        {/* Staff Access Restrictions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
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
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Access Start Time</label>
              <input type="time" value={tStart} onChange={(e) => setTStart(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Access End Time</label>
              <input type="time" value={tEnd} onChange={(e) => setTEnd(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"/>
            </div>
          </div>
          <button disabled={savingSection === "access" || loading} onClick={() => save("access")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">{savingSection === "access" ? "Saving..." : "Save Restrictions"}</button>
        </div>

        {/* Session Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Session Settings</h2>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">User session timeout</label>
              <select value={session} onChange={(e) => setSession(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                {SESSION_TIMEOUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <button disabled={savingSection === "session" || loading} onClick={() => save("session")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">{savingSection === "session" ? "Saving..." : "Save"}</button>
          </div>
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
