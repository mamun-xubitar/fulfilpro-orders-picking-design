'use client';

import type { AppSettingsRow } from '@/models/settings.model.server';
import type { SettingsSection } from './useSettingsData';

export type RuleUser = AppSettingsRow['emailRules']['eligibleUsers']['activeUsers'][number];

type Props = {
  emailRules: AppSettingsRow['emailRules'];
  setEmailRules: React.Dispatch<React.SetStateAction<AppSettingsRow['emailRules']>>;
  activeUsers: RuleUser[];
  activeAdmins: RuleUser[];
  save: (section: SettingsSection) => void;
  savingSection: SettingsSection | null;
  loading: boolean;
};

export default function EmailRulesSection({ emailRules, setEmailRules, activeUsers, activeAdmins, save, savingSection, loading }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Email/Notification Sending Rules</h2>
          <p className="text-xs text-gray-500 mt-1">Control who can receive each notification and who is selected by default in recipient pickers.</p>
        </div>
        <button disabled={savingSection === 'emailRules' || loading} onClick={() => save('emailRules')} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto">{savingSection === 'emailRules' ? 'Saving...' : 'Save Rules'}</button>
      </div>

      <RuleCard title="Staff/Test/Picker/Decorator Login Approval" hint="Who will receive login approval request emails and notifications?">
        <UserChecklist users={activeAdmins} selectedUserIds={emailRules.loginApprovalRecipientUserIds} onChange={(ids) => setEmailRules((prev) => ({ ...prev, loginApprovalRecipientUserIds: ids }))} />
      </RuleCard>

      <RuleCard title="Back-In-Stock Request Notifications" hint="Who will receive emails and notifications for new back-in-stock requests?">
        <UserChecklist users={activeUsers} selectedUserIds={emailRules.backInStockAdminRecipientUserIds} onChange={(ids) => setEmailRules((prev) => ({ ...prev, backInStockAdminRecipientUserIds: ids }))} />
      </RuleCard>

      <RuleCard title="Stock Adjustment Notifications" hint="Who will receive emails and notifications to adjust the stocks when staff create a fulfillment?">
        <UserChecklist users={activeUsers} selectedUserIds={emailRules.stockAdjustmentRecipientUserIds} onChange={(ids) => setEmailRules((prev) => ({ ...prev, stockAdjustmentRecipientUserIds: ids }))} />
      </RuleCard>

      <RuleCard title="Fulfillment Permission Requests" hint="Who will receive emails and notifications when a user requests permission to edit/cancel an order fulfillment?">
        <AllowedDefaultChecklist
          users={activeAdmins}
          allowedUserIds={emailRules.fulfillmentRequestAllowedUserIds}
          defaultUserIds={emailRules.fulfillmentRequestDefaultUserIds}
          onAllowedChange={(ids) => setEmailRules((prev) => ({ ...prev, fulfillmentRequestAllowedUserIds: ids, fulfillmentRequestDefaultUserIds: prev.fulfillmentRequestDefaultUserIds.filter((id) => ids.includes(id)) }))}
          onDefaultChange={(ids) => setEmailRules((prev) => ({ ...prev, fulfillmentRequestDefaultUserIds: ids }))}
        />
      </RuleCard>

      <RuleCard title="Picking List Packing Notifications" hint="Who will receive emails and notifications if an order is packed/canceled?">
        <AllowedDefaultChecklist
          users={activeUsers}
          allowedUserIds={emailRules.pickingPackingAllowedUserIds}
          defaultUserIds={emailRules.pickingPackingDefaultUserIds}
          onAllowedChange={(ids) => setEmailRules((prev) => ({ ...prev, pickingPackingAllowedUserIds: ids, pickingPackingDefaultUserIds: prev.pickingPackingDefaultUserIds.filter((id) => ids.includes(id)) }))}
          onDefaultChange={(ids) => setEmailRules((prev) => ({ ...prev, pickingPackingDefaultUserIds: ids }))}
        />
      </RuleCard>

      <RuleCard title="Order & Picking-List Direct Messages" hint="Who will receive email and notification for direct messages on orders and picking list tables?">
        <AllowedDefaultChecklist
          users={activeUsers}
          allowedUserIds={emailRules.directMessageAllowedUserIds}
          defaultUserIds={emailRules.directMessageDefaultUserIds}
          onAllowedChange={(ids) => setEmailRules((prev) => ({ ...prev, directMessageAllowedUserIds: ids, directMessageDefaultUserIds: prev.directMessageDefaultUserIds.filter((id) => ids.includes(id)) }))}
          onDefaultChange={(ids) => setEmailRules((prev) => ({ ...prev, directMessageDefaultUserIds: ids }))}
        />
      </RuleCard>

      <RuleCard title="Back-In-Stock Requester Updates" hint="Dynamic recipient toggle for update emails to the original requester.">
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
  );
}

export function RuleCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 mb-3">{hint}</p>
      {children}
    </section>
  );
}

export function UserChecklist({ users, selectedUserIds, onChange }: { users: RuleUser[]; selectedUserIds: string[]; onChange: (ids: string[]) => void }) {
  if (users.length === 0) return <p className="text-xs text-gray-500">No eligible active users.</p>;
  return (
    <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-1">
      {users.map((user) => (
        <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
          <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => onChange(toggleId(selectedUserIds, user.id))} className="cursor-pointer rounded border-gray-300 text-blue-600" />
          <span>{user.name}</span>
          <span className="text-xs text-gray-400">{user.email}</span>
        </label>
      ))}
    </div>
  );
}

export function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function AllowedDefaultChecklist({ users, allowedUserIds, defaultUserIds, onAllowedChange, onDefaultChange }: { users: RuleUser[]; allowedUserIds: string[]; defaultUserIds: string[]; onAllowedChange: (ids: string[]) => void; onDefaultChange: (ids: string[]) => void }) {
  if (users.length === 0) return <p className="text-xs text-gray-500">No eligible active users.</p>;
  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white">
      <div className="grid grid-cols-[minmax(0,1fr)_92px_92px] gap-2 border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase text-gray-500">
        <span>User</span>
        <span className="text-center">Allowed</span>
        <span className="flex items-center justify-center gap-1 text-center">
          Default
          <span className="tooltip inline-flex" aria-label="User can't deselect receiver from sender list">
            <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-11.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 8V8H8v2h1v4H8v2h4v-2h-1Z" clipRule="evenodd" />
            </svg>
            <span className="tt normal-case" style={{ bottom: 'auto', left: 'auto', right: 0, top: '140%', transform: 'none', whiteSpace: 'normal', width: '220px' }}>
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
                <input type="checkbox" checked={isAllowed} onChange={() => onAllowedChange(toggleId(allowedUserIds, user.id))} className="cursor-pointer rounded border-gray-300 text-blue-600" />
              </div>
              <div className="flex justify-center">
                <input type="checkbox" checked={isDefault} disabled={!isAllowed} onChange={() => onDefaultChange(toggleId(defaultUserIds, user.id).filter((id) => allowedUserIds.includes(id) || id === user.id))} className="cursor-pointer rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
