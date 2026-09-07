/** Labelled rule between two stacked StoreDraftBlocks in the publish / bulk-update modals — with
 * three or more stores selected a bare `space-y-*` gap reads as one continuous form, so this
 * makes the boundary between stores explicit. */
export default function StoreBlockSeparator() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-black" />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-black">Next store</span>
      <span className="h-px flex-1 bg-black" />
    </div>
  );
}
