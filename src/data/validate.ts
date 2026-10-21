import type { Dataset, SpellGrant } from './types';

export const CLASS_IDS: string[] = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
const COSTS = ['action', 'bonus', 'reaction', 'other'];
const FEATURE_COSTS = [...COSTS, 'free', 'passive'];
const CASTERS = ['full', 'half', 'third', 'pact', 'none'];
const RESOLUTIONS = ['attack', 'save', 'auto', 'none'];
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const SOURCES = ['generic', 'class', 'subclass', 'option', 'race', 'feat'];
const OWNERS = ['class', 'subclass', 'race'];
const BONUS_KINDS = ['domain', 'oath', 'circle', 'patron'];
const TEXT_SOURCES = ['srd', 'summary'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const isInt = (n: unknown, min: number, max: number) => Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
const blank = (s: unknown) => typeof s !== 'string' || s.trim() === '';

function checkIds(kind: string, items: { id: string }[], errs: string[]) {
  const seen = new Set<string>();
  for (const it of items) {
    if (blank(it.id) || !KEBAB.test(it.id)) errs.push(`${kind} "${it.id}": id must be kebab-case`);
    if (seen.has(it.id)) errs.push(`${kind} "${it.id}": duplicate id`);
    seen.add(it.id);
  }
}

function table(at: string, key: string, a: unknown, min: number, max: number, errs: string[]) {
  if (!Array.isArray(a) || a.length !== 20) errs.push(`${at}: ${key} must have 20 entries`);
  else if (!a.every(n => isInt(n, min, max))) errs.push(`${at}: ${key} entries must be integers ${min}-${max}`);
}

function checkLevels(c: Dataset['classes'][number], key: 'cantripsKnown' | 'maxSpellLevel', errs: string[]) {
  const a = c[key];
  if (c.caster === 'none') {
    if (a !== undefined) errs.push(`class "${c.id}": ${key} not allowed when caster is none`);
    return;
  }
  table(`class "${c.id}"`, key, a, 0, 9, errs);
}

export function validateDataset(d: Dataset): string[] {
  const errs: string[] = [];
  const spellIds = new Set(d.spells.map(x => x.id));
  const groupIds = new Set(d.optionGroups.map(g => g.id));
  const subIds = new Set(d.subclasses.map(x => x.id));
  const raceIds = new Set(d.races.map(x => x.id));
  const featIds = new Set(d.feats.map(x => x.id));
  const featureIds = new Set(d.features.map(x => x.id));
  const optionsOf = (g: string) => d.features.filter(f => f.source.kind === 'option' && f.source.id === g).map(f => f.id);

  const grants = (at: string, gs: SpellGrant[] | undefined) => {
    if (gs === undefined) return;
    if (!Array.isArray(gs)) { errs.push(`${at}: spells must be an array`); return; }
    for (const g of gs) {
      if ((g.spell === undefined) === (g.choose === undefined)) errs.push(`${at}: grant needs exactly one of spell/choose`);
      if (g.spell !== undefined && !spellIds.has(g.spell)) errs.push(`${at}: grant has unknown spell "${g.spell}"`);
      if (g.choose) {
        if (!Array.isArray(g.choose.lists) || g.choose.lists.length === 0 || !g.choose.lists.every(c => CLASS_IDS.includes(c))) errs.push(`${at}: grant choose.lists has unknown class`);
        if (!isInt(g.choose.level, 0, 9)) errs.push(`${at}: grant choose.level ${g.choose.level} must be 0-9`);
        if (!isInt(g.choose.count, 1, 99)) errs.push(`${at}: grant choose.count must be a positive integer`);
      }
      if (!isInt(g.atLevel, 1, 20)) errs.push(`${at}: grant atLevel ${g.atLevel} must be 1-20`);
      if (g.ability !== undefined && !ABILITIES.includes(g.ability)) errs.push(`${at}: grant ability "${g.ability}" is not valid`);
      if (g.option !== undefined && !featureIds.has(g.option)) errs.push(`${at}: grant has unknown option "${g.option}"`);
    }
  };

  checkIds('class', d.classes, errs);
  for (const c of d.classes) {
    if (!CLASS_IDS.includes(c.id)) errs.push(`class "${c.id}": unknown class id`);
    if (blank(c.name)) errs.push(`class "${c.id}": name is empty`);
    if (!CASTERS.includes(c.caster)) errs.push(`class "${c.id}": caster "${c.caster}" is not valid`);
    checkLevels(c, 'cantripsKnown', errs);
    checkLevels(c, 'maxSpellLevel', errs);
    if (c.spellsKnown !== undefined) table(`class "${c.id}"`, 'spellsKnown', c.spellsKnown, 0, 99, errs);
    if (blank(c.hotbarIcon)) errs.push(`class "${c.id}": hotbarIcon is empty`);
    if (blank(c.plainIcon)) errs.push(`class "${c.id}": plainIcon is empty`);
    if (!isInt(c.subclassLevel, 1, 20)) errs.push(`class "${c.id}": subclassLevel must be an integer 1-20`);
    if (blank(c.subclassLabel)) errs.push(`class "${c.id}": subclassLabel is empty`);
    if (!Array.isArray(c.options)) errs.push(`class "${c.id}": options must be an array`);
    else for (const g of c.options) if (!groupIds.has(g)) errs.push(`class "${c.id}": unknown option group "${g}"`);
  }

  checkIds('spell', d.spells, errs);
  for (const s of d.spells) {
    const at = `spell "${s.id}"`;
    if (blank(s.name)) errs.push(`${at}: name is empty`);
    if (!TEXT_SOURCES.includes(s.textSource)) errs.push(`${at}: textSource must be srd or summary`);
    if (!isInt(s.level, 0, 9)) errs.push(`${at}: level ${s.level} must be an integer 0-9`);
    if (blank(s.school)) errs.push(`${at}: school is empty`);
    if (!s.cast || !COSTS.includes(s.cast.cost)) errs.push(`${at}: cast.cost is not valid`);
    if (!s.cast || blank(s.cast.text)) errs.push(`${at}: cast.text is empty`);
    if (blank(s.range)) errs.push(`${at}: range is empty`);
    if (blank(s.duration)) errs.push(`${at}: duration is empty`);
    if (!Array.isArray(s.description) || s.description.length === 0 || s.description.some(blank)) errs.push(`${at}: description must be non-empty paragraphs`);
    if (!Array.isArray(s.classes)) errs.push(`${at}: classes must be an array`);
    else for (const c of s.classes) if (!CLASS_IDS.includes(c)) errs.push(`${at}: classes has unknown class "${c}"`);
    if (!isInt(s.page, 1, 1000)) errs.push(`${at}: page must be a positive integer`);
    if (s.summary) {
      if (!RESOLUTIONS.includes(s.summary.resolution)) errs.push(`${at}: summary.resolution is not valid`);
      if (s.summary.save !== undefined && !ABILITIES.includes(s.summary.save)) errs.push(`${at}: summary.save is not valid`);
      if (s.summary.resolution === 'save' && !s.summary.save) errs.push(`${at}: summary.save required when resolution is save`);
    }
  }

  checkIds('feature', d.features, errs);
  for (const f of d.features) {
    const at = `feature "${f.id}"`;
    if (blank(f.name)) errs.push(`${at}: name is empty`);
    if (!TEXT_SOURCES.includes(f.textSource)) errs.push(`${at}: textSource must be srd or summary`);
    if (!f.source || !SOURCES.includes(f.source.kind)) errs.push(`${at}: source.kind is not valid`);
    else {
      const { kind, id } = f.source;
      if (kind === 'class' && !CLASS_IDS.includes(id)) errs.push(`${at}: source has unknown class "${id}"`);
      if (kind === 'subclass' && !subIds.has(id)) errs.push(`${at}: source has unknown subclass "${id}"`);
      if (kind === 'option') {
        if (!groupIds.has(id)) errs.push(`${at}: source has unknown option group "${id}"`);
        else if (!f.id.startsWith(`${id}-`)) errs.push(`${at}: option feature id must start with "${id}-"`);
      }
      if (kind === 'race' && !raceIds.has(id)) errs.push(`${at}: source has unknown race "${id}"`);
      if (kind === 'feat' && !featIds.has(id)) errs.push(`${at}: source has unknown feat "${id}"`);
    }
    if (!isInt(f.level, 1, 20)) errs.push(`${at}: level ${f.level} must be an integer 1-20`);
    if (!FEATURE_COSTS.includes(f.cost)) errs.push(`${at}: cost is not valid`);
    if (!Array.isArray(f.description) || f.description.length === 0 || f.description.some(blank)) errs.push(`${at}: description must be non-empty paragraphs`);
    if (!isInt(f.page, 1, 1000)) errs.push(`${at}: page must be a positive integer`);
    for (const sc of f.scaling ?? [])
      if (!Array.isArray(sc.values) || sc.values.length !== 20 || !sc.values.every(v => typeof v === 'string')) errs.push(`${at}: scaling "${sc.label}" must have 20 string values`);
    if (f.prereq?.option !== undefined && !featureIds.has(f.prereq.option)) errs.push(`${at}: prereq has unknown option "${f.prereq.option}"`);
    grants(at, f.spells);
  }

  checkIds('subclass', d.subclasses, errs);
  for (const sc of d.subclasses) {
    const at = `subclass "${sc.id}"`;
    if (!CLASS_IDS.includes(sc.cls)) errs.push(`${at}: unknown class "${sc.cls}"`);
    if (blank(sc.name)) errs.push(`${at}: name is empty`);
    if (!isInt(sc.page, 1, 1000)) errs.push(`${at}: page must be a positive integer`);
    if (sc.bonusSpells) {
      if (!BONUS_KINDS.includes(sc.bonusSpells.kind)) errs.push(`${at}: bonusSpells.kind is not valid`);
      grants(at, sc.bonusSpells.grants);
    }
    if (sc.casting) {
      const c = sc.casting;
      if (!CLASS_IDS.includes(c.list)) errs.push(`${at}: casting has unknown class "${c.list}"`);
      if (!ABILITIES.includes(c.ability)) errs.push(`${at}: casting ability "${c.ability}" is not valid`);
      table(at, 'casting.cantripsKnown', c.cantripsKnown, 0, 9, errs);
      table(at, 'casting.spellsKnown', c.spellsKnown, 0, 99, errs);
      table(at, 'casting.maxSpellLevel', c.maxSpellLevel, 0, 9, errs);
    }
    for (const g of sc.options ?? []) if (!groupIds.has(g)) errs.push(`${at}: unknown option group "${g}"`);
  }

  checkIds('option group', d.optionGroups, errs);
  for (const g of d.optionGroups) {
    const at = `option group "${g.id}"`;
    if (blank(g.name)) errs.push(`${at}: name is empty`);
    const o = g.owner;
    if (!o || !OWNERS.includes(o.kind)) errs.push(`${at}: owner.kind is not valid`);
    else if ((o.kind === 'class' && !CLASS_IDS.includes(o.id)) || (o.kind === 'subclass' && !subIds.has(o.id)) || (o.kind === 'race' && !raceIds.has(o.id))) errs.push(`${at}: owner has unknown ${o.kind} "${o.id}"`);
    table(at, 'picks', g.picks, 0, 99, errs);
    if (Array.isArray(g.picks) && g.picks.some((n, i) => i > 0 && n < g.picks[i - 1])) errs.push(`${at}: picks must not decrease`);
    if (g.from !== undefined && !groupIds.has(g.from)) errs.push(`${at}: unknown from group "${g.from}"`);
    if (g.only !== undefined) {
      if (g.from === undefined) errs.push(`${at}: only requires from`);
      else {
        const have = optionsOf(g.from);
        for (const x of g.only) if (!have.includes(x)) errs.push(`${at}: only has "${x}" which is not an option of "${g.from}"`);
      }
    }
    for (const b of g.bonus ?? []) {
      if (!subIds.has(b.subclass)) errs.push(`${at}: bonus has unknown subclass "${b.subclass}"`);
      if (!isInt(b.atLevel, 1, 20)) errs.push(`${at}: bonus atLevel must be 1-20`);
      if (!isInt(b.count, 1, 99)) errs.push(`${at}: bonus count must be a positive integer`);
    }
  }

  checkIds('race', d.races, errs);
  for (const r of d.races) {
    const at = `race "${r.id}"`;
    if (blank(r.name)) errs.push(`${at}: name is empty`);
    if (r.parent !== undefined && !raceIds.has(r.parent)) errs.push(`${at}: unknown parent race "${r.parent}"`);
    if (!isInt(r.page, 1, 1000)) errs.push(`${at}: page must be a positive integer`);
    grants(at, r.spells);
    for (const g of r.options ?? []) if (!groupIds.has(g)) errs.push(`${at}: unknown option group "${g}"`);
  }

  checkIds('feat', d.feats, errs);
  for (const f of d.feats) {
    const at = `feat "${f.id}"`;
    if (blank(f.name)) errs.push(`${at}: name is empty`);
    if (!TEXT_SOURCES.includes(f.textSource)) errs.push(`${at}: textSource must be srd or summary`);
    if (!Array.isArray(f.description) || f.description.length === 0 || f.description.some(blank)) errs.push(`${at}: description must be non-empty paragraphs`);
    if (!isInt(f.page, 1, 1000)) errs.push(`${at}: page must be a positive integer`);
    grants(at, f.spells);
  }

  return errs;
}
