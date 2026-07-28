'use client';

export default function CheckMarkBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
        checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
      }`}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}
