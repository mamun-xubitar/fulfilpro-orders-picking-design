'use client';

import { MODAL_FOOTER_BTN_DANGER, MODAL_FOOTER_BTN_SECONDARY, ModalActions, ModalShell } from '@/components/ModalShell';
import type { LocationOption } from '../hooks/useLocations';
import type { OptionLibraryState } from '../hooks/useOptionLibrary';
import { WIZARD_BODY_CLASS } from '../modalStyles';
import type { ProductRecord } from '../types';
import OptionColumn from './OptionColumn';
import VariantListColumn from './VariantListColumn';
import { useColourSizeModal } from './useColourSizeModal';

type ColourSizeModalProps = {
  product: ProductRecord;
  optionLibrary: OptionLibraryState;
  locationOptions: LocationOption[];
  onApplied: (product: ProductRecord) => void;
  onClose: () => void;
};

/**
 * "Colour & size adjustment" — the single modal every "+ Colour"/"+ Size" entry point opens
 * (Product details, the Variants / stock toolbar, and step 2 of the New Product wizard). Three
 * columns: the global colour library, the global size library, and a live preview of the variants
 * checked colours x checked sizes would produce. Replace/Insert are the only actions that write
 * anything to the product — see useColourSizeModal for the state and SupplierProductModel.applyOptions
 * for what each does server-side.
 */
export default function ColourSizeModal({ product, optionLibrary, locationOptions, onApplied, onClose }: ColourSizeModalProps) {
  const m = useColourSizeModal({ product, optionLibrary, locationOptions, onApplied, onClose });

  return (
    <ModalShell
      title="Colour & size adjustment"
      compact
      maxWidthClass="max-w-4xl"
      disableBackdropClose
      onClose={onClose}
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={onClose} className={MODAL_FOOTER_BTN_SECONDARY}>
              Cancel
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[10px] font-semibold leading-none text-inventory-text-subtle">
                {m.newVariantCount > 0 && <span className="text-inventory-success-hover">+{m.newVariantCount} new</span>}
                {m.newVariantCount > 0 && m.removedVariantCount > 0 && ' · '}
                {m.removedVariantCount > 0 && <span className="text-inventory-danger">−{m.removedVariantCount} removed</span>}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={m.openReplaceConfirm}
                  disabled={!m.canReplace}
                  title={m.replaceDisabledReason ?? undefined}
                  className={MODAL_FOOTER_BTN_DANGER}
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={m.insert}
                  disabled={!m.canInsert}
                  title={m.insertDisabledReason ?? undefined}
                  className="h-[28px] rounded-[7px] bg-inventory-primary px-3 text-[11px] font-bold text-white hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] leading-tight text-inventory-text-subtle">
            <span className="font-semibold">Replace</span> deletes every existing variant and creates the checked colours x sizes.{' '}
            <span className="font-semibold">Insert </span> only adds the checked variants the product doesn&apos;t already have.
          </p>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-[8px] md:h-[420px] md:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,2.2fr)]">
        <OptionColumn
          kind="colour"
          title="Colour"
          items={m.colour.items}
          input={m.colour.input}
          setInput={m.colour.setInput}
          error={m.colour.error}
          hasNew={m.colour.hasNew}
          saving={m.colour.saving}
          onToggle={m.colour.toggle}
          onToggleAll={m.colour.toggleAll}
          onAdd={m.colour.add}
          onRemove={m.colour.remove}
          onSave={m.colour.save}
        />
        <OptionColumn
          kind="size"
          title="Size"
          items={m.size.items}
          input={m.size.input}
          setInput={m.size.setInput}
          error={m.size.error}
          hasNew={m.size.hasNew}
          saving={m.size.saving}
          onToggle={m.size.toggle}
          onToggleAll={m.size.toggleAll}
          onAdd={m.size.add}
          onRemove={m.size.remove}
          onSave={m.size.save}
        />
        <VariantListColumn variants={m.variants} location={m.location} onChange={m.setVariantValue} onFillAll={m.fillAll} />
      </div>

      {m.replaceConfirmOpen && (
        <ModalShell
          disableBackdropClose
          elevated
          compact
          title="Replace all variants?"
          onClose={m.closeReplaceConfirm}
          footer={
            <ModalActions
              onCancel={m.closeReplaceConfirm}
              onConfirm={m.confirmReplace}
              confirmLabel={m.applying ? 'Replacing…' : 'Replace'}
              disabled={m.applying}
              danger
              compact
            />
          }
        >
          <p className="text-[12px] text-inventory-text-muted">
            This deletes all <span className="font-semibold text-inventory-text">{m.existingVariantCount}</span> existing variant
            {m.existingVariantCount === 1 ? '' : 's'} — along with their stocktake, adjustment and store-listing history — and creates{' '}
            <span className="font-semibold text-inventory-text">{m.variants.length}</span> new one{m.variants.length === 1 ? '' : 's'} from the checked colours
            and sizes.
          </p>
        </ModalShell>
      )}
    </ModalShell>
  );
}
