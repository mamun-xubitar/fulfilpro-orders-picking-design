'use client';

import { Check } from '../icons';
import type { StepMeta } from './steps';

type StepPillsProps = {
  step: number;
  steps: StepMeta[];
};

/** Wizard progress indicator — numbered pills joined by connector lines, mirroring the visual
 * language of AddStoreModal's StepPill (app/(shell)/stores/modules/AddStoreModal.tsx), reimplemented
 * here rather than shared since that component is file-local and stores/inventory shouldn't couple. */
export default function StepPills({ step, steps }: StepPillsProps) {
  return (
    <div className="flex items-center">
      {steps.map((meta, index) => {
        const stepNumber = index + 1;
        const active = stepNumber === step;
        const done = stepNumber < step;
        const Icon = meta.icon;
        return (
          <div key={meta.label} className="flex min-w-0 flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div
                aria-current={active ? 'step' : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
                  done
                    ? 'bg-emerald-500 text-white shadow-[0_1px_3px_0_rgb(16_185_129/0.4)]'
                    : active
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-4 ring-blue-100 shadow-[0_2px_6px_0_rgb(37_99_235/0.35)]'
                      : 'border border-gray-200 bg-white text-gray-400'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span
                className={`max-w-full truncate whitespace-nowrap text-[10px] ${
                  active ? 'font-semibold text-blue-700' : done ? 'font-medium text-emerald-700' : 'font-medium text-gray-400'
                }`}
              >
                {meta.label}
              </span>
            </div>
            {stepNumber < steps.length && (
              <div
                className={`mx-2 h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                  done ? 'bg-emerald-400' : stepNumber === step ? 'bg-gradient-to-r from-emerald-400 to-blue-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
