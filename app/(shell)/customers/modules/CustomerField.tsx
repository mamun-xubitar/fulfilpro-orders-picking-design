import type { CustomerFormValues } from './types';

export type TextField = Exclude<keyof CustomerFormValues, 'contacts' | 'addresses'>;
export type FieldChange = (field: TextField) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

export const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL = 'mb-1 block text-xs font-medium uppercase text-gray-500';

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
