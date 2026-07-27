'use client';

import { useState } from 'react';

type TagChipsInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

export default function TagChipsInput({ tags, onChange }: TagChipsInputProps) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const value = input.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setInput('');
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-blue-400">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
          } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? 'Add tags…' : ''}
        className="flex-1 min-w-20 text-sm outline-none py-0.5"
      />
    </div>
  );
}
