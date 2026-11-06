import type { ReactNode } from 'react';

const TONES = {
  neutral: 'border-orders-border bg-orders-surface-muted text-orders-text-muted',
  ok: 'border-orders-success-border bg-orders-success-soft text-orders-success-ink',
  warn: 'border-orders-warning-border bg-orders-warning-soft text-orders-warning-ink',
  bad: 'border-orders-danger-border bg-orders-danger-soft text-orders-danger-ink',
  info: 'border-orders-primary-ring bg-orders-primary-soft text-orders-primary-ink',
  emb: 'border-orders-emb-border bg-orders-emb-soft text-orders-emb',
  prt: 'border-orders-prt-border bg-orders-prt-soft text-orders-prt',
} as const;

export type BadgeTone = keyof typeof TONES;

/** Small pill used for states (Short, Canceled, EMB, PO status …); colour follows the state tokens. */
export default function Badge({ tone = 'neutral', title, children }: { tone?: BadgeTone; title?: string; children: ReactNode }) {
  return <span title={title} className={`inline-flex h-4 items-center gap-0.5 whitespace-nowrap rounded-full border px-1.5 text-[9.5px] font-bold ${TONES[tone]}`}>{children}</span>;
}
