"use client";

type RestrictedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  autoApproved: boolean;
};

export default function LoginManagerModal({
  today,
  users,
  selectedIds,
  saving,
  onToggleUser,
  onToggleSelectAll,
  onSave,
  onClose,
}: {
  today: string;
  users: RestrictedUser[];
  selectedIds: string[];
  saving: boolean;
  onToggleUser: (id: string) => void;
  onToggleSelectAll: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Login Manager</h3>
          <p className="text-sm text-gray-500">Auto-approve staff logins for today ({today})</p>
        </div>
        <div className="space-y-1 px-5 py-4 max-h-96 overflow-y-auto">
          {users.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No staff users found</p>
          )}
          {users.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 border-b border-gray-100 mb-1">
              <input
                type="checkbox"
                checked={selectedIds.length === users.length}
                onChange={onToggleSelectAll}
                className="cursor-pointer rounded border-gray-300 text-blue-600"
              />
              <span className="font-medium text-gray-900">Select all</span>
            </label>
          )}
          {users.map((u) => (
            <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedIds.includes(u.id)}
                onChange={() => onToggleUser(u.id)}
                className="cursor-pointer rounded border-gray-300 text-blue-600"
              />
              <span className="font-medium text-gray-900">{u.name}</span>
              <span className="text-xs text-gray-400">{u.email}</span>
              <span className="ml-auto text-xs text-gray-400">{u.role}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
