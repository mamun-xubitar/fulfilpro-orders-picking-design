import { Mail, MapPin, Phone, Truck, Users } from '@/components/icons';
import { SECTION_TONE, type SectionTone } from './sectionTone';
import type { CustomerAddress, CustomerContact } from './types';

type Located = { address: string | null; city: string | null; state: string | null; zip: string | null; country: string | null };

const joinLocation = (row: Located) =>
  [row.address, [row.city, row.state, row.zip].filter(Boolean).join(' '), row.country].filter(Boolean).join('\n');

function Zone({ title, tone, icon: ZoneIcon, count, empty, children }: {
  title: string;
  tone: SectionTone;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  const colors = SECTION_TONE[tone];
  return (
    <section className={`overflow-hidden rounded-xl border bg-white ${colors.frame}`}>
      <h4 className={`flex items-center gap-2 border-b px-3 py-2 text-sm font-semibold ${colors.header}`}>
        <ZoneIcon className="h-4 w-4" />
        {title}
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold tabular-nums">{count}</span>
      </h4>
      <div className="space-y-3 p-3">{count ? children : <p className="text-sm text-gray-500">{empty}</p>}</div>
    </section>
  );
}

function Line({ icon: LineIcon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-gray-700">
      <LineIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
      <span className="min-w-0 whitespace-pre-line break-words">{children}</span>
    </div>
  );
}

function Card({ tone, index, title, chips, lines }: { tone: SectionTone; index: number; title: string; chips: React.ReactNode; lines: React.ReactNode }) {
  const colors = SECTION_TONE[tone];
  return (
    <div className={`rounded-lg border p-3 text-sm ${colors.card}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${colors.badge}`}>{index + 1}</span>
        <span className="font-semibold text-gray-900">{title}</span>
        {chips}
      </div>
      <div className="space-y-1">{lines}</div>
    </div>
  );
}

const CHIP = 'rounded-full px-2 py-0.5 text-xs font-semibold';

export function ContactsZone({ contacts }: { contacts: CustomerContact[] }) {
  return (
    <Zone title="Company contacts" tone="blue" icon={Users} count={contacts.length} empty="No contacts added.">
      {contacts.map((contact, index) => (
        <Card
          key={index}
          tone="blue"
          index={index}
          title={contact.name}
          chips={contact.jobTitle ? <span className={`${CHIP} bg-white text-blue-700`}>{contact.jobTitle}</span> : null}
          lines={
            <>
              {contact.email && <Line icon={Mail}>{contact.email}</Line>}
              {contact.phone && <Line icon={Phone}>{contact.phone}</Line>}
              {joinLocation(contact) && <Line icon={MapPin}>{joinLocation(contact)}</Line>}
            </>
          }
        />
      ))}
    </Zone>
  );
}

export function AddressesZone({ addresses }: { addresses: CustomerAddress[] }) {
  return (
    <Zone title="Shipping addresses" tone="slate" icon={Truck} count={addresses.length} empty="No shipping addresses. Invoices ship to the billing address.">
      {addresses.map((address, index) => (
        <Card
          key={index}
          tone="slate"
          index={index}
          title={address.label ? `${address.label} · ${address.name}` : address.name}
          chips={address.isDefault ? <span className={`${CHIP} bg-slate-700 text-white`}>Default shipping address</span> : null}
          lines={
            <>
              {address.email && <Line icon={Mail}>{address.email}</Line>}
              {address.phone && <Line icon={Phone}>{address.phone}</Line>}
              {joinLocation(address) && <Line icon={MapPin}>{joinLocation(address)}</Line>}
            </>
          }
        />
      ))}
    </Zone>
  );
}
