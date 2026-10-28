import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** Takes the next slot of the global invoice counter. Shared by Shopify-order and manual invoices,
 * so both draw from one gap-free sequence. A store prefix wins over the global prefix. */
export async function allocateInvoiceNumber(tx: Tx, storePrefix: string | null | undefined) {
  const settings = await tx.appSettings.upsert({
    where: { id: 'default' },
    update: { invoiceNextNumber: { increment: 1 } },
    create: { id: 'default', invoiceNextNumber: 1001 },
  });
  const sequence = settings.invoiceNextNumber - 1;
  return {
    sequence,
    invoiceNumber: `${storePrefix?.trim() || settings.invoicePrefix.trim()}${sequence}`,
  };
}

/** True when an invoice number is already used by a Shopify-order or a manual invoice. */
export async function invoiceNumberTaken(tx: Tx, invoiceNumber: string, exceptInvoiceId?: string) {
  const [order, manual] = await Promise.all([
    tx.order.findFirst({ where: { invoiceNumber }, select: { id: true } }),
    tx.invoice.findFirst({
      where: { invoiceNumber, ...(exceptInvoiceId ? { id: { not: exceptInvoiceId } } : {}) },
      select: { id: true },
    }),
  ]);
  return Boolean(order || manual);
}
