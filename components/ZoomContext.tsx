'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const MIN_ZOOM = 50;
const MAX_ZOOM = 150;
const STEP = 10;
const DEFAULT_ZOOM = 100;
const STORAGE_KEY = 'inventory-zoom-level';

function clamp(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function readStored(): number {
  if (typeof window === 'undefined') return DEFAULT_ZOOM;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? clamp(parsed) : DEFAULT_ZOOM;
}

type ZoomContextValue = {
  zoomPercent: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

const ZoomContext = createContext<ZoomContextValue | null>(null);

/** Page-scoped zoom level for the Inventory single-product view. Shared via context (rather than
 * page-local state) so the header's `ZoomControl` — mounted in the shell, outside the inventory
 * page's own component tree — can read/drive the same value. */
export function ZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoomPercent, setZoomPercent] = useState<number>(readStored);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(zoomPercent));
  }, [zoomPercent]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoomPercent((v) => clamp(v - STEP));
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoomPercent((v) => clamp(v + STEP));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoomPercent(DEFAULT_ZOOM);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      zoomPercent,
      zoomIn: () => setZoomPercent((v) => clamp(v + STEP)),
      zoomOut: () => setZoomPercent((v) => clamp(v - STEP)),
      resetZoom: () => setZoomPercent(DEFAULT_ZOOM),
    }),
    [zoomPercent],
  );

  return <ZoomContext.Provider value={value}>{children}</ZoomContext.Provider>;
}

export function useZoom() {
  const ctx = useContext(ZoomContext);
  if (!ctx) throw new Error('useZoom must be used within ZoomProvider');
  return ctx;
}
