import { DATA } from '../data';
import type { ClassId, Route } from '../data/types';
import { ceilingOf, grantedSpells, maxSpellLevel } from './rules';
import { actionSections } from './sections';
import { effectiveSub } from './subclass';

export const ACTION_ICON = 'https://bg3.wiki/w/images/f/f2/Action_Icon.png';
export const BONUS_ACTION_ICON = 'https://bg3.wiki/w/images/c/c9/Bonus_Action_Icon.png';
export const REACTION_ICON = 'https://bg3.wiki/w/images/c/c1/Reaction_Icon.png';
export const WARLOCK_SLOT_ICON = 'https://bg3.wiki/w/images/6/6c/Warlock_Spell_Slot_Icon.webp';

export interface MenuRow {
  kind: 'actions' | 'bonus' | 'reactions' | 'class' | 'cantrips' | 'spells' | 'separator';
  label: string;
  icon?: { type: 'img'; src?: string } | { type: 'slot'; level: number; warlock?: boolean };
  target?: Route;
  dimmed?: boolean;
  motif?: ClassId;
}

/** Actions, Bonus Actions and Reactions rows; `to` maps a section id to the route. */
export function genericRows(to: (section: string) => Route): MenuRow[] {
  return [
    { kind: 'actions', label: 'Actions', icon: { type: 'img', src: ACTION_ICON }, target: to('actions') },
    { kind: 'bonus', label: 'Bonus Actions', icon: { type: 'img', src: BONUS_ACTION_ICON }, target: to('bonus') },
    { kind: 'reactions', label: 'Reactions', icon: { type: 'img', src: REACTION_ICON }, target: to('reactions') },
  ];
}

export function menuRows(cls: ClassId, level: number, sub?: string): MenuRow[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const s = effectiveSub(cls, level, sub);
  const to = (page: 'actions' | 'spells', section: string): Route =>
    s ? { page, cls, level, sub: s.id, section } : { page, cls, level, section };
  // the class row lands on the first class, subclass or option section that has cards
  const classSection = actionSections(cls, level, s?.id)
    .find(x => (x.id === 'class' || x.id === 'subclass' || x.id.startsWith('opt-')) && x.items.length > 0)?.id ?? 'class';
  const rows: MenuRow[] = [
    ...genericRows(section => to('actions', section)),
    { kind: 'class', label: `${c.name} Actions`, icon: { type: 'img', src: s?.hotbarIcon ?? c.hotbarIcon }, target: to('actions', classSection) },
  ];
  // Subclass casting (Eldritch Knight, Arcane Trickster) on a non-caster class.
  const cast = c.caster === 'none' ? s?.casting : undefined;
  if (c.caster === 'none' && !cast) return rows;
  const listClass = cast ? DATA.classes.find(x => x.id === cast.list)! : c;
  const motif = cast ? cast.list : cls;
  const cantrips = cast ? cast.cantripsKnown[level - 1] : c.cantripsKnown?.[level - 1];
  const max = cast ? (cast.maxSpellLevel[level - 1] ?? 0) : maxSpellLevel(c, level);
  // a spell the subclass or a class or subclass feature grants outright by this level lights its row too:
  // Swarmkeeper Mage Hand the Cantrips row, Chemical Mastery's Heal the Level 6 row. Patron spells are only pickable.
  const granted = new Set(grantedSpells(c, s).filter(g => g.atLevel <= level).map(g => g.spell.level));
  rows.push({ kind: 'separator', label: 'MAGIC' });
  rows.push({
    kind: 'cantrips', label: 'Cantrips', icon: { type: 'img', src: listClass.plainIcon },
    target: to('spells', 'cantrips'), dimmed: !cantrips && !granted.has(0), motif,
  });
  // a subclass caster never reaches the top spell levels: leave those rows out
  const ceiling = cast ? ceilingOf(cast.maxSpellLevel) : 9;
  for (let n = 1; n <= ceiling; n++) {
    rows.push({
      kind: 'spells', label: `Level ${n} Spells`,
      icon: c.caster === 'pact' ? { type: 'slot', level: n, warlock: true } : { type: 'slot', level: n },
      target: to('spells', `lvl-${n}`), dimmed: n > max && !granted.has(n), motif,
    });
  }
  return rows;
}
