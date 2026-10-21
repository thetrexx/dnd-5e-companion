import { DATA } from '../data';
import type { ClassId, Feature, Spell } from '../data/types';
import { maxSpellLevel } from './rules';
import { effectiveSub } from './subclass';

export interface Section {
  id: string; title: string; subtitle?: string; motif?: ClassId; locked?: string;
  /** item id -> small source tag, e.g. 'Domain' */
  tags?: Record<string, string>;
  items: (Spell | Feature)[];
}

const BONUS_TAG = { domain: 'Domain', oath: 'Oath', circle: 'Circle', patron: 'Patron' } as const;

export function spellSections(cls: ClassId, level: number, sub?: string): Section[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const s = effectiveSub(cls, level, sub);
  const cast = c.caster === 'none' ? s?.casting : undefined;
  const mine = cast
    ? DATA.spells.filter(sp => sp.classes.includes(cast.list) && cast.schools.includes(sp.school))
    : DATA.spells.filter(sp => sp.classes.includes(cls));
  const maxTable = cast ? cast.maxSpellLevel : c.maxSpellLevel;
  const subtitle = cast ? s!.name : c.name;
  const motif: ClassId = cast ? cast.list : cls;
  const byLevel = new Map<number, Spell[]>();
  const tagsByLevel = new Map<number, Record<string, string>>();
  const put = (sp: Spell) => {
    const a = byLevel.get(sp.level) ?? [];
    if (!a.includes(sp)) a.push(sp);
    byLevel.set(sp.level, a);
  };
  mine.forEach(put);
  if (s?.bonusSpells) {
    for (const g of s.bonusSpells.grants) {
      const sp = g.spell && g.atLevel <= level ? DATA.spells.find(x => x.id === g.spell) : undefined;
      if (!sp) continue;
      const opt = g.option ? DATA.features.find(f => f.id === g.option)?.name : undefined;
      const base = BONUS_TAG[s.bonusSpells.kind];
      const tags = tagsByLevel.get(sp.level) ?? {};
      tags[sp.id] = opt ? `${base} · ${opt}` : base;
      tagsByLevel.set(sp.level, tags);
      put(sp);
    }
  }
  const max = cast ? (cast.maxSpellLevel[level - 1] ?? 0) : maxSpellLevel(c, level);
  const out: Section[] = [];
  for (let n = 0; n <= 9; n++) {
    const items = byLevel.get(n) ?? [];
    if (items.length === 0) continue;
    const sec: Section = {
      id: n === 0 ? 'cantrips' : `lvl-${n}`,
      title: n === 0 ? 'Cantrips' : `Level ${n}`,
      subtitle, motif, items,
    };
    const tags = tagsByLevel.get(n);
    if (tags) sec.tags = tags;
    if (n > max) {
      const unlock = (maxTable ?? []).findIndex(m => m >= n) + 1;
      if (unlock > 0) sec.locked = `Unlocks at ${c.name} ${unlock}`;
    }
    out.push(sec);
  }
  return out;
}

function optionItems(groupId: string, level: number): Feature[] {
  const g = DATA.optionGroups.find(x => x.id === groupId)!;
  const src = g.from ?? g.id;
  return DATA.features.filter(f =>
    f.source.kind === 'option' && f.source.id === src && f.cost !== 'passive'
    && (f.prereq?.level ?? 1) <= level && (!g.only || g.only.includes(f.id)));
}

export function actionSections(cls: ClassId, level: number, sub?: string): Section[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const s = effectiveSub(cls, level, sub);
  const generic = (cost: Feature['cost']) => DATA.features.filter(f => f.source.kind === 'generic' && f.cost === cost);
  const out: Section[] = [
    { id: 'actions', title: 'Actions', items: generic('action') },
    { id: 'bonus', title: 'Bonus Actions', items: generic('bonus') },
    { id: 'reactions', title: 'Reactions', items: generic('reaction') },
    {
      id: 'class', title: `${c.name} Actions`, motif: cls,
      items: DATA.features.filter(f => f.source.kind === 'class' && f.source.id === cls && f.level <= level && f.cost !== 'passive'),
    },
  ];
  if (s) {
    const items = DATA.features.filter(f => f.source.kind === 'subclass' && f.source.id === s.id && f.level <= level && f.cost !== 'passive');
    if (items.length > 0) out.push({ id: 'subclass', title: s.name, motif: cls, items });
  }
  for (const g of DATA.optionGroups) {
    const owned = (g.owner.kind === 'class' && g.owner.id === cls) || (g.owner.kind === 'subclass' && g.owner.id === s?.id);
    if (!owned || !(g.picks[level - 1] > 0)) continue;
    const items = optionItems(g.id, level);
    if (items.length > 0) out.push({ id: `opt-${g.id}`, title: g.name, motif: cls, items });
  }
  return out;
}
