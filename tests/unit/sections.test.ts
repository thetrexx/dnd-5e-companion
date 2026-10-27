import type { Feature, Spell } from '../../src/data/types';
import { DATA } from '../../src/data';
import { listSpells } from '../../src/logic/rules';
import { spellSections, actionSections, joinTag } from '../../src/logic/sections';

test('joinTag', () => {
  expect(joinTag('Domain', undefined)).toBe('Domain');
  expect(joinTag(undefined, 'Ritual only')).toBe('Ritual only');
  expect(joinTag('Domain', '')).toBe('Domain');
  expect(joinTag('Star Map', 'Free cast')).toBe('Star Map · Free cast');
  expect(joinTag()).toBeUndefined();
});
test('browse view lists the effective subclass feature spells, tagged with the feature name', () => {
  const cantrips = spellSections('rogue', 3, 'arcane-trickster').find(s => s.id === 'cantrips')!;
  expect(cantrips.tags!['mage-hand']).toBe('Mage Hand Legerdemain');
});
test('non-casters get no spell sections from feature spells', () => {
  expect(spellSections('barbarian', 3, 'path-of-the-totem-warrior')).toEqual([]);
  expect(spellSections('monk', 3, 'way-of-shadow')).toEqual([]);
});

test('wizard spell sections', () => {
  const sp = spellSections('wizard', 3);
  expect(sp.map(s => s.id)).toEqual(['cantrips','lvl-1','lvl-2','lvl-3','lvl-4','lvl-5','lvl-6','lvl-7','lvl-8','lvl-9']);
  expect(sp.find(s => s.id === 'lvl-3')!.locked).toBe('Unlocks at Wizard 5');
  expect(sp.find(s => s.id === 'lvl-2')!.locked).toBeUndefined();
  expect(sp.find(s => s.id === 'lvl-2')!.subtitle).toBe('Wizard');
  expect(sp.flatMap(s => s.items).every(i => (i as Spell).classes.includes('wizard'))).toBe(true);
});

test('fighter has no spell sections', () => {
  expect(spellSections('fighter', 5)).toEqual([]);
});

test('fighter 1 action sections', () => {
  const ac = actionSections('fighter', 1);
  expect(ac.map(s => s.id)).toEqual(['actions','bonus','reactions','class','opt-fighting-style']);
  expect(ac.find(s => s.id === 'class')!.title).toBe('Fighter Actions');
  expect(ac.find(s => s.id === 'class')!.items.map(i => i.name)).toEqual(['Second Wind']);
  expect(ac.flatMap(s => s.items).some(i => 'school' in i)).toBe(false);
});

test('subclass spell sections', () => {
  const ekSp = spellSections('fighter', 3, 'eldritch-knight').flatMap(s => s.items) as Spell[];
  expect(ekSp.length).toBeGreaterThan(0);
  expect(ekSp.filter(s => s.level > 0).every(s => ['Abjuration', 'Evocation'].includes(s.school))).toBe(true);
  // cantrips have no school limit
  expect(ekSp.some(s => s.level === 0 && !['Abjuration', 'Evocation'].includes(s.school))).toBe(true);
  const land = spellSections('druid', 3, 'circle-of-the-land').find(s => s.id === 'lvl-2')!;
  expect(land.items.some(i => i.id === 'hold-person')).toBe(true);
  expect(land.items.filter(i => i.id === 'hold-person')).toHaveLength(1);
  expect(land.tags?.['hold-person']).toBe('Circle · Arctic');
  expect(spellSections('druid', 3).find(s => s.id === 'lvl-2')!.tags).toBeUndefined();
});

test('option and subclass action sections', () => {
  const fa = actionSections('fighter', 1);
  expect(fa.find(s => s.id === 'opt-fighting-style')!.items.map(i => i.id)).toEqual(['fighting-style-protection']);
  expect(fa.find(s => s.id === 'opt-fighting-style')!.title).toBe('Fighting Style');
  expect(actionSections('fighter', 3, 'eldritch-knight').find(s => s.id === 'subclass')!.items.map(i => i.id)).toContain('weapon-bond');
  expect(actionSections('fighter', 3).some(s => s.id === 'subclass')).toBe(false);
  expect(actionSections('fighter', 3, 'champion').some(s => s.id === 'subclass')).toBe(false);
  expect(actionSections('druid', 3, 'circle-of-the-land').some(s => s.id === 'opt-land-terrain')).toBe(false);
});
test('monk ki pool shows on the actions page', () => {
  const ki = actionSections('monk', 5).find(s => s.id === 'class')!.items.find(i => i.id === 'ki') as Feature | undefined;
  expect(ki).toBeTruthy();
  expect(ki!.scaling!.find(s => s.label === 'Ki Points')!.values[4]).toBe('5');
});

test('locked spell levels list future subclass grants', () => {
  const lvl3 = spellSections('cleric', 1, 'life-domain').find(s => s.id === 'lvl-3')!;
  expect(lvl3.locked).toBeTruthy();
  expect(lvl3.items.map(i => i.id)).toContain('beacon-of-hope');
  expect(lvl3.tags?.['beacon-of-hope']).toBe('Domain');
});

test('land tag joins every terrain granting a spell', () => {
  const l2 = spellSections('druid', 3, 'circle-of-the-land').find(s => s.id === 'lvl-2')!;
  expect(l2.tags?.['spike-growth']).toBe('Circle · Arctic, Mountain');
  expect(l2.tags?.['hold-person']).toBe('Circle · Arctic');
});

test('arcane trickster cantrips include mage hand', () => {
  const at = spellSections('rogue', 3, 'arcane-trickster');
  expect(at.find(s => s.id === 'cantrips')!.items.map(i => i.id)).toContain('mage-hand');
  expect(at.filter(s => s.id !== 'cantrips').flatMap(s => s.items as Spell[]).every(s => ['Enchantment', 'Illusion'].includes(s.school))).toBe(true);
});

test('subclass casters omit spell levels they never reach', () => {
  const ek = spellSections('fighter', 3, 'eldritch-knight');
  expect(ek.map(s => s.id)).toEqual(['cantrips', 'lvl-1', 'lvl-2', 'lvl-3', 'lvl-4']);
  expect(ek.find(s => s.id === 'lvl-4')!.locked).toBe('Unlocks at Fighter 19');
  expect(spellSections('rogue', 20, 'arcane-trickster').some(s => s.id === 'lvl-5')).toBe(false);
});

test('listSpells: subclass caster list matches its spell sections', () => {
  const cls = (id: string) => DATA.classes.find(c => c.id === id)!;
  const ek = DATA.subclasses.find(s => s.id === 'eldritch-knight')!;
  const fromSections = spellSections('fighter', 20, 'eldritch-knight').flatMap(s => s.items.map(i => i.id));
  // sections drop levels above the subclass ceiling; listSpells keeps the whole filtered list
  expect(listSpells(cls('fighter'), ek).filter(s => s.level <= 4).map(s => s.id).sort()).toEqual([...new Set(fromSections)].sort());
  expect(listSpells(cls('wizard')).map(s => s.id)).toContain('fireball');
});
