'use client';

import type { TaskForm, TaskRow, UserOption } from './types';
import { DUE_TYPE_OPTIONS, RECURRENCE_OPTIONS } from './constants';
import AssigneeMultiSelect from './AssigneeMultiSelect';
import PerAssigneeDescriptions from './PerAssigneeDescriptions';

type SetField = (field: keyof TaskForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

type Props = {
  open: boolean;
  editTask: TaskRow | null;
  form: TaskForm;
  set: SetField;
  toggleAssignee: (id: string) => void;
  setSingleAssignee: (id: string) => void;
  setDescriptionFor: (id: string, value: string) => void;
  togglePerAssigneeDescription: () => void;
  errors: Record<string, string>;
  loading: boolean;
  users: UserOption[];
  onSubmit: () => void;
  onClose: () => void;
};

export default function AddEditTaskModal({
  open, editTask, form, set, toggleAssignee, setSingleAssignee, setDescriptionFor, togglePerAssigneeDescription,
  errors, loading, users, onSubmit, onClose,
}: Props) {
  if (!open) return null;

  const title = editTask ? 'Edit Task' : 'Assign Task';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <Field label="Title" error={errors.title}>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Task title"
            />
          </Field>

          {editTask ? (
            <EditModeFields form={form} set={set} setSingleAssignee={setSingleAssignee} users={users} errors={errors} />
          ) : (
            <CreateModeFields
              form={form}
              set={set}
              toggleAssignee={toggleAssignee}
              setDescriptionFor={setDescriptionFor}
              togglePerAssigneeDescription={togglePerAssigneeDescription}
              users={users}
              errors={errors}
            />
          )}

          {errors.general && (
            <p className="text-sm text-red-600">{errors.general}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {editTask ? 'Save Changes' : 'Assign Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModeFields({
  form, set, setSingleAssignee, users, errors,
}: {
  form: TaskForm;
  set: SetField;
  setSingleAssignee: (id: string) => void;
  users: UserOption[];
  errors: Record<string, string>;
}) {
  return (
    <>
      <Field label="Description" error={errors.description}>
        <textarea
          value={form.description}
          onChange={set('description')}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Describe the task..."
        />
      </Field>

      <DueDateField form={form} set={set} error={errors.dueDate} />

      <Field label="Assignee" error={errors.assigneeId}>
        <select
          value={form.assigneeIds[0] ?? ''}
          onChange={(e) => setSingleAssignee(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">Select a user...</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
          ))}
        </select>
      </Field>
    </>
  );
}

function CreateModeFields({
  form, set, toggleAssignee, setDescriptionFor, togglePerAssigneeDescription, users, errors,
}: {
  form: TaskForm;
  set: SetField;
  toggleAssignee: (id: string) => void;
  setDescriptionFor: (id: string, value: string) => void;
  togglePerAssigneeDescription: () => void;
  users: UserOption[];
  errors: Record<string, string>;
}) {
  return (
    <>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={form.perAssigneeDescription} onChange={togglePerAssigneeDescription} className="cursor-pointer" />
        Per-Assignee Description
      </label>

      {form.perAssigneeDescription ? (
        <PerAssigneeDescriptions assigneeIds={form.assigneeIds} users={users} values={form.descriptions} onChange={setDescriptionFor} errors={errors} />
      ) : (
        <Field label="Description" error={errors.description}>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Describe the task..."
          />
        </Field>
      )}

      <DueDateField form={form} set={set} error={errors.dueDate} />

      <AssigneeMultiSelect users={users} selectedIds={form.assigneeIds} onToggle={toggleAssignee} error={errors.assigneeIds} />

      <Field label="Recurring Task" error={errors.recurrence}>
        <select
          value={form.recurrence}
          onChange={set('recurrence')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">Select Recurring…</option>
          {RECURRENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      {form.recurrence && (
        <Field label="Recurring End Date" error={errors.recurrenceEndDate}>
          <input
            type="date"
            value={form.recurrenceEndDate}
            onChange={set('recurrenceEndDate')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
      )}

      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        Recurring tasks are created automatically by a daily background check, using the recurrence option and end date above. Turning off recurrence just creates a one-off task.
      </p>
    </>
  );
}

function DueDateField({ form, set, error }: { form: TaskForm; set: SetField; error?: string }) {
  return (
    <Field label="Due Date & Time" error={error}>
      <select
        value={form.dueType}
        onChange={set('dueType')}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {DUE_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {form.dueType === 'CUSTOM' && (
        <input
          type="datetime-local"
          value={form.dueDate}
          onChange={set('dueDate')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
        />
      )}
    </Field>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
