import type { Spell } from '../../src/data/types';
import { spellSections, actionSections } from '../../src/logic/sections';

test('wizard spell sections', () => {
  const sp = spellSections('wizard', 3);
  expect(sp.map(s => s.id)).toEqual(['cantrips','lvl-1','lvl-2','lvl-3']);
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
  expect(ac.map(s => s.id)).toEqual(['actions','bonus','reactions','class']);
  expect(ac.find(s => s.id === 'class')!.title).toBe('Fighter Actions');
  expect(ac.find(s => s.id === 'class')!.items.map(i => i.name)).toEqual(['Second Wind']);
  expect(ac.flatMap(s => s.items).some(i => 'school' in i)).toBe(false);
});
