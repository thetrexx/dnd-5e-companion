import { readFileSync } from 'node:fs';
import { DATA } from '../../src/data';
import { phbId, type SpellFacts } from '../../scripts/extract/spell-facts';
import { diceRange } from '../../src/logic/card';
import { grantSlots } from '../../src/character/grants';
import { emptyCharacter, type Character } from '../../src/character/types';

const built = (lo: number, hi: number) => DATA.spells.filter(s => s.level >= lo && s.level <= hi && s.description.length > 0).length;
const facts = (lo: number, hi: number) =>
  (JSON.parse(readFileSync('scripts/extract/spell-facts.json', 'utf8')) as SpellFacts[]).filter(s => s.level >= lo && s.level <= hi).length;

test('batch 5a complete', () => expect(built(0, 1)).toBe(facts(0, 1)));
test('batch 5b complete', () => expect(built(2, 3)).toBe(facts(2, 3)));
test('batch 5c complete', () => expect(built(4, 6)).toBe(facts(4, 6)));
test('batch 5d complete', () => expect(built(7, 9)).toBe(facts(7, 9)));
test('every spell is built (361 PHB + 95 XGE + 21 TCE)', () => expect(DATA.spells).toHaveLength(477));
test('confusion keeps its table', () => {
  const d = DATA.spells.find(s => s.id === 'confusion')!.description.join('\n');
  for (const row of ['1: ', '2-6: ', '7-8: ', '9-10: ']) expect(d).toContain(row);
});

const xge = DATA.spells.filter(s => s.book === 'xge');
test('xanathar band built', () => {
  for (const id of ['toll-the-dead', 'ice-knife', 'catapult', 'chaos-bolt', 'absorb-elements', 'word-of-radiance'])
    expect(DATA.spells.find(s => s.id === id), id).toMatchObject({ book: 'xge', textSource: 'summary' });
});
test('xanathar band levels 2-4 built', () => {
  for (const id of ['dragons-breath', 'shadow-blade', 'catnap', 'thunder-step', 'summon-greater-demon', 'sickening-radiance', 'find-greater-steed', 'maximilians-earthen-grasp', 'melfs-minute-meteors'])
    expect(DATA.spells.find(s => s.id === id), id).toMatchObject({ book: 'xge', textSource: 'summary' });
  expect(xge.filter(s => s.level >= 2 && s.level <= 4)).toHaveLength(34);
});
test('xanathar levels 2-4 facts', () => {
  const sp = (id: string) => DATA.spells.find(s => s.id === id);
  expect(sp('shadow-blade')).toMatchObject({ level: 2, school: 'Illusion', page: 164, summary: { resolution: 'attack', damage: { dice: '2d8', type: 'Psychic' } } });
  expect(sp('thunder-step')).toMatchObject({ level: 3, page: 168, summary: { resolution: 'save', save: 'con', damage: { dice: '3d10', type: 'Thunder' } } });
  expect(sp('find-greater-steed')).toMatchObject({ level: 4, classes: ['paladin'] });
  expect(sp('summon-greater-demon')!.classes.slice().sort()).toEqual(['warlock', 'wizard']);
  expect(sp('healing-spirit')!.summary?.damage).toMatchObject({ dice: '1d6', healing: true });
  expect(sp('shadow-of-moil')!.components.m).toMatchObject({ costGp: 150, consumed: false });
});
test('xanathar band levels 5-9 built', () => {
  for (const id of ['synaptic-static', 'steel-wind-strike', 'mass-polymorph', 'psychic-scream', 'abi-dalzims-horrid-wilting', 'tensers-transformation', 'temple-of-the-gods', 'investiture-of-flame', 'create-homunculus'])
    expect(DATA.spells.find(s => s.id === id), id).toMatchObject({ book: 'xge', textSource: 'summary' });
  expect(xge.filter(s => s.level >= 5)).toHaveLength(39);
  expect(xge).toHaveLength(95);
});
test('xanathar levels 5-9 facts', () => {
  const sp = (id: string) => DATA.spells.find(s => s.id === id);
  expect(sp('synaptic-static')).toMatchObject({ level: 5, school: 'Enchantment', page: 167, summary: { resolution: 'save', save: 'int', damage: { dice: '8d6', type: 'Psychic' } } });
  expect(sp('synaptic-static')!.classes.slice().sort()).toEqual(['bard', 'sorcerer', 'warlock', 'wizard']);
  expect(sp('steel-wind-strike')).toMatchObject({ level: 5, page: 166, summary: { resolution: 'attack', damage: { dice: '6d10', type: 'Force' } } });
  expect(sp('steel-wind-strike')!.classes.slice().sort()).toEqual(['ranger', 'wizard']);
  expect(sp('holy-weapon')!.classes.slice().sort()).toEqual(['cleric', 'paladin']);
  expect(sp('temple-of-the-gods')).toMatchObject({ level: 7, classes: ['cleric'] });
  expect(sp('mass-polymorph')).toMatchObject({ level: 9, school: 'Transmutation', page: 160 });
  expect(sp('psychic-scream')).toMatchObject({ level: 9, school: 'Enchantment', page: 163, summary: { resolution: 'save', save: 'int', damage: { dice: '14d6', type: 'Psychic' } } });
  expect(sp('psychic-scream')!.classes.slice().sort()).toEqual(['bard', 'sorcerer', 'warlock', 'wizard']);
});
test('new spells reach choice grants', () => {
  const death = { ...emptyCharacter(), classes: [{ cls: 'cleric', level: 1, sub: 'death-domain' }] } as Character;
  expect(grantSlots(death).find(s => s.key.startsWith('sub:death-domain'))!.candidates.map(s => s.id)).toContain('toll-the-dead');
  const ritual = { ...emptyCharacter(), classes: [{ cls: 'wizard', level: 1 }], feats: ['ritual-caster'] } as Character;
  expect(grantSlots(ritual).find(s => s.key === 'feat:ritual-caster:0')!.candidates.map(s => s.id)).toContain('ceremony');
  const tome = { ...emptyCharacter(), classes: [{ cls: 'warlock', level: 3 }], options: ['pact-boon-pact-of-the-tome', 'eldritch-invocations-book-of-ancient-secrets'] } as Character;
  expect(grantSlots(tome).find(s => s.key.startsWith('feature:eldritch-invocations-book-of-ancient-secrets'))!.candidates.map(s => s.id)).toContain('ceremony');
});
test('chaos bolt keeps its table, one row per paragraph', () => {
  const d = DATA.spells.find(s => s.id === 'chaos-bolt')!.description;
  for (const row of ['1: Acid', '2: Cold', '3: Fire', '4: Force', '5: Lightning', '6: Poison', '7: Psychic', '8: Thunder']) expect(d).toContain(row);
});
test('class lists stay grouped by spell level', () => {
  const lv = new Map((JSON.parse(readFileSync('scripts/extract/spell-facts.json', 'utf8')) as SpellFacts[]).map(f => [f.id, f.level]));
  const lists = JSON.parse(readFileSync('scripts/extract/spell-lists.json', 'utf8')) as Record<string, string[]>;
  for (const [cls, names] of Object.entries(lists)) {
    const levels = names.map(n => lv.get(phbId(n)) ?? -1);
    const outOfOrder = names.filter((n, i) => i > 0 && levels[i] < levels[i - 1]);
    expect(outOfOrder, cls).toEqual([]);
  }
});
test('every spell damage line parses', () => {
  for (const s of DATA.spells) if (s.summary?.damage) expect(() => diceRange(s.summary!.damage!.dice), s.id).not.toThrow();
});
test('xanathar spells are on class lists', () => { for (const s of xge) expect(s.classes.length, s.id).toBeGreaterThan(0); });
test('toll the dead facts', () => expect(DATA.spells.find(s => s.id === 'toll-the-dead')).toMatchObject({ level: 0, school: 'Necromancy', summary: { resolution: 'save', save: 'wis' } }));

