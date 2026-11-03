import { isOrderPickerRole } from '@/lib/roles';

/** What each role sees and can do on the merged Orders page. Admin is the union of the old Orders
 * and Picking List pages, Staff keeps the old Orders page, Order Picker keeps the old Picking List.
 * Every role-dependent piece of the page reads these flags instead of checking the role itself. */
export type OrderCapabilities = {
  role: 'admin' | 'staff' | 'picker';
  /** Store, Period and Sync controls. */
  store: boolean;
  period: boolean;
  sync: boolean;
  /** Fulfilment status filter, fulfilment column, tracking link, Confirm fulfilment. */
  fulfilment: boolean;
  /** Print status filter, green slip icon, print picking slip. */
  slip: boolean;
  /** Packing: Full / Partial, Confirm packed, cancel packed, packing history. */
  pack: boolean;
  /** Customer name block, address, shipping, labels, tax invoice, name export. */
  customer: boolean;
  labels: boolean;
  invoice: boolean;
  names: boolean;
  /** Admin-only: decoration management, line edits, stock adjustment, attachments, approvals, tracking. */
  admin: boolean;
  /** Request stock (Admin, Staff). */
  requestStock: boolean;
  /** Product extras: Shopify link, available quantity, PO status (Admin, Staff); create PO (Admin). */
  stock: boolean;
  createPo: boolean;
  /** Decoration state is shown (Admin manages it, Staff reads it). */
  decoration: boolean;
  /** Packed date column, as on the old Picking List. */
  packedDate: boolean;
  /** Barcode field in search (Admin, Picker). */
  barcodeSearch: boolean;
  /** Fulfilment edits: Admin acts directly, Staff goes through request and approval. */
  directFulfilmentEdit: boolean;
};

export function getOrderCapabilities(role: string | null | undefined): OrderCapabilities {
  if (isOrderPickerRole(role)) {
    return { role: 'picker', store: false, period: false, sync: false, fulfilment: false, slip: true, pack: true, customer: false, labels: false, invoice: false, names: false, admin: false, requestStock: false, stock: false, createPo: false, decoration: false, packedDate: true, barcodeSearch: true, directFulfilmentEdit: false };
  }
  if (role === 'admin') {
    return { role: 'admin', store: true, period: true, sync: true, fulfilment: true, slip: true, pack: true, customer: true, labels: true, invoice: true, names: true, admin: true, requestStock: true, stock: true, createPo: true, decoration: true, packedDate: false, barcodeSearch: true, directFulfilmentEdit: true };
  }
  // Staff and the read-only test user.
  return { role: 'staff', store: true, period: true, sync: true, fulfilment: true, slip: false, pack: false, customer: true, labels: true, invoice: true, names: true, admin: false, requestStock: true, stock: true, createPo: false, decoration: true, packedDate: false, barcodeSearch: false, directFulfilmentEdit: false };
}
