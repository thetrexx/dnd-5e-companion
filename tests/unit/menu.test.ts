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

test('subclass menu rows', () => {
  expect(menuRows('fighter', 3).some(r => r.kind === 'separator')).toBe(false);
  const ek = menuRows('fighter', 3, 'eldritch-knight');
  expect(ek.find(r => r.kind === 'spells' && r.label === 'Level 1 Spells')).toMatchObject({ dimmed: false, motif: 'wizard' });
  expect(ek.find(r => r.label === 'Level 2 Spells')?.dimmed).toBe(true);
  expect(ek.find(r => r.label === 'Level 1 Spells')!.target).toEqual({ page: 'spells', cls: 'fighter', level: 3, sub: 'eldritch-knight', section: 'lvl-1' });
  expect(ek.find(r => r.label === 'Cantrips')).toMatchObject({ dimmed: false, motif: 'wizard' });
  expect(menuRows('fighter', 3, 'champion').some(r => r.kind === 'separator')).toBe(false);
});

test('invalid subclass is dropped from rows', () => {
  const rows = menuRows('wizard', 1, 'school-of-evocation');
  expect(rows.every(r => !r.target || !('sub' in r.target))).toBe(true);
});

test('warlock slot rows use the warlock icon', () => {
  expect(menuRows('warlock', 1).find(r => r.kind === 'spells')!.icon).toMatchObject({ type: 'slot', warlock: true });
  expect(menuRows('wizard', 1).find(r => r.kind === 'spells')!.icon).toEqual({ type: 'slot', level: 1 });
});
test('class actions row targets the first non-empty class section', () => {
  const lock = (r: ReturnType<typeof menuRows>) => r.find(x => x.kind === 'class')!.target;
  expect(lock(menuRows('fighter', 1))).toMatchObject({ page: 'actions', section: 'class' });
  expect(lock(menuRows('warlock', 2))).toMatchObject({ page: 'actions', section: 'opt-eldritch-invocations' });
});

test('subclass casters stop at their highest spell level', () => {
  const ek = menuRows('fighter', 3, 'eldritch-knight').filter(r => r.kind === 'spells');
  expect(ek.map(r => r.label).at(-1)).toBe('Level 4 Spells');
  expect(menuRows('rogue', 20, 'arcane-trickster').filter(r => r.kind === 'spells')).toHaveLength(4);
  expect(menuRows('wizard', 1).filter(r => r.kind === 'spells')).toHaveLength(9);
});

test('a granted cantrip lights the Cantrips row of a class with none', () => {
  expect(menuRows('ranger', 3, 'swarmkeeper').find(r => r.kind === 'cantrips')!.dimmed).toBe(false);
  expect(menuRows('ranger', 3, 'hunter').find(r => r.kind === 'cantrips')!.dimmed).toBe(true);
});
