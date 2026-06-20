type ApiResponse = { success: boolean; message: string; errors?: string[] };

export function getApiErrorMessage(response: ApiResponse, fallback: string) {
  if (response.errors?.length) return response.errors.join(', ');
  return response.message || fallback;
}

export function formatSyncDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
