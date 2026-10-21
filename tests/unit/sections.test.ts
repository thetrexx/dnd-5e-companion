import type { Spell } from '../../src/data/types';
import { spellSections, actionSections } from '../../src/logic/sections';

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
  expect(ekSp.every(s => ['Abjuration', 'Evocation'].includes(s.school))).toBe(true);
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