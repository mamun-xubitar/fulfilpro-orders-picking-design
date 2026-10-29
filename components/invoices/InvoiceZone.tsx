import { SECTION_TONE, type SectionTone } from '@/app/(shell)/customers/modules/sectionTone';

type Tone = SectionTone | 'gray';

const GRAY = { frame: 'border-gray-200', header: 'border-gray-200 bg-gray-50 text-gray-800' };

type InvoiceZoneProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  /** `blue` and `slate` match the customer page's contacts / shipping zones; `gray` is neutral. */
  tone?: Tone;
  /** Right side of the header band, e.g. a select or a button. */
  action?: React.ReactNode;
  /** No body padding, for a table that runs edge to edge. */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** A framed invoice section: a header band with an icon and title, then the body. */
export default function InvoiceZone({ title, icon: ZoneIcon, tone = 'gray', action, flush, className = '', children }: InvoiceZoneProps) {
  const colors = tone === 'gray' ? GRAY : SECTION_TONE[tone];
  return (
    <section className={`min-w-0 rounded-xl border bg-white ${colors.frame} ${className}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-t-[11px] border-b px-3 py-2 ${colors.header}`}>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <ZoneIcon className="h-4 w-4" />
          {title}
        </h4>
        {action}
      </div>
      <div className={flush ? '' : 'p-3'}>{children}</div>
    </section>
  );
}
