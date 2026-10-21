import { DATA } from '../../src/data';
import { CLASS_IDS } from '../../src/data/validate';
import { menuRows } from '../../src/logic/menu';

const c = (id: string) => DATA.classes.find(x => x.id === id)!;
const f = (id: string) => DATA.features.find(x => x.id === id);
test('12 classes', () => expect(DATA.classes.map(x => x.id).sort()).toEqual([...CLASS_IDS].sort()));
test('tables', () => {
  expect(c('warlock').maxSpellLevel).toEqual([1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,9,9]);
  expect(c('paladin').maxSpellLevel![0]).toBe(0); expect(c('paladin').maxSpellLevel![1]).toBe(1);
  expect(c('sorcerer').spellsKnown![0]).toBe(2); expect(c('bard').cantripsKnown![0]).toBe(2);
  expect(c('cleric')).toMatchObject({ subclassLevel: 1, subclassLabel: 'Divine Domain', prepared: { half: false }, spellAbility: 'wis' });
});
test('warlock arcanum dimming', () => {
  const dim = (lvl: number, n: number) => menuRows('warlock', lvl).find(r => r.label === `Level ${n} Spells`)!.dimmed;
  expect(dim(11, 6)).toBe(false); expect(dim(11, 7)).toBe(true); expect(dim(13, 7)).toBe(false);
  expect(dim(15, 8)).toBe(false); expect(dim(16, 9)).toBe(true); expect(dim(17, 9)).toBe(false);
});
test('must-have martial features', () => {
  for (const id of ['rage', 'reckless-attack', 'second-wind', 'action-surge', 'indomitable', 'flurry-of-blows',
    'patient-defense', 'step-of-the-wind', 'deflect-missiles', 'stunning-strike', 'lay-on-hands', 'divine-sense',
    'divine-smite', 'sneak-attack', 'cunning-action', 'uncanny-dodge']) expect(f(id), id).toBeTruthy();
  expect(f('rage')!.scaling!.find(s => s.label === 'Rage Damage')!.values[8]).toBe('+3');
  expect(f('sneak-attack')!.scaling![0].values[4]).toBe('3d6');
  expect(f('uncanny-dodge')).toMatchObject({ cost: 'reaction', level: 5 });
});
test('own-words feature cards', () => {
  for (const x of DATA.features.filter(y => y.source.kind === 'generic' || y.source.id === 'fighter' || ['barbarian','monk','rogue','paladin','ranger'].includes(y.source.id)))
    expect(x.textSource, x.id).toBe('summary');
});
test('must-have caster features', () => {
  for (const id of ['bardic-inspiration', 'countercharm', 'song-of-rest', 'turn-undead', 'divine-intervention',
    'wild-shape', 'font-of-magic', 'arcane-recovery', 'eldritch-master', 'sorcery-points', 'channel-divinity']) expect(f(id), id).toBeTruthy();
  expect(f('bardic-inspiration')!.scaling!.find(s => s.label === 'Die')!.values).toEqual(
    ['d6','d6','d6','d6','d8','d8','d8','d8','d8','d10','d10','d10','d10','d10','d12','d12','d12','d12','d12','d12']);
  expect(f('bardic-inspiration')!.cost).toBe('bonus');
  expect(f('wild-shape')!.scaling!.find(s => s.label === 'Max CR')!.values[7]).toBe('1');
  expect(f('sorcery-points')!.scaling![0].values[19]).toBe('20');
  expect(f('channel-divinity')!.scaling![0].values[17]).toBe('3');
});
test('every feature is an own-words summary', () => {
  for (const x of DATA.features) expect(x.textSource, x.id).toBe('summary');
});
