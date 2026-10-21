import type { ClassDef } from '../data/types';

/** Highest spell level the class can cast at this character level. 0 = no spells. */
export function maxSpellLevel(c: ClassDef, level: number): number {
  return c.maxSpellLevel?.[level - 1] ?? 0;
}
