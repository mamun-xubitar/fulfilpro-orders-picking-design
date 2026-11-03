import type { OrderRow } from '../types';
import type { OrderCapabilities } from '../capabilities';
import { getStageNodes, type StageNode } from './queueUtils';
import { Icon } from './icons';

const GREEN_KEYS: StageNode['key'][] = ['slip', 'ful', 'trk'];

/** Stage nodes (slip, pack, fulfil, track) joined by a line; each role only sees its own stages. */
export function StageTrackHead({ caps }: { caps: OrderCapabilities }) {
  const labels = [caps.slip && 'Slip', 'Pack', caps.fulfilment && 'Fulfil', caps.fulfilment && 'Track'].filter(Boolean) as string[];
  return <span className="flex">{labels.map((l) => <span key={l} className="w-[34px] overflow-visible whitespace-nowrap text-center">{l}</span>)}</span>;
}

export default function StageTrack({ order, caps }: { order: OrderRow; caps: OrderCapabilities }) {
  const nodes = getStageNodes(order, caps);
  return (
    <span className="flex items-center" role="img" aria-label={nodes.map((n) => `${n.label}: ${n.state === 'done' ? 'done' : n.state === 'part' ? 'partial' : 'not yet'}`).join(', ')}>
      {nodes.map((n, i) => {
        const green = GREEN_KEYS.includes(n.key);
        const done = n.state === 'done';
        const fill = done ? (green ? 'border-orders-success bg-orders-success text-white' : 'border-orders-primary bg-orders-primary text-white') : n.state === 'part' ? 'border-orders-warning bg-orders-warning-soft text-orders-warning' : 'border-orders-text-subtle/50 bg-orders-surface text-transparent';
        const link = done ? (green ? 'bg-orders-success' : 'bg-orders-primary') : 'bg-orders-text-subtle/40';
        return (
          <span key={n.key} className="flex items-center">
            {i > 0 && <span className={`h-0.5 w-3 ${link}`} />}
            <span title={n.label} className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${fill}`}>
              {done ? <Icon name="check" className="h-2.5 w-2.5" /> : n.state === 'part' ? <span className="h-1.5 w-1.5 rounded-full bg-orders-warning" /> : null}
            </span>
          </span>
        );
      })}
    </span>
  );
}
