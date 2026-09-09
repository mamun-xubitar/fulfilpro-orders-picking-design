'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type PageHeadingContextValue = {
  suffix: string | null;
  setSuffix: (suffix: string | null) => void;
};

const PageHeadingContext = createContext<PageHeadingContextValue | null>(null);

/** Lets a page contribute a suffix to the shell header's `<h1>` (e.g. the focused product's name
 * in single-product Inventory view) without the shell needing any page-specific knowledge. */
export function PageHeadingProvider({ children }: { children: React.ReactNode }) {
  const [suffix, setSuffix] = useState<string | null>(null);
  const value = useMemo(() => ({ suffix, setSuffix }), [suffix]);
  return <PageHeadingContext.Provider value={value}>{children}</PageHeadingContext.Provider>;
}

/** Call with `null` to clear (e.g. on unmount, or when the page has nothing to append). */
export function usePageHeading() {
  const ctx = useContext(PageHeadingContext);
  if (!ctx) throw new Error('usePageHeading must be used within PageHeadingProvider');
  return ctx;
}
