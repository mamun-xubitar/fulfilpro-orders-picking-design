'use client';

import { ModalShell } from '@/components/ModalShell';
import ImageCardsGrid from '../ImageCardsGrid';
import PoFormBody from '../PoFormBody';
import PricingMarginPanel from '../PricingMarginPanel';
import ProductFieldsPanel from '../ProductFieldsPanel';
import type { InventoryPage } from '../hooks/useInventoryPage';
import { Check, ChevronLeft, ChevronRight } from '../icons';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_FINISH, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from '../modalStyles';
import AnimatedStepBody from './AnimatedStepBody';
import StepBasics from './StepBasics';
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
      wide
      bodyClassName={WIZARD_BODY_CLASS}
      footer={<Footer p={p} w={w} />}
      disableBackdropClose
    >
      <div className="mb-3">
        <StepPills step={w.step} steps={STEP_META} />
      </div>

      {/* <StepHeader step={w.step} total={STEP_META.length} meta={meta} /> */}

      {/* The card's height eases between steps instead of jumping — see AnimatedStepBody. Each
          step still gets a modest floor so a short step (or the "Setting up product…" wait)
          doesn't collapse to nothing. */}
      <div className={WIZARD_CARD_CLASS}>
        <AnimatedStepBody>
          {w.step === 1 && <StepBasics p={p} basics={w.basics} />}

          {w.step > 1 && w.awaitingProduct && (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm font-medium text-inventory-secondary">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-inventory-secondary/20 border-t-inventory-primary" />
              Setting up product…
            </div>
          )}

          {w.step === 2 && !w.awaitingProduct && (
            <ProductFieldsPanel
              details={p.details}
              supplierOptions={p.supplierOptions}
              optionLibrary={p.optionLibrary}
              inventoryCategories={p.inventoryCategories}
              suppliers={p.suppliers}
              product={p.product}
              onOptionsApplied={p.onVariantSaved}
              embedded
            />
          )}

          {w.step === 3 && !w.awaitingProduct && (
            <ImageCardsGrid images={p.gallery.images} colours={p.details.colours} imageMutations={p.imageMutations} />
          )}

          {w.step === 4 && !w.awaitingProduct && (
            <PricingMarginPanel
              pricing={p.pricing}
              storeListings={p.storeListings}
              onEditStorePrice={p.setStorePriceTarget}
              purchaseOrders={p.po.purchaseOrders}
              onReceive={p.po.openReceive}
              embedded
            />
          )}

          {w.step === 5 && !w.awaitingProduct && <PoFormBody compact po={p.po} variants={p.product?.variants ?? []} />}
        </AnimatedStepBody>
      </div>
    </ModalShell>
  );
}

function Footer({ p, w }: { p: InventoryPage; w: ReturnType<typeof useNewProductWizard> }) {
  const secondaryClass = WIZARD_BTN_SECONDARY;
  const primaryClass = WIZARD_BTN_PRIMARY;
  const finishClass = WIZARD_BTN_FINISH;

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
