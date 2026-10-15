/** Loading placeholders for the inventory module. A `Bone` is the only skeleton atom — its shimmer
 * lives in inventory-theme.css (`.inventory-bone`) so tables, panels and portalled modals all share
 * one look. `SkeletonRows` stands in for a table body: each cell takes the shape of the column it
 * replaces, and row padding matches the real rows so nothing jumps when the data lands. */

export function Bone({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`inventory-bone block ${className}`} />;
}

export type SkeletonCell =
  | 'check'
  | 'text'
  /** A title over a shorter sub-line (e.g. product name + item no.). */
  | 'stack'
  | 'num'
  | 'badge'
  | 'input'
  | { kind: 'actions'; count: number };

// Ragged widths (cycled by row + column) so the rows read like text, not a grey grid.
const TEXT_WIDTHS = ['w-[72%]', 'w-[54%]', 'w-[86%]', 'w-[63%]', 'w-[78%]'];
const NUM_WIDTHS = ['w-6', 'w-8', 'w-5', 'w-7'];

function Cell({ cell, seed }: { cell: SkeletonCell; seed: number }) {
  if (typeof cell === 'object') {
    return (
      <div className="flex items-center justify-end gap-[4px]">
        {Array.from({ length: cell.count }).map((_, i) => (
          <Bone key={i} className="h-[20px] w-[20px] rounded-[6px]" />
        ))}
      </div>
    );
  }
  const text = TEXT_WIDTHS[seed % TEXT_WIDTHS.length];
  switch (cell) {
    case 'check':
      return <Bone className="h-3 w-3 rounded-[3px]" />;
    case 'stack':
      return (
        <div className="space-y-[5px]">
          <Bone className={`h-[9px] max-w-[180px] ${text}`} />
          <Bone className="h-[7px] w-12" />
        </div>
      );
    case 'num':
      return <Bone className={`ml-auto h-[9px] ${NUM_WIDTHS[seed % NUM_WIDTHS.length]}`} />;
    case 'badge':
      return <Bone className="mx-auto h-[16px] w-14 rounded-full" />;
    case 'input':
      return <Bone className="h-[20px] w-[110px] rounded-[5px]" />;
    default:
      return <Bone className={`h-[9px] max-w-[160px] ${text}`} />;
  }
}

type SkeletonRowsProps = {
  cells: SkeletonCell[];
  rows?: number;
  /** Cell padding — defaults to the inventory tables' `px-2 py-1.5`. */
  cellClassName?: string;
};

export function SkeletonRows({ cells, rows = 6, cellClassName = 'px-2 py-1.5' }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} aria-hidden="true" className="border-b border-inventory-divider" style={{ '--i': r } as React.CSSProperties}>
          {cells.map((cell, c) => (
            <td key={c} className={cellClassName}>
              <Cell cell={cell} seed={r + c * 2} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
