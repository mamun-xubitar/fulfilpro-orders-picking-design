import { Cube, Document, Image, Tag, Truck } from '../icons';

export type StepMeta = { label: string; description: string; icon: (props: { className?: string }) => React.ReactElement };

/** Single source of truth for the wizard's 5 steps — label, icon and a one-line description of
 * what each step collects, used by both StepPills (progress indicator) and StepHeader (per-step
 * banner). */
export const STEP_META: StepMeta[] = [
  { label: 'Basics', description: 'Supplier, item number and product name', icon: Cube },
  { label: 'Details', description: 'SKU, sizes, colours and remarks', icon: Document },
  { label: 'Images', description: 'Upload and assign images to colours', icon: Image },
  { label: 'Pricing', description: 'Buying price, margin and sell price', icon: Tag },
  { label: 'Purchase order', description: 'Supplier, quantities and delivery details', icon: Truck },
];
