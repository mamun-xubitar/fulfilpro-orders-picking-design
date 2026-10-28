import type { PaginationState } from '@/hooks/usePagination';

export type CustomerSource = 'system' | 'shopify';

export type CustomerInvoiceSummary = {
  id: string;
  invoiceNumber: string;
  orderRef: string | null;
  issueDate: string;
  currencyCode: string;
  total: number;
  amountPaid: number;
  balance: number;
  qty: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
};

export type CustomerContact = { name: string; email: string | null; phone: string | null; jobTitle: string | null };

export type CustomerAddress = {
  label: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  isDefault: boolean;
};

export type CustomerRow = {
  id: string;
  source: CustomerSource;
  code?: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  notes: string | null;
  createdAt: string;
  type?: string | null;
  creditLimit?: number | null;
  currencyCode?: string;
  taxRegion?: string;
  contacts?: CustomerContact[];
  addresses?: CustomerAddress[];
  invoiceCount?: number;
  ordersCount?: number;
  totalSpent?: number;
  totalSales: number;
  balance: number;
  storeId?: string;
  store?: { id: string; name: string | null; storeDomain: string };
};

export const customerCode = (code: number | undefined) => (code === undefined ? '' : `C${code}`);

export type CustomersResponse = { customers: CustomerRow[]; pagination: PaginationState };

export type CustomerSortKey = 'code' | 'type' | 'name' | 'company' | 'email' | 'country' | 'ordersCount' | 'totalSpent' | 'createdAt';

type Keyed<T> = { [K in keyof T]: T[K] extends boolean ? boolean : string } & { key: string };
export type ContactForm = Keyed<CustomerContact>;
export type AddressForm = Keyed<CustomerAddress>;

export type CustomerFormValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  notes: string;
  storeId: string;
  type: string;
  creditLimit: string;
  currencyCode: string;
  taxRegion: string;
  contacts: ContactForm[];
  addresses: AddressForm[];
};

export const EMPTY_CUSTOMER_FORM: CustomerFormValues = {
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  notes: '',
  storeId: '',
  type: '',
  creditLimit: '',
  currencyCode: 'AUD',
  taxRegion: 'AU',
  contacts: [],
  addresses: [],
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
