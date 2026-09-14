'use client';

import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import ImageCardsGrid from '../ImageCardsGrid';
import PoFormBody from '../PoFormBody';
import PricingMarginPanel from '../PricingMarginPanel';
import ProductFieldsPanel from '../ProductFieldsPanel';
import type { InventoryPage } from '../hooks/useInventoryPage';
import { Check, ChevronLeft, ChevronRight } from '../icons';
import StepBasics from './StepBasics';
import StepHeader from './StepHeader';
import StepPills from './StepPills';
import { STEP_META } from './steps';
import { useNewProductWizard } from './useNewProductWizard';

type NewProductWizardProps = { p: InventoryPage };

/**
 * The New Product creation flow: step 1 collects the basics and creates the product (the only
 * step with its own create action); steps 2-5 are the page's existing Product details / Images /
 * Pricing & margin / Purchase order surfaces, embedded and driven by the wizard's own footer —
 * see useNewProductWizard for why each reuses the page's existing hooks rather than duplicating
 * state.
 */
export default function NewProductWizard({ p }: NewProductWizardProps) {
  const w = useNewProductWizard(p);

  const meta = STEP_META[w.step - 1];

  return (
    <ModalShell
      title="New product"
      compact
      onClose={w.close}
      extraWide
      bodyClassName="thin-scroll overflow-x-clip bg-gradient-to-b from-blue-50/50 via-white to-white"
      footer={<Footer p={p} w={w} />}
      disableBackdropClose
    >
      <div className="mb-3">
        <StepPills step={w.step} steps={STEP_META} />
      </div>

      <StepHeader step={w.step} total={STEP_META.length} meta={meta} />

      {/* A modest floor keeps the modal's height stable across steps (and the "Setting up
          product…" wait) without forcing a scrollbar — small enough that short steps still fit
          typical viewports. */}
      <div className="flex min-h-[20rem] flex-col rounded-[10px] border border-gray-200 bg-white p-3 shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]">
        {w.step === 1 && <StepBasics p={p} basics={w.basics} />}

        {w.step > 1 && w.awaitingProduct && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm font-medium text-blue-700">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" />
            Setting up product…
          </div>
        )}

        {w.step === 2 && !w.awaitingProduct && (
          <ProductFieldsPanel details={p.details} supplierOptions={p.supplierOptions} presets={p.presets} suppliers={p.suppliers} embedded />
        )}

        {w.step === 3 && !w.awaitingProduct && (
          <ImageCardsGrid images={p.gallery.images} colours={p.details.colours} imageMutations={p.imageMutations} />
        )}

        {w.step === 4 && !w.awaitingProduct && (
          <PricingMarginPanel pricing={p.pricing} storeListings={p.storeListings} onEditStorePrice={p.setStorePriceTarget} embedded />
        )}

        {w.step === 5 && !w.awaitingProduct && <PoFormBody po={p.po} variants={p.product?.variants ?? []} />}
      </div>
    </ModalShell>
  );
}

const SPINNER = <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />;

function Footer({ p, w }: { p: InventoryPage; w: ReturnType<typeof useNewProductWizard> }) {
  const secondaryClass = `${MODAL_FOOTER_BTN_SECONDARY} px-[14px] inline-flex items-center gap-[5px]`;
  const primaryClass = `${MODAL_FOOTER_BTN_PRIMARY} px-[14px] inline-flex items-center gap-[5px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-[0_1px_3px_0_rgb(37_99_235/0.4)]`;
  const finishClass = `${MODAL_FOOTER_BTN_PRIMARY} px-[14px] inline-flex items-center gap-[5px] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-[0_1px_3px_0_rgb(16_185_129/0.4)]`;

  if (w.step === 1) {
    return (
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={w.close} className={secondaryClass}>
          Cancel
        </button>
        <button type="button" onClick={w.basics.submit} disabled={w.basics.disabled || p.creatingProduct} className={primaryClass}>
          {p.creatingProduct ? (
            <>
              {SPINNER}
              Creating…
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-3 w-3" />
            </>
          )}
        </button>
      </div>
    );
  }

  const nextDisabled = w.awaitingProduct || (w.step === 2 && p.details.saving) || (w.step === 4 && p.pricing.saving);
  const nextSaving = (w.step === 2 && p.details.saving) || (w.step === 4 && p.pricing.saving);

  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={w.back} disabled={w.step === 2} className={secondaryClass}>
        <ChevronLeft className="h-3 w-3" />
        Back
      </button>
      <div className="flex items-center gap-2">
        <button type="button" onClick={w.skip} className={secondaryClass}>
          Skip
        </button>
        {w.step === 5 ? (
          <button type="button" onClick={w.finish} disabled={w.awaitingProduct || p.po.saving} className={finishClass}>
            {p.po.saving ? (
              <>
                {SPINNER}
                Saving…
              </>
            ) : (
              <>
                Finish
                <Check className="h-3 w-3" />
              </>
            )}
          </button>
        ) : (
          <button type="button" onClick={w.next} disabled={nextDisabled} className={primaryClass}>
            {nextSaving ? (
              <>
                {SPINNER}
                Saving…
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
