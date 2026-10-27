import { DATA, poolOptions } from '../data';
import type { ClassId, Feature, Spell } from '../data/types';
import { bonusLabel } from './bonus';
import { ceilingOf, listSpells, listTag, maxSpellLevel } from './rules';
import { effectiveSub } from './subclass';

export interface Section {
  id: string; title: string; subtitle?: string; motif?: ClassId; locked?: string;
  /** item id -> small source tag, e.g. 'Domain' */
  tags?: Record<string, string>;
  /** character All view: ids of the items that are the character's own */
  mine?: string[];
  items: (Spell | Feature)[];
}

/** The non-empty parts joined with ' · ', or undefined when there are none. */
export function joinTag(...parts: (string | undefined)[]): string | undefined {
  const kept = parts.filter(Boolean);
  return kept.length ? kept.join(' · ') : undefined;
}

export function spellSections(cls: ClassId, level: number, sub?: string): Section[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const s = effectiveSub(cls, level, sub);
  const cast = c.caster === 'none' ? s?.casting : undefined;
  // no character: the expanded list is shown, its spells tagged Optional
  const mine = listSpells(c, s, true);
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
  for (const sp of mine) {
    const t = listTag(c, s, sp);
    if (!t) continue;
    const tags = tagsByLevel.get(sp.level) ?? {};
    tags[sp.id] = t;
    tagsByLevel.set(sp.level, tags);
  }
  if (s?.bonusSpells) {
    const base = bonusLabel(s.bonusSpells.kind, s);
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
    // and of the options in the class's and subclass's optional groups (Primal Awareness), tagged Optional
    const optionalGroups = DATA.optionGroups.filter(og => og.optional
      && ((og.owner.kind === 'class' && og.owner.id === cls) || (og.owner.kind === 'subclass' && og.owner.id === s?.id)));
    const optional = new Set(optionalGroups.flatMap(og => poolOptions(og.from ?? og.id)).filter(f => f.spells));
    for (const f of [...owned, ...optional]) {
      for (const g of f.spells!) {
        const sp = g.spell && !g.option ? DATA.spells.find(x => x.id === g.spell) : undefined;
        if (!sp) continue;
        const tags = tagsByLevel.get(sp.level) ?? {};
        tags[sp.id] ??= joinTag(optional.has(f) ? 'Optional' : undefined, f.name, g.uses)!;
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
  return poolOptions(src).filter(f =>
    f.cost !== 'passive' && (f.prereq?.level ?? 1) <= level && (!g.only || g.only.includes(f.id)));
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

/** 'Optional' tags for the optional items (Tasha's optional features), or undefined when there are none. */
export function tagOptional(items: Feature[]): Record<string, string> | undefined {
  const opt = items.filter(i => i.optional);
  return opt.length ? Object.fromEntries(opt.map(i => [i.id, 'Optional'])) : undefined;
}

export function actionSections(cls: ClassId, level: number, sub?: string): Section[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const s = effectiveSub(cls, level, sub);
  const groups = DATA.optionGroups.filter(g => ((g.owner.kind === 'class' && g.owner.id === cls) || (g.owner.kind === 'subclass' && g.owner.id === s?.id))
    && (g.picks[level - 1] ?? 0) > 0);
  // an optional group has no section of its own: its options join the owner's section
  const optionalItems = (kind: 'class' | 'subclass', id: string) =>
    groups.filter(g => g.optional && g.owner.kind === kind && g.owner.id === id).flatMap(g => optionItems(g.id, level));
  const features = (kind: 'class' | 'subclass', id: string) => [
    ...DATA.features.filter(f => f.source.kind === kind && f.source.id === id && f.level <= level && f.cost !== 'passive'),
    ...optionalItems(kind, id),
  ];
  const section = (id: string, title: string, items: Feature[]): Section => {
    const tags = tagOptional(items);
    return { id, title, motif: cls, items, ...(tags && { tags }) };
  };
  const out: Section[] = [...genericSections(), section('class', `${c.name} Actions`, features('class', cls))];
  if (s) {
    const items = features('subclass', s.id);
    if (items.length > 0) out.push(section('subclass', s.name, items));
  }
  for (const g of groups) {
    if (g.optional) continue;
    const items = optionItems(g.id, level);
    if (items.length > 0) out.push(section(`opt-${g.id}`, g.name, items));
  }
  return out;
}
