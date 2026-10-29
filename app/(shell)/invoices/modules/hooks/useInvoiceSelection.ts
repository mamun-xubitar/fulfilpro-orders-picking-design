'use client';

import { useState } from 'react';

/** The invoices ticked in the table; the selection is kept while paging, sorting and filtering. */
export function useInvoiceSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((other) => other !== id) : [...prev, id]));

  const togglePage = (pageIds: string[]) =>
    setSelectedIds((prev) =>
      pageIds.length > 0 && pageIds.every((id) => prev.includes(id))
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])],
    );

  return { selectedIds, toggle, togglePage, clear: () => setSelectedIds([]) };
}
