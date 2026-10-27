import { DATA, poolOptions } from '../data';
import type { ClassId, Feature, OptionGroup } from '../data/types';
import { effectiveSub } from '../logic/subclass';
import { raceChain, totalLevel } from './derive';
import { grantSlots } from './grants';
import type { Character } from './types';

export interface OptionSlot { group: OptionGroup; cls?: ClassId; level: number; count: number; choices: Feature[]; chosen: string[]; taken: string[] }

const groupsOf = (ids: string[]) => DATA.optionGroups.filter(g => ids.includes(g.id));

export function optionSlots(ch: Character): OptionSlot[] {
  const out: OptionSlot[] = [];
  const add = (group: OptionGroup, level: number, cls?: ClassId, sub?: string) => {
    const picks = (group.picks[level - 1] ?? 0) + (group.bonus ?? []).filter(b => sub !== undefined && b.subclass === sub && b.atLevel <= level).reduce((n, b) => n + b.count, 0);
    if (!picks) return;
    const choices = poolOptions(group.from ?? group.id).filter(f =>
      (!group.only || group.only.includes(f.id)) && (f.prereq?.level ?? 0) <= level && (!f.prereq?.option || ch.options.includes(f.prereq.option)));
    // an optional group is tick-any: every option reached may be ticked
    const count = group.optional ? choices.length : picks;
    if (!count) return;
    out.push({ group, cls, level, count, choices, chosen: [], taken: [] });
  };
  for (const c of ch.classes) {
    const def = DATA.classes.find(x => x.id === c.cls);
    const sub = effectiveSub(c.cls, c.level, c.sub);
    if (def) for (const g of groupsOf(def.options)) add(g, c.level, c.cls, sub?.id);
    if (sub) for (const g of groupsOf(sub.options)) add(g, c.level, c.cls, sub.id);
  }
  const total = totalLevel(ch);
  for (const r of raceChain(ch.race)) for (const g of groupsOf(r.options)) add(g, total);
  // a chosen feat's groups sit at total level, with no class
  for (const id of new Set(ch.feats)) for (const g of groupsOf(DATA.feats.find(f => f.id === id)?.options ?? [])) add(g, total);
  assign(out, ch.options);
  // a replaced group's picks stay in ch.options, so unticking the replacement brings them back
  const gone = replaced(ch);
  return out.filter(s => !gone.has(s.group.id));
}

/**
 * True when an option expanding this class's list (Additional Cleric Spells) is ticked in a slot the
 * character has: the class reaches its level and nothing replaced the slot.
 */
export function hasExpandedList(ch: Character, cls: ClassId): boolean {
  return optionSlots(ch).some(s => s.cls === cls
    && s.chosen.some(id => s.choices.find(f => f.id === id)?.expandsList === cls));
}

/** Feature and option group ids hidden by the chosen options (Favored Foe hides Favored Enemy). */
export function replaced(ch: Character): Set<string> {
  return new Set(ch.options.flatMap(id => DATA.features.find(f => f.id === id)?.replaces ?? []));
}

/**
 * Slots of one pool (`from ?? id`) share one pick list. Each pick fills one slot by maximum matching
 * (augmenting paths), so a legal build never shows an over-pick: a pick only one slot offers may move
 * another pick to a different slot. Picks go in list order; owners (non-reuse slots) fill before reuse
 * slots. A pick no matching can place is an over-pick in its first offering slot. A reuse slot may also
 * repeat picks held elsewhere in the pool.
 */
function assign(slots: OptionSlot[], options: string[]) {
  const pools = new Map<string, OptionSlot[]>();
  for (const s of slots) { const k = s.group.from ?? s.group.id; pools.set(k, [...(pools.get(k) ?? []), s]); }
  for (const pool of pools.values()) {
    const offers = (s: OptionSlot, id: string) => s.choices.some(f => f.id === id);
    const ids = [...new Set(options)].filter(id => pool.some(s => offers(s, id)));
    const ordered = [...pool.filter(s => !s.group.reuse), ...pool.filter(s => s.group.reuse)];
    const held = new Map<OptionSlot, string[]>(pool.map(s => [s, []]));
    /** Places `id` in a slot with room, else frees one by moving its holder along an augmenting path. */
    const place = (id: string, seen: Set<OptionSlot>): boolean => {
      const open = ordered.filter(s => offers(s, id) && !seen.has(s));
      const free = open.find(s => held.get(s)!.length < s.count);
      if (free) { held.get(free)!.push(id); return true; }
      for (const s of open) {
        seen.add(s);
        const list = held.get(s)!;
        for (let i = 0; i < list.length; i++) {
          if (place(list[i], seen)) { list[i] = id; return true; }
        }
      }
      return false;
    };
    const over: string[] = [];
    for (const id of ids) if (!place(id, new Set())) over.push(id);
    const placed = new Map<string, OptionSlot>();
    for (const id of ids) {
      const home = over.includes(id) ? pool.find(s => offers(s, id))! : pool.find(s => held.get(s)!.includes(id))!;
      home.chosen.push(id);
      placed.set(id, home);
    }
    for (const s of pool) {
      if (!s.group.reuse) continue;
      for (const [id, home] of placed) if (s.chosen.length < s.count && home !== s && offers(s, id)) s.chosen.push(id);
    }
    for (const s of pool) s.taken = [...placed].filter(([id, home]) => home !== s && offers(s, id) && !s.chosen.includes(id)).map(([id]) => id);
  }
}

/** Drops picks the character can no longer own. Ownership only, never level. Same object when unchanged. */
export function prune(ch: Character): Character {
  const classes = ch.classes.map(c => c.sub && DATA.subclasses.find(s => s.id === c.sub)?.cls !== c.cls ? { ...c, sub: undefined } : c);
  const owned = new Set<string>();
  const own = (ids: string[]) => groupsOf(ids).forEach(g => owned.add(g.from ?? g.id));
  for (const c of classes) {
    own(DATA.classes.find(x => x.id === c.cls)?.options ?? []);
    if (c.sub) own(DATA.subclasses.find(s => s.id === c.sub)?.options ?? []);
  }
  for (const r of raceChain(ch.race)) own(r.options);
  for (const id of new Set(ch.feats)) own(DATA.feats.find(f => f.id === id)?.options ?? []);
  const options = ch.options.filter(o => { const f = DATA.features.find(x => x.id === o); return f?.source.kind === 'option' && owned.has(f.source.id); });
  const step1 = classes.some((c, i) => c !== ch.classes[i]) ? { ...ch, classes } : ch;
  const step2 = options.length === ch.options.length ? step1 : { ...step1, options };
  const keys = new Set(grantSlots(step2).map(s => s.key));
  const spells = ch.spells.filter(s => s.grant ? keys.has(s.grant) : !s.cls || classes.some(c => c.cls === s.cls));
  return spells.length === ch.spells.length ? step2 : { ...step2, spells };
}
