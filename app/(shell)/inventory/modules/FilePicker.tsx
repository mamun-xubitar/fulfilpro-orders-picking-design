'use client';

import { useRef } from 'react';

type FilePickerProps = {
  onSelect: (file: File) => void;
  disabled?: boolean;
  fileName?: string | null;
};

/** A CSV file picker where only the "Choose file" button opens the OS dialog — unlike a bare
 * `<input type="file">` styled with `file:` pseudo-classes, which is clickable across its full
 * width (button pixels included) and opens the dialog no matter where in that strip is clicked.
 * The input itself is visually hidden; the button drives it via a ref. */
export default function FilePicker({ onSelect, disabled, fileName }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so re-picking the same file still fires onChange (e.g. after a refused
          // preview cleared the selection).
          e.target.value = '';
          if (file) onSelect(file);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="h-[22px] shrink-0 rounded-[6px] bg-blue-600 px-[10px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        Choose file
      </button>
      <span className="truncate text-[11px] text-gray-600">{fileName || 'No file chosen'}</span>
    </div>
  );
}
