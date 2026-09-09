'use client';

import { ModalShell } from '@/components/ModalShell';
import ImageCardsGrid from '../ImageCardsGrid';
import PoFormBody from '../PoFormBody';
import PricingMarginPanel from '../PricingMarginPanel';
import ProductFieldsPanel from '../ProductFieldsPanel';
import type { InventoryPage } from '../hooks/useInventoryPage';
import StepBasics from './StepBasics';
import StepPills from './StepPills';
import { STEP_LABELS, useNewProductWizard } from './useNewProductWizard';

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

  return (
    <ModalShell
      title="New product"
      onClose={w.close}
      extraWide
      bodyClassName="thin-scroll"
      footer={<Footer p={p} w={w} />}
      disableBackdropClose
    >
      <div className="mb-5">
        <StepPills step={w.step} labels={STEP_LABELS} />
      </div>

      {/* A fixed floor keeps the modal's height stable across the step-1 → step-2 swap and the
          "Setting up product…" wait — without it the shell collapses to the spinner's height and
          re-expands the instant the panel mounts. */}
      <div className="flex min-h-[26rem] flex-col">
        {w.step === 1 && <StepBasics p={p} basics={w.basics} />}

        {w.step > 1 && w.awaitingProduct && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
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

function Footer({ p, w }: { p: InventoryPage; w: ReturnType<typeof useNewProductWizard> }) {
  const buttonClass =
    'rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';
  const secondaryClass = `${buttonClass} border border-gray-300 bg-white text-gray-600 hover:bg-gray-50`;
  const primaryClass = `${buttonClass} bg-blue-600 text-white hover:bg-blue-700`;

  if (w.step === 1) {
    return (
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={w.close} className={secondaryClass}>
          Cancel
        </button>
        <button type="button" onClick={w.basics.submit} disabled={w.basics.disabled || p.creatingProduct} className={primaryClass}>
          {p.creatingProduct ? 'Creating…' : 'Next'}
        </button>
      </div>
    );
  }

  const nextDisabled = w.awaitingProduct || (w.step === 2 && p.details.saving) || (w.step === 4 && p.pricing.saving);

  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={w.back} disabled={w.step === 2} className={secondaryClass}>
        Back
      </button>
      <div className="flex items-center gap-2">
        <button type="button" onClick={w.skip} className={secondaryClass}>
          Skip
        </button>
        {w.step === 5 ? (
          <button type="button" onClick={w.finish} disabled={w.awaitingProduct || p.po.saving} className={primaryClass}>
            {p.po.saving ? 'Saving…' : 'Finish'}
          </button>
        ) : (
          <button type="button" onClick={w.next} disabled={nextDisabled} className={primaryClass}>
            {(w.step === 2 && p.details.saving) || (w.step === 4 && p.pricing.saving) ? 'Saving…' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
}
