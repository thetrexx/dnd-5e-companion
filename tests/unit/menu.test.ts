import { menuRows } from '../../src/logic/menu';

test('wizard 3 rows', () => {
  const rows = menuRows('wizard', 3);
  expect(rows.map(r => r.label)).toEqual(['Actions','Bonus Actions','Reactions','Wizard Actions','MAGIC','Cantrips','Level 1 Spells','Level 2 Spells','Level 3 Spells','Level 4 Spells','Level 5 Spells','Level 6 Spells','Level 7 Spells','Level 8 Spells','Level 9 Spells']);
  expect(rows.find(r => r.label === 'Level 3 Spells')!.dimmed).toBe(true);
  expect(rows.find(r => r.label === 'Level 2 Spells')!.dimmed).toBeFalsy();
  expect(rows[0].icon).toEqual({ type: 'img', src: expect.stringContaining('Action_Icon.png') });
  expect(rows.find(r => r.label === 'Level 1 Spells')!.icon).toEqual({ type: 'slot', level: 1 });
  expect(rows.find(r => r.label === 'Level 1 Spells')!.target).toEqual({ page: 'spells', cls: 'wizard', level: 3, section: 'lvl-1' });
  expect(rows.find(r => r.label === 'Level 1 Spells')!.motif).toBe('wizard');
  expect(rows.find(r => r.label === 'Cantrips')!.dimmed).toBeFalsy();
  expect(rows.find(r => r.label === 'MAGIC')!.target).toBeUndefined();
  expect(rows.filter(r => r.kind !== 'separator').every(r => r.icon)).toBe(true);
  expect(rows.every(r => !('hint' in r))).toBe(true);
});

test('fighter has no magic rows', () => {
  expect(menuRows('fighter', 5).map(r => r.label)).toEqual(['Actions','Bonus Actions','Reactions','Fighter Actions']);
});
