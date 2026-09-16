'use client';

import { useEffect, useRef, useState } from 'react';

type AnimatedStepBodyProps = {
  children: React.ReactNode;
  /** Kept small so the "Setting up product…" wait state (and any short step) doesn't collapse
   * to nothing while it's the only thing rendered. */
  minHeightClassName?: string;
};

/**
 * Wraps the wizard's current step so the modal's height eases between steps instead of jumping —
 * measures the step's natural content height with a ResizeObserver and animates the wrapper to
 * match. Starts at `undefined` (auto) until the first measurement so there's no first-paint
 * collapse-then-grow flash.
 */
export default function AnimatedStepBody({ children, minHeightClassName = 'min-h-[12rem]' }: AnimatedStepBodyProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height;
      if (next !== undefined) setHeight(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{ height }}
      className="overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
      <div ref={innerRef} className={`flex flex-col ${minHeightClassName}`}>
        {children}
      </div>
    </div>
  );
}
