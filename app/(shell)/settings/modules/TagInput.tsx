'use client';

import { useState } from 'react';

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

export default function TagInput({ tags, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState('');

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (tags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...tags, trimmed]);
    setDraft('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 px-2 py-2 focus-within:ring-2 focus-within:ring-blue-500">
      {tags.map((tag, index) => (
        <span key={`${tag}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-2.5 py-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="text-blue-400 hover:text-blue-700 cursor-pointer"
            aria-label={`Remove ${tag}`}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] border-none outline-none text-sm py-1"
      />
    </div>
  );
}
