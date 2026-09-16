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
    <div className="mb-3 flex items-center justify-between gap-3 rounded-[10px] border border-inventory-secondary/20 bg-gradient-to-r from-inventory-secondary/10 via-inventory-primary/[8%] to-inventory-surface px-3 py-2">
      <div className="flex min-w-0 items-center gap-[10px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-inventory-primary to-inventory-primary-hover text-white shadow-[0_2px_6px_0_rgb(91_63_214/0.35)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-bold text-inventory-text">{meta.label}</p>
          <p className="truncate text-[10px] text-inventory-text-subtle">{meta.description}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full border border-inventory-secondary/30 bg-inventory-surface px-[8px] py-[3px] text-[9.5px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-secondary">
        Step {step} of {total}
      </span>
    </div>
  );
}
