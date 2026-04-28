"use client";
import { useState } from "react";

const TIMEZONES = [
  "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
  "Australia/Perth", "Australia/Adelaide", "America/New_York",
  "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Asia/Dubai", "UTC",
];

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_ON = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

const SECTION_LABELS: Record<string, string> = {
  timezone: "Timezone",
  access: "Staff access restrictions",
  session: "Session settings",
  sync: "Sync settings",
};

export default function SettingsPage() {
  const [tz, setTz] = useState("Australia/Sydney");
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(DEFAULT_ON));
  const [tStart, setTStart] = useState("08:00");
  const [tEnd, setTEnd] = useState("16:00");
  const [session, setSession] = useState("30 min");
  const [sync, setSync] = useState("2 min");
  const [saveMsg, setSaveMsg] = useState("");
  const [showSaveMsg, setShowSaveMsg] = useState(false);

  function toggleDay(day: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  }

  function save(section: string) {
    setSaveMsg(`✓ ${SECTION_LABELS[section]} saved.`);
    setShowSaveMsg(true);
    setTimeout(() => setShowSaveMsg(false), 2500);
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
            <button onClick={() => save("timezone")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer">Save</button>
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
          <button onClick={() => save("access")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer">Save Restrictions</button>
        </div>

        {/* Session Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Session Settings</h2>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Idle session timeout</label>
              <select value={session} onChange={(e) => setSession(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                <option>15 min</option>
                <option>30 min</option>
                <option>60 min</option>
              </select>
            </div>
            <button onClick={() => save("session")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer">Save</button>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Sync Settings</h2>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Auto-sync interval</label>
              <select value={sync} onChange={(e) => setSync(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                <option>2 min</option>
                <option>5 min</option>
                <option>10 min</option>
                <option>Manual only</option>
              </select>
            </div>
            <button onClick={() => save("sync")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer">Save</button>
          </div>
        </div>

        {showSaveMsg && <div className="text-sm text-center text-green-600 pb-2">{saveMsg}</div>}

      </div>
    </main>
  );
}
