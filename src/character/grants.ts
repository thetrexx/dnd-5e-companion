import { DATA } from '../data';
import type { ClassId, EditStep, Feature, Spell, SpellGrant } from '../data/types';
import { featureLevel, raceChain, totalLevel } from './derive';
import type { CharClass, Character } from './types';

export interface GrantSource {
  key: string;            // 'race:<raceId>' | 'feat:<featId>' | 'feature:<featureId>' | 'sub:<subclassId>'
  title: string;          // race, feat, feature or bonus label ('Domain', 'Oath', 'Circle')
  cls?: ClassId;          // owning class for feature and sub sources
  level: number;          // the level grants compare atLevel against (class level, or total level for race/feat)
  grants: { grant: SpellGrant; index: number }[];   // index in the source's original grant array
  step: EditStep;         // where the editor offers its choices
}

/** Ownership only: level gating lives in `unlocked`, so lowering a level never drops picks. */
const ownedSub = (c: CharClass) => { const s = DATA.subclasses.find(x => x.id === c.sub); return s && s.cls === c.cls ? s : undefined; };

const BONUS_TITLE = { domain: 'Domain', oath: 'Oath', circle: 'Circle', patron: 'Patron' };

function owningClass(ch: Character, f: Feature): ClassId | undefined {
  const subCls = (id: string) => DATA.subclasses.find(s => s.id === id)?.cls;
  const { kind, id } = f.source;
  if (kind === 'class') return id as ClassId;
  if (kind === 'subclass') return subCls(id);
  if (kind !== 'option') return undefined;
  for (const g of DATA.optionGroups) {
    if ((g.from ?? g.id) !== id) continue;
    const cls = g.owner.kind === 'class' ? g.owner.id as ClassId : g.owner.kind === 'subclass' ? subCls(g.owner.id) : undefined;
    if (cls && ch.classes.some(c => c.cls === cls)) return cls;
  }
  return undefined;
}

export function grantSources(ch: Character): GrantSource[] {
  const total = totalLevel(ch);
  const out: GrantSource[] = [];
  const add = (s: Omit<GrantSource, 'grants'>, all: SpellGrant[]) => {
    const grants = all.map((grant, index) => ({ grant, index })).filter(g => !g.grant.option || ch.options.includes(g.grant.option));
    if (grants.length) out.push({ ...s, grants });
  };
  for (const r of raceChain(ch.race)) add({ key: `race:${r.id}`, title: r.name, level: total, step: 'basics' }, r.spells);
  for (const id of new Set(ch.feats)) {
    const f = DATA.feats.find(x => x.id === id);
    if (f) add({ key: `feat:${f.id}`, title: f.name, level: total, step: 'feats' }, f.spells);
  }
  const feature = (f: Feature, step: EditStep) =>
    f.spells && add({ key: `feature:${f.id}`, title: f.name, cls: owningClass(ch, f), level: featureLevel(ch, f), step }, f.spells);
  for (const id of ch.options) {
    const f = DATA.features.find(x => x.id === id);
    if (f?.source.kind === 'option') feature(f, 'options');
  }
  const subs = ch.classes.flatMap(c => ownedSub(c) ?? []);
  for (const f of DATA.features) {
    const { kind, id } = f.source;
    if ((kind === 'class' && ch.classes.some(c => c.cls === id)) || (kind === 'subclass' && subs.some(s => s.id === id))) feature(f, 'spells');
  }
  for (const c of ch.classes) {
    const sub = ownedSub(c);
    const b = sub?.bonusSpells;
    if (sub && b && b.kind !== 'patron') add({ key: `sub:${sub.id}`, title: BONUS_TITLE[b.kind], cls: c.cls, level: c.level, step: 'spells' }, b.grants);
  }
  return out;
}

export interface GrantSlot { key: string; source: GrantSource; choose: NonNullable<SpellGrant['choose']>; unlocked: boolean; candidates: Spell[] }

export function grantSlots(ch: Character): GrantSlot[] {
  const out: GrantSlot[] = [];
  for (const source of grantSources(ch)) {
    for (const { grant, index } of source.grants) {
      const c = grant.choose;
      if (!c) continue;
      const candidates = DATA.spells
        .filter(s => s.level === c.level && s.classes.some(k => c.lists.includes(k)) && (!c.ritual || s.ritual) && (!c.schools || c.schools.includes(s.school)))
        .sort((a, b) => a.name.localeCompare(b.name));
      out.push({ key: `${source.key}:${index}`, source, choose: c, unlocked: grant.atLevel <= source.level, candidates });
    }
  }
  return out;
}

export interface AutoSpell { spell: Spell; source: GrantSource; unlocked: boolean; atLevel: number; uses?: string }

export function autoSpells(ch: Character): AutoSpell[] {
  const out: AutoSpell[] = [];
  for (const source of grantSources(ch)) {
    for (const { grant } of source.grants) {
      const spell = grant.spell && DATA.spells.find(s => s.id === grant.spell);
      if (spell) out.push({ spell, source, unlocked: grant.atLevel <= source.level, atLevel: grant.atLevel, uses: grant.uses });
    }
  }
  return out;
}
