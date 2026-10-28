import { menuRows } from '../../src/logic/menu';
import type { ClassId } from '../../src/data/types';

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

test('artificer 1 casts: cantrips and level 1 lit, level 2 dimmed', () => {
  const rows = menuRows('artificer', 1);
  expect(rows.find(r => r.kind === 'cantrips')!.dimmed).toBe(false);
  expect(rows.find(r => r.label === 'Level 1 Spells')!.dimmed).toBe(false);
  expect(rows.find(r => r.label === 'Level 2 Spells')!.dimmed).toBe(true);
  // like paladin, a class caster keeps all nine rows; above its table they stay dimmed
  expect(menuRows('artificer', 20).filter(r => r.kind === 'spells').map(r => r.dimmed)).toEqual([false, false, false, false, false, true, true, true, true]);
});

test('alchemist 15 has heal on level 6', () => {
  expect(menuRows('artificer', 15, 'alchemist').find(r => r.label === 'Level 6 Spells')!.dimmed).toBe(false);
  expect(menuRows('artificer', 15, 'armorer').find(r => r.label === 'Level 6 Spells')!.dimmed).toBe(true);
  // not before Chemical Mastery
  expect(menuRows('artificer', 14, 'alchemist').find(r => r.label === 'Level 6 Spells')!.dimmed).toBe(true);
  // the rows above stay dimmed
  expect(menuRows('artificer', 15, 'alchemist').find(r => r.label === 'Level 7 Spells')!.dimmed).toBe(true);
});
test('an auto-granted spell lights its level row', () => {
  const row = (cls: ClassId, lvl: number, sub: string, label: string) => menuRows(cls, lvl, sub).find(r => r.label === label)!.dimmed;
  // Ethereal Step's etherealness (7th level) for a Horizon Walker 7
  expect(row('ranger', 7, 'horizon-walker', 'Level 7 Spells')).toBe(false);
  // Chemical Mastery's greater restoration (5th level) for an Alchemist 15, above its slots
  expect(row('artificer', 15, 'alchemist', 'Level 5 Spells')).toBe(false);
  // at 17 level 5 is within the artificer's slots anyway
  expect(row('artificer', 17, 'alchemist', 'Level 5 Spells')).toBe(false);
  // no such grant for an Armorer 15
  expect(row('artificer', 15, 'armorer', 'Level 5 Spells')).toBe(true);
});
test('patron spells are pickable, not granted: they light no row', () => {
  // a warlock's patron rows never reach above its slots; the rule is per level and excludes patron grants
  expect(menuRows('warlock', 1, 'the-fiend').filter(r => r.kind === 'spells').map(r => r.dimmed)).toEqual([false, true, true, true, true, true, true, true, true]);
});

test('a granted cantrip lights the Cantrips row of a class with none', () => {
  expect(menuRows('ranger', 3, 'swarmkeeper').find(r => r.kind === 'cantrips')!.dimmed).toBe(false);
  expect(menuRows('ranger', 3, 'hunter').find(r => r.kind === 'cantrips')!.dimmed).toBe(true);
});
