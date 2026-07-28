'use client';

import CheckMarkBox from './CheckMarkBox';
import { getShopifyThumbnailUrl } from '../../modules/utils';
import type { ColorGroup } from './types';

type ColorListProps = {
  colorGroups: ColorGroup[];
  selectedColorKeys: Set<string>;
  onToggleColor: (key: string) => void;
  allSelected: boolean;
  onToggleAll: () => void;
};

function ColorThumb({ url }: { url: string | null }) {
  return (
    <span className="w-6 h-6 shrink-0 rounded overflow-hidden">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={getShopifyThumbnailUrl(url, 32)} alt="" className="w-full h-full object-cover" />
      )}
    </span>
  );
}

export default function ColorList({ colorGroups, selectedColorKeys, onToggleColor, allSelected, onToggleAll }: ColorListProps) {
  return (
    <div className="border-r border-gray-100 pr-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Colors</h3>
      <ul className="space-y-1 h-full max-h-[600px] overflow-y-auto pr-1">
        {colorGroups.length > 0 && (
          <li>
            <button
              type="button"
              onClick={onToggleAll}
              className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
                allSelected ? 'bg-blue-50' : ''
              }`}
            >
              <CheckMarkBox checked={allSelected} />
              <span className="flex-1 truncate text-gray-700">All colors</span>
            </button>
          </li>
        )}
        {colorGroups.map((group) => (
          <li key={group.key}>
            <button
              type="button"
              onClick={() => onToggleColor(group.key)}
              className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm hover:bg-gray-50 cursor-pointer ${
                selectedColorKeys.has(group.key) ? 'bg-blue-50' : ''
              }`}
            >
              <CheckMarkBox checked={selectedColorKeys.has(group.key)} />
              <ColorThumb url={group.imageUrl} />
              <span className="flex-1 truncate text-gray-700">{group.label}</span>
              <span className="text-xs text-gray-400">{group.totalStock}</span>
            </button>
            <div className="pl-14 text-xs text-gray-400">{group.totalSold} sold</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
