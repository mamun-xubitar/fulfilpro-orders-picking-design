import type { ApiResponse } from './types';

export function getApiErrorMessage(json: ApiResponse<unknown> | undefined, fallback: string) {
  return json?.message || fallback;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatSyncDate(value: string) {
  return new Date(value).toLocaleString();
}

export function getShopifyThumbnailUrl(imageUrl: string, size = 50) {
  try {
    const url = new URL(imageUrl);
    url.searchParams.set('width', String(size));
    url.searchParams.set('height', String(size));
    url.searchParams.set('crop', 'center');
    return url.toString();
  } catch {
    return imageUrl;
  }
}
