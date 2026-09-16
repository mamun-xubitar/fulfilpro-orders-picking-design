import { getAiProvider } from '@/lib/ai/index.server';
import { buildProductDescriptionPrompt } from '@/lib/inventory/description-prompt';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { SupplierProductModel } from '@/models/supplier-product.model.server';

const model = new SupplierProductModel();

type Session = { user?: { role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

/** Generates (never saves) a product description. The admin may not have saved the product yet,
 * so the request body's draft fields — if present — override the persisted record; nothing here
 * writes to the database. */
export class AiDescriptionController {
  async generate(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const productId = typeof value.productId === 'string' ? value.productId : '';
    if (!productId) return { error: { message: 'productId is required', status: 400 } };

    const product = await model.findById(productId);
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const name = typeof value.name === 'string' ? value.name : product.name;
    const brand = typeof value.brand === 'string' ? value.brand : product.brand;
    const category = typeof value.category === 'string' ? value.category : product.category;
    const productRemark = typeof value.productRemark === 'string' ? value.productRemark : product.productRemark;
    const currentDescription = typeof value.description === 'string' ? value.description : product.description;
    const sizes = Array.isArray(value.sizes)
      ? (value.sizes as unknown[]).filter((s): s is string => typeof s === 'string')
      : product.sizes;
    const colours = Array.isArray(value.colours)
      ? (value.colours as unknown[])
          .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
          .map((c) => String(c.name ?? ''))
          .filter(Boolean)
      : product.colours.map((c) => c.name);

    const { system, prompt } = buildProductDescriptionPrompt({ name, brand, category, sizes, colours, currentDescription, productRemark });

    let generated: string;
    try {
      generated = await getAiProvider().generateText({ system, prompt });
    } catch (error) {
      // Logged server-side (pm2/console) since the client only ever sees the mapped message
      // below — without this, a live failure leaves no trace to diagnose from.
      console.error('[ai-description] generation failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate description';
      const status = message === 'AI is not configured' ? 503 : 502;
      return { error: { message, status } };
    }

    return { data: { description: sanitizeHtml(generated) }, message: 'Description generated' };
  }
}
