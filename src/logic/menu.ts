import { DATA } from '../data';
import type { ClassId, Route } from '../data/types';
import { maxSpellLevel } from './rules';

export const ACTION_ICON = 'https://bg3.wiki/w/images/f/f2/Action_Icon.png';
export const BONUS_ACTION_ICON = 'https://bg3.wiki/w/images/c/c9/Bonus_Action_Icon.png';
export const REACTION_ICON = 'https://bg3.wiki/w/images/c/c1/Reaction_Icon.png';

export interface MenuRow {
  kind: 'actions' | 'bonus' | 'reactions' | 'class' | 'cantrips' | 'spells' | 'separator';
  label: string;
  icon?: { type: 'img'; src: string } | { type: 'slot'; level: number };
  target?: Route;
  dimmed?: boolean;
  motif?: ClassId;
}

export function menuRows(cls: ClassId, level: number): MenuRow[] {
  const c = DATA.classes.find(x => x.id === cls)!;
  const to = (page: 'actions' | 'spells', section: string): Route => ({ page, cls, level, section });
  const rows: MenuRow[] = [
    { kind: 'actions', label: 'Actions', icon: { type: 'img', src: ACTION_ICON }, target: to('actions', 'actions') },
    { kind: 'bonus', label: 'Bonus Actions', icon: { type: 'img', src: BONUS_ACTION_ICON }, target: to('actions', 'bonus') },
    { kind: 'reactions', label: 'Reactions', icon: { type: 'img', src: REACTION_ICON }, target: to('actions', 'reactions') },
    { kind: 'class', label: `${c.name} Actions`, icon: { type: 'img', src: c.hotbarIcon }, target: to('actions', 'class') },
  ];
  if (c.caster === 'none') return rows;
  const max = maxSpellLevel(c, level);
  rows.push({ kind: 'separator', label: 'MAGIC' });
  rows.push({
    kind: 'cantrips', label: 'Cantrips', icon: { type: 'img', src: c.plainIcon },
    target: to('spells', 'cantrips'), dimmed: !c.cantripsKnown?.[level - 1], motif: cls,
  });
  for (let n = 1; n <= 9; n++) {
    rows.push({
      kind: 'spells', label: `Level ${n} Spells`, icon: { type: 'slot', level: n },
      target: to('spells', `lvl-${n}`), dimmed: n > max, motif: cls,
    });
  }
  return rows;
}
