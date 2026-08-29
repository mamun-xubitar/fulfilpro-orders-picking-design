export type EligibleStockItem = { lineItemId: string; name: string; sku: string; vendor: string; remainingQty: number };

export type OrderOption = {
  id: string;
  number: number;
  customer: string;
  storeId: string;
  storeName: string;
  eligibleItems: EligibleStockItem[];
};
