import type { Feature, Spell } from '../data/types';
import { Icon, spellFallback } from './Icon';

export function IconGrid(p: { items: (Spell | Feature)[]; tags?: Record<string, string>; ringed?: string[]; onPick(id: string): void }) {
  return (
    <div class="grid">
      {p.items.map((it) => (
        <button type="button" class={p.ringed?.includes(it.id) ? 'ic mine' : 'ic'} key={it.id} onClick={() => p.onPick(it.id)}>
          <Icon src={it.icon} fallback={'school' in it ? spellFallback(it) : 'action'} alt="" size={50} />
          <span>{it.name}</span>
          {p.tags?.[it.id] && <small class="ic-tag">{p.tags[it.id]}</small>}
        </button>
      ))}
    </div>
  );
}
