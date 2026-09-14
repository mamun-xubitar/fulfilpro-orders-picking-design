import type { StepMeta } from './steps';

type StepHeaderProps = {
  step: number;
  total: number;
  meta: StepMeta;
};

/** Colored banner above the active step's content — icon tile, title, one-line description and a
 * "Step X of N" chip. Wizard-local; the embedded panels it sits above (ProductFieldsPanel,
 * ImageCardsGrid, PricingMarginPanel, PoFormBody) are unaware of it. */
export default function StepHeader({ step, total, meta }: StepHeaderProps) {
  const Icon = meta.icon;
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-[10px] border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50/60 to-white px-3 py-2">
      <div className="flex min-w-0 items-center gap-[10px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_2px_6px_0_rgb(37_99_235/0.35)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-bold text-gray-900">{meta.label}</p>
          <p className="truncate text-[10px] text-gray-500">{meta.description}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full border border-blue-200 bg-white px-[8px] py-[3px] text-[9.5px] font-bold uppercase leading-none tracking-[0.4px] text-blue-700">
        Step {step} of {total}
      </span>
    </div>
  );
}
