import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** Takes the next free slot of the global invoice counter. Shared by Shopify-order and manual
 * invoices, so both draw from one sequence; slots whose number was already typed by hand on a
 * manual invoice are skipped. A store prefix wins over the global prefix. */
export async function allocateInvoiceNumber(tx: Tx, storePrefix: string | null | undefined) {
  for (;;) {
    const settings = await tx.appSettings.upsert({
      where: { id: 'default' },
      update: { invoiceNextNumber: { increment: 1 } },
      create: { id: 'default', invoiceNextNumber: 1001 },
    });
    const sequence = settings.invoiceNextNumber - 1;
    const invoiceNumber = `${storePrefix?.trim() || settings.invoicePrefix.trim()}${sequence}`;
    if (!(await invoiceNumberTaken(tx, invoiceNumber))) return { sequence, invoiceNumber };
  }
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
