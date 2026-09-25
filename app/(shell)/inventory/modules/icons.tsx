/**
 * Inline Heroicons-outline paths. The codebase has no icon package, so this
 * keeps the module's ~20 icons in one place instead of repeating `d` strings.
 */

type IconProps = { className?: string };

function Icon({ className = 'h-4 w-4', children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

const p = (d: string) => <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />;

export const ChevronLeft = (i: IconProps) => <Icon {...i}>{p('M15 19l-7-7 7-7')}</Icon>;
export const ChevronRight = (i: IconProps) => <Icon {...i}>{p('M9 5l7 7-7 7')}</Icon>;
export const ChevronDown = (i: IconProps) => <Icon {...i}>{p('M19 9l-7 7-7-7')}</Icon>;
export const First = (i: IconProps) => <Icon {...i}>{p('M11 19l-7-7 7-7m8 14l-7-7 7-7')}</Icon>;
export const Last = (i: IconProps) => <Icon {...i}>{p('M13 5l7 7-7 7M5 5l7 7-7 7')}</Icon>;
export const Search = (i: IconProps) => <Icon {...i}>{p('M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z')}</Icon>;
export const Plus = (i: IconProps) => <Icon {...i}>{p('M12 4v16m8-8H4')}</Icon>;
export const Pencil = (i: IconProps) => (
  <Icon {...i}>{p('M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z')}</Icon>
);
export const Trash = (i: IconProps) => (
  <Icon {...i}>{p('M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16')}</Icon>
);
export const Eye = (i: IconProps) => (
  <Icon {...i}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </Icon>
);
export const Check = (i: IconProps) => <Icon {...i}>{p('M5 13l4 4L19 7')}</Icon>;
export const Close = (i: IconProps) => <Icon {...i}>{p('M6 18L18 6M6 6l12 12')}</Icon>;
export const Download = (i: IconProps) => <Icon {...i}>{p('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-5l-4 4m0 0l-4-4m4 4V4')}</Icon>;
export const Upload = (i: IconProps) => <Icon {...i}>{p('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12')}</Icon>;
export const External = (i: IconProps) => (
  <Icon {...i}>{p('M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14')}</Icon>
);
export const Refresh = (i: IconProps) => (
  <Icon {...i}>{p('M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15')}</Icon>
);
export const Expand = (i: IconProps) => <Icon {...i}>{p('M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5')}</Icon>;
export const Collapse = (i: IconProps) => <Icon {...i}>{p('M9 4v4m0 0H5m4 0L4 3m11 1v4m0 0h4m-4 0l5-5M9 20v-4m0 0H5m4 0l-5 5m11-5v4m0 0h4m-4 0l5 5')}</Icon>;
export const Image = (i: IconProps) => (
  <Icon {...i}>{p('M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z')}</Icon>
);
export const Tag = (i: IconProps) => (
  <Icon {...i}>{p('M7 7h.01M7 3h5.586a1 1 0 01.707.293l6.414 6.414a1 1 0 010 1.414l-8.586 8.586a1 1 0 01-1.414 0l-6.414-6.414A1 1 0 013 12.586V7a4 4 0 014-4z')}</Icon>
);
export const Cube = (i: IconProps) => (
  <Icon {...i}>{p('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4')}</Icon>
);
export const Store = (i: IconProps) => (
  <Icon {...i}>{p('M3 9l1-5h16l1 5M3 9h18M3 9v10a1 1 0 001 1h16a1 1 0 001-1V9M9 20v-6h6v6')}</Icon>
);
export const Clipboard = (i: IconProps) => (
  <Icon {...i}>{p('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4')}</Icon>
);
export const Adjust = (i: IconProps) => (
  <Icon {...i}>{p('M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4')}</Icon>
);
export const Activity = (i: IconProps) => <Icon {...i}>{p('M13 10V3L4 14h7v7l9-11h-7z')}</Icon>;
export const Swap = (i: IconProps) => <Icon {...i}>{p('M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4')}</Icon>;
export const Chart = (i: IconProps) => <Icon {...i}>{p('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z')}</Icon>;
export const Truck = (i: IconProps) => (
  <Icon {...i}>{p('M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1')}</Icon>
);
export const Users = (i: IconProps) => (
  <Icon {...i}>{p('M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z')}</Icon>
);
export const Card = (i: IconProps) => <Icon {...i}>{p('M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z')}</Icon>;
export const Document = (i: IconProps) => (
  <Icon {...i}>{p('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a1 1 0 01-1 1z')}</Icon>
);
export const Clock = (i: IconProps) => <Icon {...i}>{p('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z')}</Icon>;
export const Info = (i: IconProps) => <Icon {...i}>{p('M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}</Icon>;
export const Lock = (i: IconProps) => (
  <Icon {...i}>{p('M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z')}</Icon>
);
export const Unlock = (i: IconProps) => (
  <Icon {...i}>{p('M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM8 11V7a4 4 0 018 0')}</Icon>
);
export const BulletList = (i: IconProps) => (
  <Icon {...i}>
    <circle cx="4" cy="6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1.1" fill="currentColor" stroke="none" />
    {p('M8 6h12M8 12h12M8 18h12')}
  </Icon>
);
export const NumberedList = (i: IconProps) => (
  <Icon {...i}>
    <text x="1.5" y="8" fontSize="6.5" fontFamily="sans-serif" fill="currentColor" stroke="none">1</text>
    <text x="1.5" y="14" fontSize="6.5" fontFamily="sans-serif" fill="currentColor" stroke="none">2</text>
    <text x="1.5" y="20" fontSize="6.5" fontFamily="sans-serif" fill="currentColor" stroke="none">3</text>
    {p('M8 6h12M8 12h12M8 18h12')}
  </Icon>
);
export const LinkIcon = (i: IconProps) => (
  <Icon {...i}>
    {p('M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5')}
  </Icon>
);
export const Palette = (i: IconProps) => (
  <Icon {...i}>
    {p('M12 3a9 9 0 100 18c1 0 1.5-.5 1.5-1.3 0-.4-.15-.7-.4-1-.25-.3-.4-.6-.4-1a1.4 1.4 0 011.4-1.4h1.6A4.3 4.3 0 0020 12a9 9 0 00-8-9z')}
    <circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
  </Icon>
);
export const Sparkles = (i: IconProps) => (
  <Icon {...i}>
    {p('M9.5 3v3M9.5 12v3M3 9.5h3M12 9.5h3M6.2 6.2l1.1 1.1M11.7 11.7l1.1 1.1M6.2 12.8l1.1-1.1M11.7 7.3l1.1-1.1')}
    <path d="M17 14l1 2.5L20.5 17.5 18 18.5 17 21l-1-2.5L13.5 17.5 16 16.5z" fill="currentColor" stroke="none" />
  </Icon>
);
