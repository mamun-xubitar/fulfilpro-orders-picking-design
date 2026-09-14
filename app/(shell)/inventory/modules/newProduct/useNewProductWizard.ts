'use client';

import { useEffect, useState } from 'react';
import type { InventoryPage } from '../hooks/useInventoryPage';
import { STEP_META } from './steps';
import { useStepBasicsForm } from './useStepBasicsForm';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export const STEP_LABELS = STEP_META.map((s) => s.label);

/**
 * Drives the New Product wizard. Step 1 is the only step with its own create action (the product
 * doesn't exist yet); steps 2-5 render the page's existing panels/hooks (`p.details`, `p.pricing`,
 * `p.gallery`/`p.imageMutations`, `p.po`) already scoped to whichever product is focused — which,
 * after step 1, is the product this wizard just created (see useInventoryPage.createProduct).
 */
export function useNewProductWizard(p: InventoryPage) {
  const [step, setStep] = useState<WizardStep>(1);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const basics = useStepBasicsForm(p, (id) => {
    setCreatedProductId(id);
    setStep(2);
  });

  // The page hasn't finished navigating to (and fetching) the just-created product yet — steps
  // 2-5 show a loading state instead of the panel until this clears.
  const awaitingProduct = createdProductId !== null && p.product?.id !== createdProductId;

  // Steps 2 and 4 (Product details / Pricing & margin) no longer need an explicit "enter edit
  // mode" effect — both panels are always editable now (see useProductDetails/useProductPricing
  // `editing`), so there's nothing left to trigger on arrival.

  // Seeds the PO form from the product's variants on arrival at step 5 — without opening the
  // standalone Create PO modal (see usePurchaseOrder.seedForm).
  useEffect(() => {
    if (step === 5 && !awaitingProduct && p.product) p.po.seedForm([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, awaitingProduct, p.product?.id]);

  const back = () => setStep((s) => (s > 2 ? ((s - 1) as WizardStep) : s));

  const close = () => {
    setStep(1);
    setCreatedProductId(null);
    p.closeNewProduct();
  };

  const next = () => {
    if (step === 2) {
      p.details.saveDetails(() => setStep(3));
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      p.pricing.savePricing(() => setStep(5));
    }
  };

  const skip = () => {
    if (step === 2) {
      p.details.cancelEdit();
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      p.pricing.cancelEdit();
      setStep(5);
      return;
    }
    if (step === 5) close();
  };

  const finish = () => p.po.saveAndSend(close);

  return { step, basics, awaitingProduct, back, close, next, skip, finish };
}