const tce = DATA.spells.filter(s => s.book === 'tce');
test('21 tasha spells', () => { expect(tce).toHaveLength(21); expect(DATA.spells).toHaveLength(477); });
test('scag cantrips cite tasha', () => {
  for (const id of ['booming-blade', 'green-flame-blade', 'lightning-lure', 'sword-burst'])
    expect(DATA.spells.find(s => s.id === id), id).toMatchObject({ book: 'tce', level: 0 });
});
test('summons name their stat block', () => {
  for (const s of tce.filter(x => x.id.startsWith('summon-'))) expect(s.description.join(' '), s.id).toMatch(/Stat block: Tasha's p\. \d+/);
});
test('tasha lists', () => {
  expect(DATA.spells.find(s => s.id === 'summon-beast')!.classes.sort()).toEqual(['druid', 'ranger']);
  expect(DATA.spells.find(s => s.id === 'spirit-shroud')!.classes.sort()).toEqual(['cleric', 'paladin', 'warlock', 'wizard']);
});
test('expanded list is optional data', () => {
  const s = DATA.spells.find(x => x.id === 'aura-of-vitality')!;
  expect(s.optionalLists).toEqual(expect.arrayContaining(['cleric', 'druid']));
  expect(s.classes).not.toContain('cleric');
  // a class already on the base list is never repeated in optionalLists
  expect(DATA.spells.every(sp => !(sp.optionalLists ?? []).some(c => sp.classes.includes(c)))).toBe(true);
  expect(DATA.spells.find(x => x.id === 'spirit-shroud')!.optionalLists).toBeUndefined();
});
