'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const MIN_ZOOM = 50;
const MAX_ZOOM = 150;
const STEP = 10;
const DEFAULT_ZOOM = 100;
const STORAGE_KEY = 'inventory-zoom-level';
// Marks that the stored level is a deliberate user choice, not just a previously
// auto-computed breakpoint default — without this, a value saved on one screen size
// (e.g. 100% from before breakpoint defaults existed, or from a smaller monitor) would
// keep overriding the breakpoint default forever, even on a much larger desktop.
const MANUAL_KEY = 'inventory-zoom-manual';

function clamp(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

/** Breakpoint-based default — the 1280px design fills its artboard at 100%, so wider
 * screens start zoomed in proportionally instead of reading tiny. Only a level the user
 * deliberately set (see `MANUAL_KEY`) overrides this; an untouched level always tracks
 * the current viewport's breakpoint, on every visit. */
function defaultForWidth(width: number): number {
  if (width >= 2560) return 150;
  if (width >= 1920) return 140;
  if (width >= 1536) return 120;
  if (width >= 1280) return 110;
  return 100;
}

function currentDefault(): number {
  if (typeof window === 'undefined') return DEFAULT_ZOOM;
  return defaultForWidth(window.innerWidth);
}

function readStored(): number {
  if (typeof window === 'undefined') return DEFAULT_ZOOM;
  if (window.localStorage.getItem(MANUAL_KEY) !== 'true') return currentDefault();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? clamp(parsed) : currentDefault();
}

function markManual() {
  if (typeof window !== 'undefined') window.localStorage.setItem(MANUAL_KEY, 'true');
}

function clearManual() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(MANUAL_KEY);
}

type ZoomContextValue = {
  zoomPercent: number;
  /** Reset target for this viewport width — the label shows it, Reset returns to it. */
  defaultZoom: number;
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
  // Tracks the viewport so Reset always returns to the right breakpoint default — the
  // live zoom itself never moves on resize, only the reset target does.
  const [defaultZoom, setDefaultZoom] = useState<number>(currentDefault);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(zoomPercent));
  }, [zoomPercent]);

  useEffect(() => {
    const onResize = () => setDefaultZoom(currentDefault());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        markManual();
        setZoomPercent((v) => clamp(v - STEP));
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        markManual();
        setZoomPercent((v) => clamp(v + STEP));
      } else if (e.key === '0') {
        e.preventDefault();
        clearManual();
        setZoomPercent(currentDefault());
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      zoomPercent,
      defaultZoom,
      zoomIn: () => {
        markManual();
        setZoomPercent((v) => clamp(v + STEP));
      },
      zoomOut: () => {
        markManual();
        setZoomPercent((v) => clamp(v - STEP));
      },
      resetZoom: () => {
        clearManual();
        setZoomPercent(currentDefault());
      },
    }),
    [zoomPercent, defaultZoom],
  );

  return <ZoomContext.Provider value={value}>{children}</ZoomContext.Provider>;
}

export function useZoom() {
  const ctx = useContext(ZoomContext);
  if (!ctx) throw new Error('useZoom must be used within ZoomProvider');
  return ctx;
}
