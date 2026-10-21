import { useState } from 'preact/hooks';
import type { Spell } from '../data/types';
import { componentInfo } from '../logic/card';
import { fallbackUrl } from './Icon';

type Key = 'v' | 's' | 'm';
const ITEMS: { key: Key; label: string; icon: 'verbal' | 'somatic' | 'material' }[] = [
  { key: 'v', label: 'Verbal', icon: 'verbal' },
  { key: 's', label: 'Somatic', icon: 'somatic' },
  { key: 'm', label: 'Material', icon: 'material' },
];

export function ComponentIcons(p: { spell: Spell }) {
  const [open, setOpen] = useState<Key | null>(null);
  const info = componentInfo(p.spell);
  const shown = open ? info[open] : null;
  return (
    <div>
      <div class="comps">
        {ITEMS.map((it) => {
          const present = info[it.key] !== null;
          return (
            <button type="button" key={it.key} class={`comp${open === it.key ? ' on' : ''}${present ? '' : ' off'}`}
              aria-disabled={present ? undefined : 'true'} aria-expanded={present ? open === it.key : undefined}
              onClick={() => present && setOpen(open === it.key ? null : it.key)}>
              <span class="ico"><img src={fallbackUrl(it.icon)} alt="" width={32} height={32} /></span>
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
      {shown && <p class="comp-explain">{shown.body}</p>}
    </div>
  );
}
