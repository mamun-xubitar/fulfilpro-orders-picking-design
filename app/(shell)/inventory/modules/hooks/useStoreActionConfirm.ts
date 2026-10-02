'use client';

import { useState } from 'react';

export type ConfirmRequest = {
  title: string;
  body: string;
  confirmLabel: string;
  /** 'danger' for destructive actions, 'primary' for ones that overwrite but don't delete. */
  tone: 'danger' | 'primary';
  run: () => Promise<unknown>;
};

/** One pending "are you sure?" for a bulk or destructive store edit. `ask` opens it, `confirm`
 * runs the action (keeping the dialog open, in a busy state, until it settles), `cancel` closes. */
export function useStoreActionConfirm() {
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const [running, setRunning] = useState(false);

  const ask = (request: ConfirmRequest) => setPending(request);
  const cancel = () => {
    if (!running) setPending(null);
  };
  const confirm = async () => {
    if (!pending) return;
    setRunning(true);
    try {
      await pending.run();
    } finally {
      setRunning(false);
      setPending(null);
    }
  };

  return { pending, running, ask, confirm, cancel };
}

export type StoreActionConfirm = ReturnType<typeof useStoreActionConfirm>;
