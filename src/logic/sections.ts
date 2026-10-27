import { DATA } from '../data';
import type { ClassId, Feature, Spell } from '../data/types';
import { ceilingOf, listSpells, maxSpellLevel } from './rules';
import { effectiveSub } from './subclass';

export interface Section {
  id: string; title: string; subtitle?: string; motif?: ClassId; locked?: string;
  /** item id -> small source tag, e.g. 'Domain' */
  tags?: Record<string, string>;
  /** character All view: ids of the items that are the character's own */
  mine?: string[];
  items: (Spell | Feature)[];
}

const BONUS_TAG = { domain: 'Domain', oath: 'Oath', circle: 'Circle', patron: 'Patron' } as const;

/** The non-empty parts joined with ' · ', or undefined when there are none. */
export function joinTag(...parts: (string | undefined)[]): string | undefined {
  const kept = parts.filter(Boolean);
  return kept.length ? kept.join(' · ') : undefined;
}

export function spellSections(cls: ClassId, level: number, sub?: string): Section[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const s = effectiveSub(cls, level, sub);
  const cast = c.caster === 'none' ? s?.casting : undefined;
  const mine = listSpells(c, s);
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
    const base = s.bonusSpells.kind === 'subclass' ? s.name : BONUS_TAG[s.bonusSpells.kind];
    const opts = new Map<string, string[]>();
    // every grant is listed, so locked levels show the future bonus spells
    for (const g of s.bonusSpells.grants) {
      const sp = g.spell ? DATA.spells.find(x => x.id === g.spell) : undefined;
      if (!sp) continue;
      const opt = g.option ? DATA.features.find(f => f.id === g.option)?.name : undefined;
      const names = opts.get(sp.id) ?? [];
      if (opt && !names.includes(opt)) names.push(opt);
      opts.set(sp.id, names);
      const tags = tagsByLevel.get(sp.level) ?? {};
      tags[sp.id] = joinTag(base, names.join(', '), g.uses)!;
      tagsByLevel.set(sp.level, tags);
      put(sp);
    }
  }
  if (c.caster !== 'none' || cast) {
    // fixed spells of the class's and subclass's features, like bonus spells, whatever the level
    const owned = DATA.features.filter(f => f.spells && ((f.source.kind === 'class' && f.source.id === cls) || (f.source.kind === 'subclass' && f.source.id === s?.id)));
    for (const f of owned) {
      for (const g of f.spells!) {
        const sp = g.spell && !g.option ? DATA.spells.find(x => x.id === g.spell) : undefined;
        if (!sp) continue;
        const tags = tagsByLevel.get(sp.level) ?? {};
        tags[sp.id] ??= joinTag(f.name, g.uses)!;
        tagsByLevel.set(sp.level, tags);
        put(sp);
      }
    }
  }
  const max = cast ? (cast.maxSpellLevel[level - 1] ?? 0) : maxSpellLevel(c, level);
  // a subclass caster (Eldritch Knight, Arcane Trickster) never reaches levels 5-9: leave them out
  const ceiling = cast ? ceilingOf(cast.maxSpellLevel) : 9;
  const out: Section[] = [];
  for (let n = 0; n <= ceiling; n++) {
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

/** Actions, Bonus Actions and Reactions anyone can take. */
export function genericSections(): Section[] {
  const generic = (cost: Feature['cost']) => DATA.features.filter(f => f.source.kind === 'generic' && f.cost === cost);
  return [
    { id: 'actions', title: 'Actions', items: generic('action') },
    { id: 'bonus', title: 'Bonus Actions', items: generic('bonus') },
    { id: 'reactions', title: 'Reactions', items: generic('reaction') },
  ];
}

export function actionSections(cls: ClassId, level: number, sub?: string): Section[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const s = effectiveSub(cls, level, sub);
  const out: Section[] = [
    ...genericSections(),
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
