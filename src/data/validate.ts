import type { Dataset } from './types';

export const CLASS_IDS: string[] = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
const COSTS = ['action', 'bonus', 'reaction', 'other'];
const CASTERS = ['full', 'half', 'third', 'pact', 'none'];
const RESOLUTIONS = ['attack', 'save', 'auto', 'none'];
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const SOURCES = ['generic', 'class', 'subclass', 'race', 'feat'];
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

function checkLevels(c: Dataset['classes'][number], key: 'cantripsKnown' | 'maxSpellLevel', errs: string[]) {
  const a = c[key];
  if (c.caster === 'none') {
    if (a !== undefined) errs.push(`class "${c.id}": ${key} not allowed when caster is none`);
    return;
  }
  if (!Array.isArray(a) || a.length !== 20) errs.push(`class "${c.id}": ${key} must have 20 entries`);
  else if (!a.every(n => isInt(n, 0, 9))) errs.push(`class "${c.id}": ${key} entries must be integers 0-9`);
}

export function validateDataset(d: Dataset): string[] {
  const errs: string[] = [];

  checkIds('class', d.classes, errs);
  for (const c of d.classes) {
    if (!CLASS_IDS.includes(c.id)) errs.push(`class "${c.id}": unknown class id`);
    if (blank(c.name)) errs.push(`class "${c.id}": name is empty`);
    if (!CASTERS.includes(c.caster)) errs.push(`class "${c.id}": caster "${c.caster}" is not valid`);
    checkLevels(c, 'cantripsKnown', errs);
    checkLevels(c, 'maxSpellLevel', errs);
    if (blank(c.hotbarIcon)) errs.push(`class "${c.id}": hotbarIcon is empty`);
    if (blank(c.plainIcon)) errs.push(`class "${c.id}": plainIcon is empty`);
  }

  checkIds('spell', d.spells, errs);
  for (const s of d.spells) {
    const at = `spell "${s.id}"`;
    if (blank(s.name)) errs.push(`${at}: name is empty`);
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
    if (!f.source || !SOURCES.includes(f.source.kind)) errs.push(`${at}: source.kind is not valid`);
    else if (f.source.kind === 'class' && !CLASS_IDS.includes(f.source.id)) errs.push(`${at}: source has unknown class "${f.source.id}"`);
    if (!isInt(f.level, 1, 20)) errs.push(`${at}: level ${f.level} must be an integer 1-20`);
    if (f.cost !== 'free' && !COSTS.includes(f.cost)) errs.push(`${at}: cost is not valid`);
    if (!Array.isArray(f.description) || f.description.length === 0 || f.description.some(blank)) errs.push(`${at}: description must be non-empty paragraphs`);
    if (!isInt(f.page, 1, 1000)) errs.push(`${at}: page must be a positive integer`);
  }

  return errs;
}
