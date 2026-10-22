import type { ClassId } from '../data/types';

export interface CharClass { cls: ClassId; level: number; sub?: string; mod?: number }
/** Exactly one of cls / grant. cls: picked from that class's list (extra: from another list, e.g. Magical Secrets). grant: a GrantSlot key. */
export interface CharSpell { id: string; cls?: ClassId; extra?: true; grant?: string }
/** `race` is the most specific race id chosen (a subrace id implies its parent). `classes` is in the order taken; index 0 is the starting class. */
export interface Character { v: 1; name: string; race?: string; classes: CharClass[]; options: string[]; feats: string[]; spells: CharSpell[] }

export function emptyCharacter(): Character {
  return { v: 1, name: '', classes: [], options: [], feats: [], spells: [] };
}
