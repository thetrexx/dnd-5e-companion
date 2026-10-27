import { autoSpells, grantSlots, grantSources, unlockText } from '../../src/character/grants';
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
  expect(optionSlots(ch([{ cls: 'wizard', level: 3 }], { race: 'dragonborn' })).map(s => s.group.id)).toEqual(['optional-wizard', 'draconic-ancestry']);
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
test('prune keeps subclass grant picks when the level drops, clears a foreign subclass', () => {
  const i = DATA.subclasses.find(s => s.id === 'circle-of-the-land')!.bonusSpells!.grants.findIndex(g => g.choose);
  const c = ch([{ cls: 'druid', level: 1, sub: 'circle-of-the-land' }], { spells: [{ id: 'guidance', grant: `sub:circle-of-the-land:${i}` }] });
  expect(prune(c)).toBe(c);
  const bad = ch([{ cls: 'druid', level: 3, sub: 'champion' }]);
  expect(prune(bad).classes).toEqual([{ cls: 'druid', level: 3, sub: undefined }]);
});
test('unlock copy: class-owned by class level, the rest by character level', () => {
  const c = ch([{ cls: 'warlock', level: 2 }], { race: 'tiefling', options: ['pact-boon-pact-of-the-tome'] });
  const src = (key: string) => grantSources(c).find(s => s.key === key)!;
  expect(unlockText(src('race:tiefling'), 5)).toBe('Unlocks at character level 5');
  expect(unlockText(src('feature:pact-boon-pact-of-the-tome'), 3)).toBe('Unlocks at Warlock 3');
});

describe('shared option pools count once', () => {
  // the Tasha's optional groups (tick-any) are left out: these tests are about shared pools
  const slots = (c: Character) => optionSlots(c).filter(x => !x.group.optional);
  const mk = (o: Partial<Character>): Character => ({ ...emptyCharacter(), ...o });
  const fp = mk({ classes: [{ cls: 'fighter', level: 1 }, { cls: 'paladin', level: 2 }], options: ['fighting-style-defense'] });
  test('one style counts once', () => {
    const [f, p] = slots(fp);
    expect(f.chosen).toEqual(['fighting-style-defense']);
    expect(p.chosen).toEqual([]);
    expect(p.taken).toEqual(['fighting-style-defense']);
  });
  test('two styles fill one slot each', () => {
    const s = slots({ ...fp, options: ['fighting-style-defense', 'fighting-style-dueling'] });
    expect(s.map(x => x.chosen)).toEqual([['fighting-style-defense'], ['fighting-style-dueling']]);
  });
  test('one ancestry may fill race and sorcerer slots', () => {
    const s = slots(mk({ race: 'dragonborn', classes: [{ cls: 'sorcerer', level: 1, sub: 'draconic-bloodline' }], options: ['draconic-ancestry-red'] }));
    expect(s.map(x => x.chosen)).toEqual([['draconic-ancestry-red'], ['draconic-ancestry-red']]);
  });
  const within = (s: ReturnType<typeof optionSlots>) => s.map(x => [x.chosen.length, x.count]);
  test('a style only one slot offers moves the other pick out of its way', () => {
    const [f, p] = slots({ ...fp, options: ['fighting-style-defense', 'fighting-style-two-weapon-fighting'] });
    expect(f.chosen).toEqual(['fighting-style-two-weapon-fighting']);
    expect(p.chosen).toEqual(['fighting-style-defense']);
    expect(f.taken).toEqual(['fighting-style-defense']);
    expect(p.taken).toEqual([]);
  });
  test('fighter listed first and a swords bard share styles without an over-pick', () => {
    const s = slots(mk({ classes: [{ cls: 'fighter', level: 1 }, { cls: 'bard', level: 3, sub: 'college-of-swords' }], options: ['fighting-style-dueling', 'fighting-style-archery'] }));
    const f = s.find(x => x.cls === 'fighter')!, b = s.find(x => x.cls === 'bard')!;
    expect(f.chosen).toEqual(['fighting-style-archery']);
    expect(b.chosen).toEqual(['fighting-style-dueling']);
    expect(b.taken).toEqual([]);
  });
  test('two ancestries fill race and sorcerer one each', () => {
    const s = slots(mk({ race: 'dragonborn', classes: [{ cls: 'sorcerer', level: 1, sub: 'draconic-bloodline' }], options: ['draconic-ancestry-blue', 'draconic-ancestry-red'] }));
    expect(within(s)).toEqual([[1, 1], [1, 1]]);
    expect(s.flatMap(x => x.chosen).sort()).toEqual(['draconic-ancestry-blue', 'draconic-ancestry-red']);
  });
  test('three slots: a chain of moves places every style', () => {
    const s = slots(mk({ classes: [{ cls: 'fighter', level: 1 }, { cls: 'paladin', level: 2 }, { cls: 'ranger', level: 2 }],
      options: ['fighting-style-protection', 'fighting-style-dueling', 'fighting-style-great-weapon-fighting'] }))
      .filter(x => (x.group.from ?? x.group.id) === 'fighting-style');
    expect(within(s)).toEqual([[1, 1], [1, 1], [1, 1]]);
    expect(s.map(x => x.chosen)).toEqual([['fighting-style-great-weapon-fighting'], ['fighting-style-protection'], ['fighting-style-dueling']]);
  });
  test('a real over-pick still shows as more than the count', () => {
    const s = slots({ ...fp, options: ['fighting-style-defense', 'fighting-style-dueling', 'fighting-style-great-weapon-fighting'] });
    expect(s.map(x => x.chosen)).toEqual([['fighting-style-defense', 'fighting-style-great-weapon-fighting'], ['fighting-style-dueling']]);
    expect(slots(mk({ classes: [{ cls: 'fighter', level: 1 }], options: ['fighting-style-defense', 'fighting-style-dueling'] }))[0].chosen).toHaveLength(2);
  });
});
