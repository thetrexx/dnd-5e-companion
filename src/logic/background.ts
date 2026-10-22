import { DATA } from '../data';
import type { ClassId, Route } from '../data/types';
import type { BgKey } from '../motion/bgMotifs';
import { optionSlots } from '../character/options';
import type { CharClass, Character } from '../character/types';

// the character menu's class: most levels, a tie goes to the class taken first
function mainClass(ch: Character): ClassId | undefined {
  return ch.classes.reduce<CharClass | undefined>((best, c) => (!best || c.level > best.level ? c : best), undefined)?.cls;
}

// a section id ends in one of the character's own class ids (source keys can contain class-like words, so match whole suffixes)
function sectionClass(ch: Character, section: string): ClassId | undefined {
  if (section.startsWith('opt-')) return optionSlots(ch).find(s => s.cls && s.group.id === section.slice(4))?.cls;
  const owns = (cls: ClassId) => [`cantrips-${cls}`, `class-${cls}`, `subclass-${cls}`].includes(section) || new RegExp(`^lvl-\\d+-${cls}$`).test(section);
  return ch.classes.find(c => owns(c.cls))?.cls;
}

function featureClass(ch: Character, id: string): ClassId | undefined {
  const f = DATA.features.find(x => x.id === id);
  const has = (cls: string | undefined) => ch.classes.find(c => c.cls === cls)?.cls;
  if (f?.source.kind === 'class') return has(f.source.id);
  if (f?.source.kind === 'subclass') return has(DATA.subclasses.find(s => s.id === f.source.id)?.cls);
  if (f?.source.kind === 'option') return optionSlots(ch).find(s => s.cls && s.choices.some(x => x.id === id))?.cls;
  return undefined;
}

/** Which class background a screen shows. */
export function backgroundClass(r: Route, ch: Character | null): BgKey {
  if ('cls' in r) return DATA.classes.some(c => c.id === r.cls) ? r.cls : 'none';
  if (!(r.page === 'me' || r.page.startsWith('me-')) || !ch) return 'none';
  const menu = mainClass(ch);
  if (!menu) return 'none';
  const section = 'section' in r ? r.section : undefined;
  if (section) return sectionClass(ch, section) ?? menu;
  if (r.page === 'me-card' && r.kind === 'feature') return featureClass(ch, r.id) ?? menu;
  return menu;
}
