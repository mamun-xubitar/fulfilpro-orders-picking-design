'use client';

import { Check } from '../icons';

type StepPillsProps = {
  step: number;
  labels: string[];
};

/** Wizard progress indicator — numbered pills joined by connector lines, mirroring the visual
 * language of AddStoreModal's StepPill (app/(shell)/stores/modules/AddStoreModal.tsx), reimplemented
 * here rather than shared since that component is file-local and stores/inventory shouldn't couple. */
export default function StepPills({ step, labels }: StepPillsProps) {
  return (
    <div className="flex items-center">
      {labels.map((label, index) => {
        const stepNumber = index + 1;
        const active = stepNumber === step;
        const done = stepNumber < step;
        return (
          <div key={label} className="flex min-w-0 flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done ? 'bg-green-100 text-green-700' : active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : stepNumber}
              </div>
              <span className={`max-w-full truncate whitespace-nowrap text-[10px] font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            </div>
            {stepNumber < labels.length && <div className="mx-2 h-px flex-1 bg-gray-200" />}
          </div>
        );
      })}
    </div>
  );
}
