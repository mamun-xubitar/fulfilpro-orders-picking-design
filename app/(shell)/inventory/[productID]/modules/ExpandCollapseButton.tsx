'use client';

type ExpandCollapseButtonProps = {
  expanded: boolean;
  onToggle: () => void;
  label: string;
};

export default function ExpandCollapseButton({ expanded, onToggle, label }: ExpandCollapseButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
      title={expanded ? 'Collapse' : 'Expand'}
      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
    >
      {expanded ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
          />
        </svg>
      )}
    </button>
  );
}
