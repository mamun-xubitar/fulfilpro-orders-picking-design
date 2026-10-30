'use client';

import { useState } from 'react';
import type { CustomerRow } from '../types';

/** Every address a customer can be emailed at: its own email, then its contacts', without repeats. */
export function emailOptions(row: CustomerRow) {
  const all = [row.email, ...(row.contacts ?? []).map((contact) => contact.email)];
  return [...new Set(all.map((email) => email?.trim().toLowerCase()).filter((email): email is string => Boolean(email)))];
}

/** Which of each customer's addresses the Email button writes to. Until the user changes it, a
 * customer's first address is picked — the old system's "Select 1 emails". */
export function useEmailPicks() {
  const [picks, setPicks] = useState<Map<string, string[]>>(new Map());

  const pickedFor = (row: CustomerRow) => picks.get(row.id) ?? emailOptions(row).slice(0, 1);

  const togglePick = (row: CustomerRow, email: string) =>
    setPicks((prev) => {
      const current = prev.get(row.id) ?? emailOptions(row).slice(0, 1);
      const next = new Map(prev);
      next.set(row.id, current.includes(email) ? current.filter((other) => other !== email) : [...current, email]);
      return next;
    });

  return { pickedFor, togglePick, clearPicks: () => setPicks(new Map()) };
}

/** A `mailto:` link to the picked addresses, with the customer's company (or name) as the subject. */
export function mailtoFor(row: CustomerRow, emails: string[]) {
  return `mailto:${emails.join(',')}?subject=${encodeURIComponent(row.company || row.name)}`;
}
