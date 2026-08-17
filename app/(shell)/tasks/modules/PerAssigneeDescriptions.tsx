'use client';

import type { UserOption } from './types';

type Props = {
  assigneeIds: string[];
  users: UserOption[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  errors: Record<string, string>;
};

export default function PerAssigneeDescriptions({ assigneeIds, users, values, onChange, errors }: Props) {
  return (
    <div className="space-y-3">
      {assigneeIds.map((id) => {
        const user = users.find((u) => u.id === id);
        const name = user?.name || user?.email || id;
        return (
          <div key={id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description ({name})</label>
            <textarea
              value={values[id] ?? ''}
              onChange={(e) => onChange(id, e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={`Describe the task for ${name}...`}
            />
            {errors[`descriptions.${id}`] && <p className="text-xs text-red-600 mt-1">{errors[`descriptions.${id}`]}</p>}
          </div>
        );
      })}
    </div>
  );
}
