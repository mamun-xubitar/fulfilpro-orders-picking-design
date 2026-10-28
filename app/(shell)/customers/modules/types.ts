import type { PaginationState } from '@/hooks/usePagination';

export type CustomerSource = 'system' | 'shopify';

export type CustomerInvoiceSummary = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
};

export type CustomerRow = {
  id: string;
  source: CustomerSource;
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
  invoiceCount?: number;
  ordersCount?: number;
  totalSpent?: number;
  storeId?: string;
  store?: { id: string; name: string | null; storeDomain: string };
  invoices?: CustomerInvoiceSummary[];
};

export type CustomersResponse = { customers: CustomerRow[]; pagination: PaginationState };

export type CustomerSortKey = 'name' | 'company' | 'email' | 'country' | 'ordersCount' | 'totalSpent' | 'createdAt';

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
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
