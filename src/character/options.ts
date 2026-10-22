import { DATA } from '../data';
import type { ClassId, Feature, OptionGroup } from '../data/types';
import { effectiveSub } from '../logic/subclass';
import { raceChain, totalLevel } from './derive';
import { grantSlots } from './grants';
import type { Character } from './types';

export interface OptionSlot { group: OptionGroup; cls?: ClassId; level: number; count: number; choices: Feature[]; chosen: string[] }

const groupsOf = (ids: string[]) => DATA.optionGroups.filter(g => ids.includes(g.id));

export function optionSlots(ch: Character): OptionSlot[] {
  const out: OptionSlot[] = [];
  const add = (group: OptionGroup, level: number, cls?: ClassId, sub?: string) => {
    const count = (group.picks[level - 1] ?? 0) + (group.bonus ?? []).filter(b => sub !== undefined && b.subclass === sub && b.atLevel <= level).reduce((n, b) => n + b.count, 0);
    if (!count) return;
    const choices = DATA.features.filter(f => f.source.kind === 'option' && f.source.id === (group.from ?? group.id)
      && (!group.only || group.only.includes(f.id)) && (f.prereq?.level ?? 0) <= level && (!f.prereq?.option || ch.options.includes(f.prereq.option)));
    out.push({ group, cls, level, count, choices, chosen: ch.options.filter(o => choices.some(f => f.id === o)) });
  };
  for (const c of ch.classes) {
    const def = DATA.classes.find(x => x.id === c.cls);
    const sub = effectiveSub(c.cls, c.level, c.sub);
    if (def) for (const g of groupsOf(def.options)) add(g, c.level, c.cls, sub?.id);
    if (sub) for (const g of groupsOf(sub.options)) add(g, c.level, c.cls, sub.id);
  }
  const total = totalLevel(ch);
  for (const r of raceChain(ch.race)) for (const g of groupsOf(r.options)) add(g, total);
  return out;
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
  const options = ch.options.filter(o => { const f = DATA.features.find(x => x.id === o); return f?.source.kind === 'option' && owned.has(f.source.id); });
  const step1 = classes.some((c, i) => c !== ch.classes[i]) ? { ...ch, classes } : ch;
  const step2 = options.length === ch.options.length ? step1 : { ...step1, options };
  const keys = new Set(grantSlots(step2).map(s => s.key));
  const spells = ch.spells.filter(s => s.grant ? keys.has(s.grant) : !s.cls || classes.some(c => c.cls === s.cls));
  return spells.length === ch.spells.length ? step2 : { ...step2, spells };
}
