import { DATA } from '../../src/data';
import { validateDataset } from '../../src/data/validate';

test('fixtures are valid', () => expect(validateDataset(DATA)).toEqual([]));
test('catches bad records', () => {
  const bad = structuredClone(DATA);
  bad.spells.push({ ...bad.spells[0] });                 // duplicate id
  bad.spells[1].level = 10;                              // out of range
  bad.spells[2].classes = ['necromancer' as any];        // unknown class
  bad.features[0].name = '';                             // empty name
  const errs = validateDataset(bad);
  expect(errs.some(e => e.includes('duplicate'))).toBe(true);
  expect(errs.some(e => e.includes('level'))).toBe(true);
  expect(errs.some(e => e.includes('necromancer'))).toBe(true);
  expect(errs.some(e => e.includes('name'))).toBe(true);
});
