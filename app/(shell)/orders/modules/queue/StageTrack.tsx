import type { OrderRow } from '../types';
import type { OrderCapabilities } from '../capabilities';
import { getStageNodes, type StageNode } from './queueUtils';
import { Icon } from './icons';

const GREEN_KEYS: StageNode['key'][] = ['slip', 'ful', 'trk'];

/** Column heading of the stage track: one 34px label per node (prototype `trackHead`). */
export function StageTrackHead({ caps }: { caps: OrderCapabilities }) {
  const labels = [caps.slip && 'Slip', 'Pack', caps.fulfilment && 'Fulfil', caps.fulfilment && 'Track'].filter(Boolean) as string[];
  return <span className="flex text-[9px] font-bold uppercase tracking-normal text-orders-text-subtle">{labels.map((l) => <span key={l} className="w-[34px] overflow-visible whitespace-nowrap">{l}</span>)}</span>;
}

/** Stage nodes (slip, pack, fulfil, track) joined by a line: 15px nodes, 19px links (prototype `.nd` / `.cn`). */
export default function StageTrack({ order, caps }: { order: OrderRow; caps: OrderCapabilities }) {
  const nodes = getStageNodes(order, caps);
  return (
    <span className="flex items-center" role="img" aria-label={nodes.map((n) => `${n.label}: ${n.state === 'done' ? 'done' : n.state === 'part' ? 'partial' : 'not yet'}`).join(', ')}>
      {nodes.map((n, i) => {
        const green = GREEN_KEYS.includes(n.key);
        const done = n.state === 'done';
        const fill = done
          ? green ? 'border-orders-success bg-orders-success' : 'border-orders-primary bg-orders-primary'
          : n.state === 'part' ? 'border-orders-warning bg-[linear-gradient(90deg,var(--orders-warning)_50%,#fff_50%)]' : 'border-orders-border-strong bg-white';
        const link = done ? (green ? 'bg-orders-success' : 'bg-orders-primary') : 'bg-orders-border';
        return (
          <span key={n.key} className="flex items-center">
            {i > 0 && <span className={`h-0.5 w-[19px] flex-none ${link}`} />}
            <span title={n.label} className={`flex h-[15px] w-[15px] flex-none items-center justify-center rounded-full border-2 text-white ${fill}`}>
              {done && <Icon name="check" className="h-2 w-2 [stroke-width:3.4]" />}
            </span>
          </span>
        );
      })}
    </span>
  );
}
