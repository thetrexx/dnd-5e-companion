import { DATA } from '../data';
import type { ClassId, Feature, Route, Spell } from '../data/types';
import { genericRows } from '../logic/menu';
import type { MenuRow } from '../logic/menu';
import { genericSections, joinTag } from '../logic/sections';
import type { Section } from '../logic/sections';
import { listSpells } from '../logic/rules';
import { effectiveSub } from '../logic/subclass';
import type { SpellView } from '../settings/settings';
import { castingInfo, raceChain } from './derive';
import { autoSpells, grantSources, unlockText } from './grants';
import type { GrantSource } from './grants';
import { optionSlots } from './options';
import type { OptionSlot } from './options';
import type { CharClass, Character } from './types';

interface Entry { spell: Spell; tag?: string; mine: boolean; locked: boolean; atLevel: number }
/** Where spells are shown: a casting class, or a race / feat / feature of its own (`source` set). */
interface Place { key: string; subtitle: string; motif?: ClassId; source?: GrantSource; entries: Entry[]; lock: (n: number, es: Entry[]) => string | undefined }

const className = (id: ClassId) => DATA.classes.find(c => c.id === id)?.name ?? id;

export function hasPickedSpells(ch: Character): boolean {
  return ch.spells.length > 0;
}

function classPlace(ch: Character, i: number, view: SpellView): Place | undefined {
  const cc = ch.classes[i];
  const c = DATA.classes.find(x => x.id === cc.cls);
  const info = castingInfo(cc);
  if (!c || !info) return undefined;
  const sub = effectiveSub(cc.cls, cc.level, cc.sub);
  const table = c.caster === 'none' ? sub?.casting?.maxSpellLevel : c.maxSpellLevel;
  const list = listSpells(c, sub);
  const patron = sub?.bonusSpells?.kind === 'patron'
    ? sub.bonusSpells.grants.flatMap(g => DATA.spells.find(s => s.id === g.spell) ?? []) : [];
  const entries: Entry[] = [];
  for (const p of ch.spells) {
    const spell = p.cls === cc.cls && DATA.spells.find(s => s.id === p.id);
    if (!spell) continue;
    const tag = cc.cls === 'warlock' && spell.level >= 6 ? 'Mystic Arcanum'
      : p.extra ? (cc.cls === 'bard' ? 'Magical Secrets' : 'Other list')
      : list.includes(spell) ? undefined : patron.includes(spell) ? 'Patron' : c.caster === 'none' ? 'Any school' : undefined;
    entries.push({ spell, tag, mine: true, locked: false, atLevel: 1 });
  }
  if (view === 'all') {
    // the whole list up to the ceiling, so levels not reached yet show dimmed
    for (const spell of list) if (spell.level <= info.ceiling) entries.push({ spell, mine: false, locked: false, atLevel: 1 });
    for (const spell of patron) if (spell.level <= info.ceiling) entries.push({ spell, tag: 'Patron', mine: false, locked: false, atLevel: 1 });
  }
  return {
    key: cc.cls, subtitle: c.name, motif: info.list, entries,
    lock: n => {
      if (n <= info.maxLevel) return undefined;
      const at = (table ?? []).findIndex(m => m >= n) + 1;
      return at > 0 ? `Unlocks at ${c.name} ${at}` : undefined;
    },
  };
}

function sourcePlace(s: GrantSource): Place {
  return {
    key: s.key.replace(/:/g, '-'), subtitle: s.title, source: s, entries: [],
    lock: (_, es) => {
      if (!es.every(e => e.locked)) return undefined;
      return unlockText(s, Math.min(...es.map(e => e.atLevel)));
    },
  };
}

