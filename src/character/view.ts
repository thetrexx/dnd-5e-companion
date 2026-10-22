import { DATA } from '../data';
import type { ClassId, Spell } from '../data/types';
import type { Section } from '../logic/sections';
import { listSpells } from '../logic/rules';
import { effectiveSub } from '../logic/subclass';
import type { SpellView } from '../settings/settings';
import { castingInfo } from './derive';
import { autoSpells, grantSources } from './grants';
import type { GrantSource } from './grants';
import type { Character } from './types';

interface Entry { spell: Spell; tag?: string; mine: boolean; locked: boolean; atLevel: number }
/** Where spells are shown: a casting class, or a race / feat / feature of its own. */
interface Place { key: string; subtitle: string; motif?: ClassId; entries: Entry[]; lock: (n: number, es: Entry[]) => string | undefined }

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
    const tag = p.extra ? (cc.cls === 'bard' ? 'Magical Secrets' : 'Other list')
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
  const byChar = s.key.startsWith('race:') || s.key.startsWith('feat:') || !s.cls;
  return {
    key: s.key.replace(/:/g, '-'), subtitle: s.title, entries: [],
    lock: (_, es) => {
      if (!es.every(e => e.locked)) return undefined;
      const at = Math.min(...es.map(e => e.atLevel));
      return byChar ? `Unlocks at character level ${at}` : `Unlocks at ${className(s.cls!)} ${at}`;
    },
  };
}

export function charSpellSections(ch: Character, view: SpellView): Section[] {
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
    place.entries.push({ spell, tag, mine: true, locked: grant.atLevel > source.level, atLevel: grant.atLevel });
  }
  for (const a of autoSpells(ch)) {
    const { place, tag } = route(a.source);
    place.entries.push({ spell: a.spell, tag, mine: a.unlocked, locked: !a.unlocked, atLevel: a.atLevel });
  }
  const places = [...classes.values(), ...sources.flatMap(s => own.get(s.key) ?? [])];
  const out: Section[] = [];
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
      out.push(sec);
    }
  }
  return out;
}
