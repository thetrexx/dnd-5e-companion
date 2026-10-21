import { DATA } from '../data';
import type { ClassId, Feature, Spell } from '../data/types';
import { maxSpellLevel } from './rules';

export interface Section {
  id: string; title: string; subtitle?: string; motif?: ClassId; locked?: string;
  items: (Spell | Feature)[];
}

export function spellSections(cls: ClassId, level: number): Section[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const mine = DATA.spells.filter(s => s.classes.includes(cls));
  const out: Section[] = [];
  for (let n = 0; n <= 9; n++) {
    const items = mine.filter(s => s.level === n);
    if (items.length === 0) continue;
    const sec: Section = {
      id: n === 0 ? 'cantrips' : `lvl-${n}`,
      title: n === 0 ? 'Cantrips' : `Level ${n}`,
      subtitle: c.name, motif: cls, items,
    };
    if (n > maxSpellLevel(c, level)) {
      const unlock = (c.maxSpellLevel ?? []).findIndex(m => m >= n) + 1;
      if (unlock > 0) sec.locked = `Unlocks at ${c.name} ${unlock}`;
    }
    out.push(sec);
  }
  return out;
}

export function actionSections(cls: ClassId, level: number): Section[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const generic = (cost: Feature['cost']) => DATA.features.filter(f => f.source.kind === 'generic' && f.cost === cost);
  return [
    { id: 'actions', title: 'Actions', items: generic('action') },
    { id: 'bonus', title: 'Bonus Actions', items: generic('bonus') },
    { id: 'reactions', title: 'Reactions', items: generic('reaction') },
    {
      id: 'class', title: `${c.name} Actions`, motif: cls,
      items: DATA.features.filter(f => f.source.kind === 'class' && f.source.id === cls && f.level <= level),
    },
  ];
}