/** Places in display order, and the sections built from them (by level, then place). */
function spellLayout(ch: Character, view: SpellView): { places: Place[]; sections: { place: Place; sec: Section }[] } {
  const classes = new Map<ClassId, Place>();
  ch.classes.forEach((cc, i) => { const p = !classes.has(cc.cls) && classPlace(ch, i, view); if (p) classes.set(cc.cls, p); });
  const sources = grantSources(ch);
  const own = new Map<string, Place>();
  // a source of a casting class joins that class, tagged with the source title; the rest stand alone
  const route = (s: GrantSource): { place: Place; tag?: string } => {
    const cls = s.cls && classes.get(s.cls);
    if (cls) return { place: cls, tag: s.title };
    if (!own.has(s.key)) own.set(s.key, sourcePlace(s));
    return { place: own.get(s.key)! };
  };
  for (const p of ch.spells) {
    if (!p.grant) continue;
    const cut = p.grant.lastIndexOf(':');
    const source = sources.find(s => s.key === p.grant!.slice(0, cut));
    const grant = source?.grants.find(g => g.index === Number(p.grant!.slice(cut + 1)))?.grant;
    const spell = DATA.spells.find(s => s.id === p.id);
    if (!source || !grant || !spell) continue;
    const { place, tag } = route(source);
    place.entries.push({ spell, tag: joinTag(tag, grant.uses), mine: true, locked: grant.atLevel > source.level, atLevel: grant.atLevel });
  }
  for (const a of autoSpells(ch)) {
    const { place, tag } = route(a.source);
    place.entries.push({ spell: a.spell, tag: joinTag(tag, a.uses), mine: a.unlocked, locked: !a.unlocked, atLevel: a.atLevel });
  }
  const places = [...classes.values(), ...sources.flatMap(s => own.get(s.key) ?? [])];
  const out: { place: Place; sec: Section }[] = [];
  for (let n = 0; n <= 9; n++) {
    for (const pl of places) {
      const merged = new Map<string, Entry>();
      for (const e of pl.entries) {
        if (e.spell.level !== n || (view === 'mine' && !e.mine)) continue;
        const m = merged.get(e.spell.id);
        if (!m) { merged.set(e.spell.id, { ...e }); continue; }
        m.mine ||= e.mine; m.tag ??= e.tag; m.locked &&= e.locked; m.atLevel = Math.min(m.atLevel, e.atLevel);
      }
      if (merged.size === 0) continue;
      const es = [...merged.values()].sort((a, b) => a.spell.name.localeCompare(b.spell.name));
      const sec: Section = {
        id: `${n === 0 ? 'cantrips' : `lvl-${n}`}-${pl.key}`, title: n === 0 ? 'Cantrips' : `Level ${n}`,
        subtitle: pl.subtitle, motif: pl.motif, items: es.map(e => e.spell),
      };
      const tagged = es.filter(e => e.tag);
      if (tagged.length) sec.tags = Object.fromEntries(tagged.map(e => [e.spell.id, e.tag!]));
      if (view === 'all') sec.mine = es.filter(e => e.mine).map(e => e.spell.id);
      const locked = pl.lock(n, es);
      if (locked) sec.locked = locked;
      out.push({ place: pl, sec });
    }
  }
  return { places, sections: out };
}

export function charSpellSections(ch: Character, view: SpellView): Section[] {
  return spellLayout(ch, view).sections.map(x => x.sec);
}

const chosenActions = (slot: OptionSlot): Feature[] => slot.chosen
  .flatMap(id => DATA.features.find(f => f.id === id) ?? [])
  .filter(f => f.cost !== 'passive' && (f.prereq?.level ?? 0) <= slot.level);

/** Class, subclass (when it has cards) and option sections of one class. */
function classActions(cc: CharClass, slots: OptionSlot[]): Section[] {
  const c = DATA.classes.find(x => x.id === cc.cls);
  if (!c) return [];
  const s = effectiveSub(cc.cls, cc.level, cc.sub);
  const features = (kind: 'class' | 'subclass', id: string) =>
    DATA.features.filter(f => f.source.kind === kind && f.source.id === id && f.level <= cc.level && f.cost !== 'passive');
  const out: Section[] = [{ id: `class-${cc.cls}`, title: `${c.name} Actions`, motif: cc.cls, items: features('class', cc.cls) }];
  const subItems = s ? features('subclass', s.id) : [];
  if (s && subItems.length) out.push({ id: `subclass-${cc.cls}`, title: s.name, motif: cc.cls, items: subItems });
  for (const slot of slots) {
    const items = slot.cls === cc.cls ? chosenActions(slot) : [];
    if (items.length) out.push({ id: `opt-${slot.group.id}`, title: slot.group.name, motif: cc.cls, items });
  }
  return out;
}

