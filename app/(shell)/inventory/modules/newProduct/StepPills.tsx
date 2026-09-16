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
                    ? 'bg-inventory-success text-white shadow-[0_1px_3px_0_rgb(22_163_74/0.4)]'
                    : active
                      ? 'bg-gradient-to-br from-inventory-primary to-inventory-primary-hover text-white ring-4 ring-inventory-primary-ring shadow-[0_2px_6px_0_rgb(91_63_214/0.35)]'
                      : 'border border-inventory-border bg-inventory-surface text-inventory-text-subtle'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span
                className={`max-w-full truncate whitespace-nowrap text-[10px] ${
                  active ? 'font-semibold text-inventory-secondary' : done ? 'font-medium text-inventory-success-hover' : 'font-medium text-inventory-text-subtle'
                }`}
              >
                {meta.label}
              </span>
            </div>
            {stepNumber < steps.length && (
              <div
                className={`mx-2 h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                  done ? 'bg-inventory-success' : stepNumber === step ? 'bg-gradient-to-r from-inventory-success to-inventory-primary' : 'bg-inventory-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
