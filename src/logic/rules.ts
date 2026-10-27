import { DATA } from '../data';
import type { ClassDef, Spell, SubclassDef } from '../data/types';

/** Highest spell level the class can cast at this character level. 0 = no spells. */
export function maxSpellLevel(c: ClassDef, level: number): number {
  return c.maxSpellLevel?.[level - 1] ?? 0;
}

/** Highest value in a per-level table, 0 when absent. */
export function ceilingOf(table?: number[]): number {
  return table ? Math.max(0, ...table) : 0;
}

/** Spells a class can pick from; a subclass caster (Eldritch Knight, Arcane Trickster) uses its own list and schools. */
export function listSpells(c: ClassDef, s?: SubclassDef): Spell[] {
  const cast = c.caster === 'none' ? s?.casting : undefined;
  return cast
    // the school limit applies to leveled spells only; cantrips come from the whole list
    ? DATA.spells.filter(sp => sp.classes.includes(cast.list) && (sp.level === 0 || cast.schools.includes(sp.school)))
    : DATA.spells.filter(sp => sp.classes.includes(c.id) || (c.caster !== 'none' && !!s?.extraLists?.some(l => sp.classes.includes(l))));
}

/** 'Cleric list' for a spell on one of the subclass's extra lists but not on the class's own. */
export function extraListTag(c: ClassDef, s: SubclassDef | undefined, sp: Spell): string | undefined {
  if (sp.classes.includes(c.id)) return undefined;
  const l = s?.extraLists?.find(x => sp.classes.includes(x));
  return l ? `${DATA.classes.find(k => k.id === l)?.name ?? l} list` : undefined;
}
