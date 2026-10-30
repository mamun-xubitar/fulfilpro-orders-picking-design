export type SectionTone = 'blue' | 'slate';

/** The two zones of a customer: contacts are blue (the app's accent), shipping addresses slate.
 * The editor and the view modal share these so the same section looks the same in both. */
export const SECTION_TONE: Record<SectionTone, { frame: string; header: string; add: string; card: string; badge: string }> = {
  blue: {
    frame: 'border-blue-200',
    header: 'border-blue-200 bg-blue-50 text-blue-900',
    add: 'text-blue-700 hover:bg-white',
    card: 'border-blue-100 bg-blue-50/40',
    badge: 'bg-blue-600 text-white',
  },
  slate: {
    frame: 'border-slate-300',
    header: 'border-slate-300 bg-slate-100 text-slate-800',
    add: 'text-slate-700 hover:bg-white',
    card: 'border-slate-200 bg-slate-50',
    badge: 'bg-slate-600 text-white',
  },
};
