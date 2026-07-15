'use client';

import type { AppSettingsRow } from "@/models/settings.model.server";
import { useSettingsData } from "./useSettingsData";
import { RuleCard, UserChecklist } from "./EmailRulesSection";
import TagInput from "./TagInput";

type Props = {
  s: ReturnType<typeof useSettingsData>;
};

export default function DecorationTab({ s }: Props) {
  const activeAdmins = s.emailRules.eligibleUsers.activeAdminUsers;

  return (
    <div className="space-y-5">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Product Keywords</h2>
            <p className="text-xs text-gray-500 mt-1">Product titles containing these keywords are auto-classified as embroidery or print work.</p>
          </div>
          <button disabled={s.savingSection === "decorationKeywords" || s.loading} onClick={() => void s.save("decorationKeywords")} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{s.savingSection === "decorationKeywords" ? "Saving..." : "Save Keywords"}</button>
        </div>

        <RuleCard title="Embroidery Keywords" hint="Matched at the start of a word, case-insensitive (e.g. 'embroider' also matches 'embroidered').">
          <TagInput
            tags={s.decorationKeywords.embroidery}
            onChange={(tags) => s.setDecorationKeywords((prev) => ({ ...prev, embroidery: tags }))}
            placeholder="Add a keyword and press Enter"
          />
        </RuleCard>

        <RuleCard title="Print Keywords" hint="Matched at the start of a word, case-insensitive (e.g. 'print' also matches 'printed').">
          <TagInput
            tags={s.decorationKeywords.print}
            onChange={(tags) => s.setDecorationKeywords((prev) => ({ ...prev, print: tags }))}
            placeholder="Add a keyword and press Enter"
          />
        </RuleCard>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Re-scan existing orders</h3>
              <p className="text-xs text-gray-500 mt-1">Re-classify already-imported orders using the current keyword lists. Manually overridden line items are left untouched.</p>
            </div>
            <button
              type="button"
              disabled={s.rescanActive || s.rescanning || s.loading}
              onClick={() => void s.rescanDecorations()}
              className="w-full border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
            >
              {s.rescanJob?.status === 'queued'
                ? 'Queued…'
                : s.rescanJob?.status === 'running'
                  ? 'Re-scanning…'
                  : 'Re-scan existing orders'}
            </button>
          </div>

          {s.rescanActive && (
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: s.rescanProgress && s.rescanProgress.total > 0
                      ? `${Math.min(100, Math.round((s.rescanProgress.scanned / s.rescanProgress.total) * 100))}%`
                      : '0%',
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {s.rescanProgress
                  ? `${s.rescanProgress.scanned.toLocaleString()} of ${s.rescanProgress.total.toLocaleString()} orders scanned`
                  : 'Waiting for worker to pick up the job…'}
              </p>
            </div>
          )}

          {!s.rescanActive && (
            <p className="text-xs text-gray-500 mt-2">{s.lastScanned || 'Never scanned'}</p>
          )}
          {s.rescanError && <p className="text-xs text-red-600 mt-1">{s.rescanError}</p>}
        </div>
      </div>
    </div>
  );
}
