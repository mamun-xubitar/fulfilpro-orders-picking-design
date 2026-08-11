'use client';

import { useSettingsData } from "./useSettingsData";
import { RuleCard, UserChecklist } from "./EmailRulesSection";
import type { EmailRuleUser } from "@/lib/email-rules.server";

type Props = {
  s: ReturnType<typeof useSettingsData>;
  activeUsers: EmailRuleUser[];
};

export default function MessagesTab({ s, activeUsers }: Props) {
  const saving = s.savingSection === "messageVisibility";
  const nonAdminUsers = activeUsers.filter((u) => u.role !== "admin");
  const adminIds = activeUsers.filter((u) => u.role === "admin").map((u) => u.id);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Message Permissions</h2>
          <p className="text-xs text-gray-500 mt-1">Control which users each staff member can message. Admins are selected by default for everyone — untick an admin to stop a specific user from messaging them.</p>
        </div>
        <button
          disabled={saving || s.loading}
          onClick={() => void s.save("messageVisibility")}
          className="shrink-0 whitespace-nowrap bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Messages"}
        </button>
      </div>

      {nonAdminUsers.length === 0 ? (
        <p className="text-xs text-gray-500">No non-admin active users.</p>
      ) : (
        nonAdminUsers.map((user) => (
          <RuleCard key={user.id} title={user.name} hint={`${user.email} — users this person can message`}>
            <UserChecklist
              users={activeUsers.filter((u) => u.id !== user.id)}
              selectedUserIds={s.messageVisibility[user.id] ?? adminIds}
              onChange={(ids) => s.setMessageVisibility((prev) => ({ ...prev, [user.id]: ids }))}
            />
          </RuleCard>
        ))
      )}
    </div>
  );
}
