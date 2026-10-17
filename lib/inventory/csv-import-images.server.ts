import { SupplierProductModel } from '@/models/supplier-product.model.server';
import { localizeImageUrls } from '@/lib/uploads.server';

const productModel = new SupplierProductModel();

/** Suffix for an import's result message when some images kept their remote link. */
export function imageFailureNote(failed: number) {
  return failed > 0 ? `; ${failed} image${failed === 1 ? '' : 's'} could not be downloaded (original link kept)` : '';
}

export type NewImageRow = { url: string; sourceUrl: string | null; altText: string | null };

/** Downloads a CSV's remote images into our own storage, ready to insert. `url` becomes our local
 * copy and `sourceUrl` keeps the CSV's URL (so a re-import recognises it); an image that could not
 * be downloaded keeps its remote `url` with no `sourceUrl`, and is counted in `failed`. Does all
 * the network work up front — call it before opening a database transaction. */
export async function localizeCsvImages(images: { url: string; altText: string | null }[]): Promise<{ rows: NewImageRow[]; failed: number }> {
  const localized = await localizeImageUrls(images.map((i) => i.url));
  const rows = images.map((image) => {
    const local = localized.get(image.url)!;
    return { url: local.url, sourceUrl: local.url !== image.url ? image.url : null, altText: image.altText };
  });
  return { rows, failed: images.filter((i) => localized.get(i.url)!.failed).length };
}

/** Adds the CSV's images that the product doesn't have yet (matched on the stored url or the
 * remote URL it was downloaded from) and returns CSV url -> image id for every image the product
 * now holds, so `Variant Image` cells can be linked. */
export async function importProductImages(productId: string, images: { url: string; altText: string | null }[]): Promise<{ urlToImageId: Map<string, string>; failed: number }> {
  const urlToImageId = new Map<string, string>();
  for (const existing of await productModel.listImageSources(productId)) {
    urlToImageId.set(existing.url, existing.id);
    if (existing.sourceUrl) urlToImageId.set(existing.sourceUrl, existing.id);
  }
  const fresh = images.filter((image) => !urlToImageId.has(image.url));
  if (fresh.length === 0) return { urlToImageId, failed: 0 };

  const { rows, failed } = await localizeCsvImages(fresh);
  const created = await productModel.addImages(productId, rows.map((row) => ({ ...row, colour: null })));
  for (const image of created) urlToImageId.set(image.sourceUrl ?? image.url, image.id);
  return { urlToImageId, failed };
}
