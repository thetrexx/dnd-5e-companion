import { DATA } from '../data';
import type { Ability, ClassId, Feature, RaceDef, Spell } from '../data/types';
import { ceilingOf, extraListTag, listSpells, maxSpellLevel } from '../logic/rules';
import { effectiveSub } from '../logic/subclass';
import type { CharClass, Character } from './types';

export function totalLevel(ch: Character): number {
  return ch.classes.reduce((n, c) => n + c.level, 0);
}

/** [base] or [base, subrace]; [] for none or unknown. */
export function raceChain(id?: string): RaceDef[] {
  const r = DATA.races.find(x => x.id === id);
  if (!r) return [];
  const parent = r.parent ? DATA.races.find(x => x.id === r.parent) : undefined;
  return parent ? [parent, r] : [r];
}

export function classLine(ch: Character): string {
  return ch.classes.map(c => `${DATA.classes.find(x => x.id === c.cls)?.name ?? c.cls} ${c.level}`).join(' / ');
}

export interface CastingInfo {
  list: ClassId; schools?: string[]; ability: Ability; pact: boolean;
  cantrips: number; known?: number; prepared?: number; maxLevel: number; ceiling: number;
}

/** Casting as if this class were the only one. null when it can't cast (incl. EK/AT below the subclass level or without it). */
export function castingInfo(cc: CharClass): CastingInfo | null {
  const c = DATA.classes.find(x => x.id === cc.cls);
  if (!c) return null;
  const at = (t?: number[]) => t?.[cc.level - 1] ?? 0;
  if (c.caster === 'none') {
    const k = effectiveSub(cc.cls, cc.level, cc.sub)?.casting;
    if (!k) return null;
    return { list: k.list, schools: k.schools, ability: k.ability, pact: false, cantrips: at(k.cantripsKnown),
      known: at(k.spellsKnown), maxLevel: at(k.maxSpellLevel), ceiling: ceilingOf(k.maxSpellLevel) };
  }
  if (!c.spellAbility) return null;
  return {
    list: c.id, ability: c.spellAbility, pact: c.caster === 'pact',
    cantrips: at(c.cantripsKnown),
    known: c.spellsKnown ? at(c.spellsKnown) : undefined,
    prepared: c.prepared ? Math.max(1, (cc.mod ?? 0) + (c.prepared.half ? Math.floor(cc.level / 2) : cc.level)) : undefined,
    maxLevel: maxSpellLevel(c, cc.level), ceiling: ceilingOf(c.maxSpellLevel),
  };
}

/** Picks made for a class, extras included. Warlock level 6+ spells are Mystic Arcanum, outside the known count. */
export function pickCounts(ch: Character, cls: ClassId): { cantrips: number; spells: number } {
  let cantrips = 0, spells = 0;
  for (const p of ch.spells) {
    if (p.cls !== cls) continue;
    const sp = DATA.spells.find(s => s.id === p.id);
    if (!sp) continue;
    if (sp.level === 0) cantrips++;
    else if (!(cls === 'warlock' && sp.level >= 6)) spells++;
  }
  return { cantrips, spells };
}

export interface Pickable { spell: Spell; tag?: string }

export function pickableSpells(cc: CharClass): Pickable[] {
  const c = DATA.classes.find(x => x.id === cc.cls);
  const info = castingInfo(cc);
  if (!c || !info) return [];
  const sub = effectiveSub(cc.cls, cc.level, cc.sub);
  const out = new Map<string, Pickable>();
  for (const spell of listSpells(c, sub)) out.set(spell.id, { spell, tag: extraListTag(c, sub, spell) });
  if (c.caster === 'none') for (const spell of DATA.spells) if (spell.classes.includes(info.list) && !out.has(spell.id)) out.set(spell.id, { spell, tag: 'Any school' });
  if (sub?.bonusSpells?.kind === 'patron') {
    for (const g of sub.bonusSpells.grants) {
      const spell = g.spell && DATA.spells.find(s => s.id === g.spell);
      if (spell && !out.has(spell.id)) out.set(spell.id, { spell, tag: 'Patron' });
    }
  }
  return [...out.values()].filter(p => p.spell.level <= info.maxLevel)
    .sort((a, b) => a.spell.level - b.spell.level || a.spell.name.localeCompare(b.spell.name));
}

/** Class/subclass/option features use the owning class's level; the rest use character level. */
export function featureLevel(ch: Character, f: Feature): number {
  const levelOf = (cls: ClassId) => ch.classes.find(c => c.cls === cls)?.level;
  const subClass = (id: string) => DATA.subclasses.find(s => s.id === id)?.cls;
  const { kind, id } = f.source;
  if (kind === 'class') return levelOf(id as ClassId) ?? totalLevel(ch);
  if (kind === 'subclass') { const k = subClass(id); return (k && levelOf(k)) ?? totalLevel(ch); }
  if (kind === 'option') {
    for (const g of DATA.optionGroups) {
      if ((g.from ?? g.id) !== id) continue;
      const cls = g.owner.kind === 'class' ? g.owner.id as ClassId : g.owner.kind === 'subclass' ? subClass(g.owner.id) : undefined;
      const lvl = cls && levelOf(cls);
      if (lvl) return lvl;
    }
  }
  return totalLevel(ch);
}
