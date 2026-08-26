import { Cube } from './icons';

export default function ComingSoon({ label, blurb }: { label: string; blurb: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
        <Cube className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold text-gray-900">{label}</h2>
      <p className="mt-1 max-w-md text-sm text-gray-500">{blurb}</p>
      <span className="mt-4 inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Coming soon
      </span>
    </div>
  );
}