/** Race and feat sections, each only when it has cards. */
function otherActions(ch: Character, slots: OptionSlot[]): Section[] {
  const out: Section[] = [];
  const chain = raceChain(ch.race);
  const race = [
    ...DATA.features.filter(f => f.source.kind === 'race' && chain.some(r => r.id === f.source.id) && f.cost !== 'passive'),
    ...slots.filter(s => !s.cls).flatMap(chosenActions),
  ];
  if (race.length) out.push({ id: 'race', title: `${chain[0].name} Actions`, items: race });
  const feats = [...new Set(ch.feats)].flatMap(id => DATA.features.filter(f => f.source.kind === 'feat' && f.source.id === id && f.cost !== 'passive'));
  if (feats.length) out.push({ id: 'feats', title: 'Feats', items: feats });
  return out;
}

export function charActionSections(ch: Character): Section[] {
  const slots = optionSlots(ch);
  return [...genericSections(), ...ch.classes.flatMap(cc => classActions(cc, slots)), ...otherActions(ch, slots)];
}

function sourceIcon(s: GrantSource): MenuRow['icon'] {
  const [kind, id] = s.key.split(':');
  if (kind === 'race') return { type: 'img', src: DATA.races.find(r => r.id === id)?.icon };
  if (kind === 'feat') return { type: 'img', src: DATA.feats.find(f => f.id === id)?.icon };
  return undefined;
}

export function charMenuRows(ch: Character): MenuRow[] {
  const actions = (section: string): Route => ({ page: 'me-actions', section });
  const spells = (section: string): Route => ({ page: 'me-spells', section });
  const slots = optionSlots(ch);
  const rows = genericRows(actions);
  for (const cc of ch.classes) {
    const c = DATA.classes.find(x => x.id === cc.cls);
    if (!c) continue;
    // the class row lands on the first class, subclass or option section that has cards
    const first = classActions(cc, slots).find(x => x.items.length > 0)?.id ?? `class-${cc.cls}`;
    const icon = effectiveSub(cc.cls, cc.level, cc.sub)?.hotbarIcon ?? c.hotbarIcon;
    rows.push({ kind: 'class', label: `${c.name} Actions`, icon: { type: 'img', src: icon }, target: actions(first) });
  }
  const raceIcon = raceChain(ch.race)[0]?.icon;
  for (const sec of otherActions(ch, slots)) {
    rows.push({ kind: 'class', label: sec.title, icon: { type: 'img', src: sec.id === 'race' ? raceIcon : undefined }, target: actions(sec.id) });
  }
  const { places, sections } = spellLayout(ch, 'all');
  if (sections.length === 0) return rows;
  rows.push({ kind: 'separator', label: 'MAGIC' });
  const casters = ch.classes.flatMap(cc => { const info = castingInfo(cc); return info ? [{ cc, info }] : []; });
  for (let n = 0; n <= 9; n++) {
    for (const { cc, info } of casters) {
      const id = `${n === 0 ? 'cantrips' : `lvl-${n}`}-${cc.cls}`;
      // past the ceiling only for a spell of the character's own there (e.g. Mystic Arcanum)
      const own = sections.some(x => x.sec.id === id && x.sec.mine?.length);
      if (n > info.ceiling && !own) continue;
      const name = casters.length === 1 ? '' : `${className(cc.cls)} `;
      rows.push(n === 0
        ? { kind: 'cantrips', label: `${name}Cantrips`, icon: { type: 'img', src: DATA.classes.find(x => x.id === info.list)?.plainIcon },
            target: spells(id), dimmed: info.cantrips === 0, motif: info.list }
        : { kind: 'spells', label: `Level ${n} ${name}Spells`, icon: info.pact ? { type: 'slot', level: n, warlock: true } : { type: 'slot', level: n },
            target: spells(id), dimmed: n > info.maxLevel && !own, motif: info.list });
    }
  }
  // grant sources standing alone (race, feat, feature): one row each, onto its first section; dimmed until one unlocks
  for (const pl of places) {
    const own = pl.source ? sections.filter(x => x.place === pl) : [];
    if (own.length) rows.push({ kind: 'spells', label: `${pl.source!.title} Spells`, icon: sourceIcon(pl.source!),
      target: spells(own[0].sec.id), dimmed: own.every(x => x.sec.locked) });
  }
  return rows;
}
