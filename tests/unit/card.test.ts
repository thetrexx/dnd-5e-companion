import { DATA } from '../../src/data';
import { levelLine, damageLine, tags, costBar, componentInfo, diceRange } from '../../src/logic/card';

const get = (id: string) => DATA.spells.find(s => s.id === id)!;
const mm = get('magic-missile');

test('levelLine', () => {
  expect(levelLine(mm)).toBe('Level 1 Evocation Spell');
  expect(levelLine(get('fire-bolt'))).toBe('Evocation Cantrip');
});
test('diceRange', () => {
  expect(diceRange('1d4+1')).toEqual({ min: 2, max: 5 });
  expect(diceRange('8d6')).toEqual({ min: 8, max: 48 });
});
test('damageLine', () => {
  expect(damageLine(mm)).toEqual({ headline: '6~15 Damage', detail: '3 darts × 1d4+1 Force' });
  expect(damageLine(get('fire-bolt'))).toEqual({ headline: '1~10 Damage', detail: '1d10 Fire' });
  expect(damageLine(get('cure-wounds'))!.headline).toMatch(/Healing$/);
  expect(damageLine(get('shield'))).toBeNull();
});
test('tags', () => {
  expect(tags(mm)).toEqual(['120 ft', 'Instantaneous', 'Auto-hit']);
  expect(tags(get('thunderwave'))).toContain('CON save');
  expect(tags(get('fire-bolt'))).toContain('Attack roll');
  expect(tags(get('guidance'))).toEqual(['Touch', 'Up to 1 minute', 'Concentration']);
});
test('costBar', () => {
  expect(costBar(get('shield'))).toMatchObject({ cost: 'reaction', label: 'Reaction', slot: 'Level 1 Spell Slot' });
  expect(costBar(get('fire-bolt')).slot).toBeUndefined();
  expect(costBar(get('misty-step')).label).toBe('Bonus Action');
});
test('componentInfo', () => {
  const fb = componentInfo(get('fireball'));
  expect(fb.m!.body).toContain('bat guano');
  expect(fb.m!.body).toContain('A component pouch or spellcasting focus can stand in for it.');
  expect(fb.v!.title).toBe('Verbal');
  expect(componentInfo(mm).m).toBeNull();
  expect(componentInfo(get('misty-step')).s).toBeNull();
});
test('material cost and consumed copy', () => {
  const base = get('fireball');
  const mk = (m: { text: string; costGp?: number; consumed: boolean }) =>
    componentInfo({ ...base, components: { ...base.components, m } }).m!.body;
  expect(mk({ text: 'a pearl', costGp: 100, consumed: true })).toBe('a pearl. Costs 100 gp. The spell consumes it.');
  expect(mk({ text: 'a pearl', costGp: 100, consumed: false })).toBe('a pearl. Costs 100 gp.');
  expect(mk({ text: 'a pearl', consumed: true })).toBe('a pearl. The spell consumes it.');
});
