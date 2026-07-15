"use client";

import { useState } from "react";
import { useSettingsData } from "./useSettingsData";
import EmailRulesSection from "./EmailRulesSection";
import GeneralTab from "./GeneralTab";
import DecorationTab from "./DecorationTab";
import TrackingTab from "./TrackingTab";
import { SETTINGS_TABS, type SettingsTabId } from "./constants";

export default function SettingsPage() {
  const s = useSettingsData();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");

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
      <div className="max-w-5xl flex flex-col gap-5 md:flex-row md:items-start">
        <nav className="flex flex-row gap-1 overflow-x-auto md:w-48 md:shrink-0 md:flex-col md:overflow-visible">
          {SETTINGS_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  active ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          {activeTab === "general" && <GeneralTab s={s} />}
          {activeTab === "notifications" && (
            <EmailRulesSection
              emailRules={s.emailRules}
              setEmailRules={s.setEmailRules}
              activeUsers={activeUsers}
              activeAdmins={activeAdmins}
              save={(section) => void s.save(section)}
              savingSection={s.savingSection}
              loading={s.loading}
            />
          )}
          {activeTab === "decoration" && <DecorationTab s={s} />}
          {activeTab === "tracking" && <TrackingTab s={s} activeUsers={activeUsers} />}

          {s.loading && <div className="text-sm text-center text-gray-500 pb-2">Loading settings...</div>}
          {s.error && <div className="text-sm text-center text-red-600 pb-2">{s.error}</div>}
          {s.showSaveMsg && <div className="text-sm text-center text-green-600 pb-2">{s.saveMsg}</div>}
        </div>
      </div>
    </main>
  );
}
