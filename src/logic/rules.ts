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
    : DATA.spells.filter(sp => sp.classes.includes(c.id));
}
