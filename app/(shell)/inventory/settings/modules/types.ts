export type ApiResponse<T> = { success: boolean; message: string; data: T };

export type CurrencyRateRow = {
  id: string;
  code: string;
  rate: number;
  createdAt: string;
  updatedAt: string;
};

export type CurrencyForm = { code: string; rate: string };

export const EMPTY_CURRENCY_FORM: CurrencyForm = {
  code: '',
  rate: '',
};
