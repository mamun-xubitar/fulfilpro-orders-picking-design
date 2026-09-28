/** Blocking notice shown when a selected store's draft excludes every hub variant — always
 * disables Save, since Shopify has no valid shape for a product with zero variants (it would
 * fabricate its own zero-price default one instead). See `hasNoVariantsIncluded` in
 * useStorePublish.ts. */
export default function NoVariantsWarningBanner({ storeNames }: { storeNames: string[] }) {
  if (storeNames.length === 0) return null;

  return (
    <div className="rounded-xl border border-inventory-danger/30 bg-inventory-danger/10 p-3 text-[12px] text-inventory-danger-hover">
      <p className="font-semibold">Select at least one variant to publish</p>
      <p className="mt-1">
        Every variant is excluded for {storeNames.join(', ')} — Shopify needs at least one to publish or update the listing.
      </p>
    </div>
  );
}
