import { DATA } from '../data';
import type { ClassId, Route } from '../data/types';
import { maxSpellLevel } from './rules';
import { effectiveSub } from './subclass';

export const ACTION_ICON = 'https://bg3.wiki/w/images/f/f2/Action_Icon.png';
export const BONUS_ACTION_ICON = 'https://bg3.wiki/w/images/c/c9/Bonus_Action_Icon.png';
export const REACTION_ICON = 'https://bg3.wiki/w/images/c/c1/Reaction_Icon.png';
export const WARLOCK_SLOT_ICON = 'https://bg3.wiki/w/images/6/6c/Warlock_Spell_Slot_Icon.webp';

export interface MenuRow {
  kind: 'actions' | 'bonus' | 'reactions' | 'class' | 'cantrips' | 'spells' | 'separator';
  label: string;
  icon?: { type: 'img'; src: string } | { type: 'slot'; level: number; warlock?: boolean };
  target?: Route;
  dimmed?: boolean;
  motif?: ClassId;
}

export function menuRows(cls: ClassId, level: number, sub?: string): MenuRow[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const s = effectiveSub(cls, level, sub);
  const to = (page: 'actions' | 'spells', section: string): Route =>
    s ? { page, cls, level, sub: s.id, section } : { page, cls, level, section };
  const rows: MenuRow[] = [
    { kind: 'actions', label: 'Actions', icon: { type: 'img', src: ACTION_ICON }, target: to('actions', 'actions') },
    { kind: 'bonus', label: 'Bonus Actions', icon: { type: 'img', src: BONUS_ACTION_ICON }, target: to('actions', 'bonus') },
    { kind: 'reactions', label: 'Reactions', icon: { type: 'img', src: REACTION_ICON }, target: to('actions', 'reactions') },
    { kind: 'class', label: `${c.name} Actions`, icon: { type: 'img', src: s?.hotbarIcon ?? c.hotbarIcon }, target: to('actions', 'class') },
  ];
  // Subclass casting (Eldritch Knight, Arcane Trickster) on a non-caster class.
  const cast = c.caster === 'none' ? s?.casting : undefined;
  if (c.caster === 'none' && !cast) return rows;
  const listClass = cast ? DATA.classes.find(x => x.id === cast.list)! : c;
  const motif = cast ? cast.list : cls;
  const cantrips = cast ? cast.cantripsKnown[level - 1] : c.cantripsKnown?.[level - 1];
  const max = cast ? (cast.maxSpellLevel[level - 1] ?? 0) : maxSpellLevel(c, level);
  rows.push({ kind: 'separator', label: 'MAGIC' });
  rows.push({
    kind: 'cantrips', label: 'Cantrips', icon: { type: 'img', src: listClass.plainIcon },
    target: to('spells', 'cantrips'), dimmed: !cantrips, motif,
  });
  for (let n = 1; n <= 9; n++) {
    rows.push({
      kind: 'spells', label: `Level ${n} Spells`,
      icon: c.caster === 'pact' ? { type: 'slot', level: n, warlock: true } : { type: 'slot', level: n },
      target: to('spells', `lvl-${n}`), dimmed: n > max, motif,
    });
  }
  return rows;
}
