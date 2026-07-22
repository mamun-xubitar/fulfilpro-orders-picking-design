'use client';

import { useCallback, useRef, useState } from 'react';

const DROPDOWN_MAX_HEIGHT = 224; // matches max-h-56

export function useDropdownPosition<T extends HTMLElement>() {
  const anchorRef = useRef<T>(null);
  const [openUpward, setOpenUpward] = useState(false);

  const computeDirection = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const boundary = el.closest('[data-modal-boundary]');
    const elRect = el.getBoundingClientRect();
    const boundaryRect = boundary?.getBoundingClientRect();
    const spaceBelow = boundaryRect ? boundaryRect.bottom - elRect.bottom : window.innerHeight - elRect.bottom;
    const spaceAbove = boundaryRect ? elRect.top - boundaryRect.top : elRect.top;
    setOpenUpward(spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow);
  }, []);

  return { anchorRef, openUpward, computeDirection };
}
