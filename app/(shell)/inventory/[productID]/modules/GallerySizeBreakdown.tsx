import type { SizeCount } from './types';

type GallerySizeBreakdownProps = {
  heading: string;
  breakdown: SizeCount[];
  dark?: boolean;
};

export default function GallerySizeBreakdown({ heading, breakdown, dark }: GallerySizeBreakdownProps) {
  return (
    <div className="mt-3">
      <h3 className={`text-sm font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>{heading}</h3>
      {breakdown.length === 0 ? (
        <span className={`text-sm ${dark ? 'text-white/50' : 'text-gray-400'}`}>—</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {breakdown.map((item) => (
            <span
              key={item.size}
              className={`text-xs font-medium rounded-full px-3 py-1 border ${
                dark ? 'border-white/20 text-white bg-white/10' : 'border-gray-200 text-gray-700 bg-gray-50'
              }`}
            >
              {item.quantity} × {item.size}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
