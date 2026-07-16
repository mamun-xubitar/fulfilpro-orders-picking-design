'use client';

import { useSettingsData } from "./useSettingsData";
import { RuleCard, UserChecklist } from "./EmailRulesSection";
import type { EmailRuleUser } from "@/lib/email-rules.server";

type Props = {
  s: ReturnType<typeof useSettingsData>;
  activeUsers: EmailRuleUser[];
};

export default function TasksTab({ s, activeUsers }: Props) {
  const saving = s.savingSection === "taskVisibility";
  const nonAdminUsers = activeUsers.filter((u) => u.role !== "admin");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Task Visibility</h2>
          <p className="text-xs text-gray-500 mt-1">Control which users each staff member can see and assign tasks to.</p>
        </div>
        <button
          disabled={saving || s.loading}
          onClick={() => void s.save("taskVisibility")}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
        >
          {saving ? "Saving..." : "Save Tasks"}
        </button>
      </div>

      {nonAdminUsers.length === 0 ? (
        <p className="text-xs text-gray-500">No non-admin active users.</p>
      ) : (
        nonAdminUsers.map((user) => (
          <RuleCard key={user.id} title={user.name} hint={`${user.email} — visible users besides themselves`}>
            <UserChecklist
              users={activeUsers.filter((u) => u.id !== user.id)}
              selectedUserIds={s.taskVisibility[user.id] ?? []}
              onChange={(ids) => s.setTaskVisibility((prev) => ({ ...prev, [user.id]: ids }))}
            />
          </RuleCard>
        ))
      )}
    </div>
  );
}
