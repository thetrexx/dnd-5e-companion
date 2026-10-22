import { autoSpells, grantSlots } from '../../src/character/grants';
import { optionSlots, prune } from '../../src/character/options';
import { emptyCharacter } from '../../src/character/types';
import type { CharClass, Character } from '../../src/character/types';
import { DATA } from '../../src/data';

const ch = (classes: CharClass[], extra: Partial<Character> = {}): Character => ({ ...emptyCharacter(), classes, ...extra });

test('option slots with counts and prerequisites', () => {
  const c = ch([{ cls: 'warlock', level: 5 }], { options: ['pact-boon-pact-of-the-tome'] });
  const inv = optionSlots(c).find(s => s.group.id === 'eldritch-invocations')!;
  expect(inv.count).toBe(3);
  expect(inv.choices.every(f => (f.prereq?.level ?? 1) <= 5)).toBe(true);
  expect(optionSlots(ch([{ cls: 'fighter', level: 10, sub: 'champion' }])).find(s => s.group.id === 'fighting-style')!.count).toBe(2);
  expect(optionSlots(ch([{ cls: 'wizard', level: 3 }], { race: 'dragonborn' })).map(s => s.group.id)).toEqual(['draconic-ancestry']);
  expect(optionSlots(ch([{ cls: 'sorcerer', level: 2 }])).some(s => s.group.id === 'metamagic')).toBe(false);
});
test('grant slots: race, feat, option, subclass', () => {
  const nd = DATA.subclasses.find(s => s.id === 'nature-domain')!.bonusSpells!.grants.findIndex(g => g.choose);
  const c = ch([{ cls: 'warlock', level: 3 }, { cls: 'cleric', level: 1, sub: 'nature-domain' }],
    { race: 'high-elf', feats: ['magic-initiate'], options: ['pact-boon-pact-of-the-tome'] });
  expect(grantSlots(c).map(s => [s.key, s.source.step, s.choose.count])).toEqual([
    ['race:high-elf:0', 'basics', 1],
    ['feat:magic-initiate:0', 'feats', 2], ['feat:magic-initiate:1', 'feats', 1],
    ['feature:pact-boon-pact-of-the-tome:0', 'options', 3],
    [`sub:nature-domain:${nd}`, 'spells', 1],
  ]);
  expect(grantSlots(c)[0].candidates.every(s => s.level === 0 && s.classes.includes('wizard'))).toBe(true);
});
test('automatic spells unlock by the right level', () => {
  const tief = autoSpells(ch([{ cls: 'barbarian', level: 3 }], { race: 'tiefling' }));
  expect(tief.map(a => [a.spell.id, a.unlocked])).toEqual([['thaumaturgy', true], ['hellish-rebuke', true], ['darkness', false]]);
  const land = autoSpells(ch([{ cls: 'druid', level: 3, sub: 'circle-of-the-land' }], { options: ['land-terrain-arctic'] }));
  expect(land.map(a => a.spell.id)).toContain('hold-person');
  expect(land.every(a => a.source.key === 'sub:circle-of-the-land')).toBe(true);
  expect(autoSpells(ch([{ cls: 'warlock', level: 1, sub: 'the-fiend' }]))).toEqual([]);
});
test('prune drops orphaned picks but keeps level-locked ones', () => {
  const c = ch([{ cls: 'warlock', level: 2 }], { options: ['eldritch-invocations-thirsting-blade', 'metamagic-twinned-spell'],
    spells: [{ id: 'cure-wounds', cls: 'cleric' }, { id: 'light', grant: 'race:high-elf:0' }, { id: 'hex', cls: 'warlock' }] });
  const p = prune(c);
  expect(p.options).toEqual(['eldritch-invocations-thirsting-blade']);
  expect(p.spells).toEqual([{ id: 'hex', cls: 'warlock' }]);
  expect(prune(p)).toBe(p);
});
