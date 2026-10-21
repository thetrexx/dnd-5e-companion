import type { Feature, Spell } from '../data/types';
import { Icon } from './Icon';

export function IconGrid(p: { items: (Spell | Feature)[]; onPick(id: string): void }) {
  return (
    <div class="grid">
      {p.items.map((it) => (
        <button type="button" class="ic" key={it.id} onClick={() => p.onPick(it.id)}>
          <Icon src={it.icon} fallback={'school' in it ? 'spell' : 'action'} alt="" size={50} />
          <span>{it.name}</span>
        </button>
      ))}
    </div>
  );
}
