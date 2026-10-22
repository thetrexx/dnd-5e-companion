import type { Route } from '../../src/data/types';
import { backgroundClass } from '../../src/logic/background';
import { emptyCharacter, type CharClass } from '../../src/character/types';

const ch = (classes: CharClass[]) => ({ ...emptyCharacter(), classes });
test('plain class routes use that class', () => {
  expect(backgroundClass({ page: 'menu', cls: 'bard', level: 3 }, null)).toBe('bard');
  expect(backgroundClass({ page: 'card', kind: 'spell', id: 'sleep', cls: 'wizard', level: 1 }, null)).toBe('wizard');
  expect(backgroundClass({ page: 'level', cls: 'monk' }, null)).toBe('monk');
});
test('character menu: most levels, tie to the first class', () => {
  expect(backgroundClass({ page: 'me' }, ch([{ cls: 'sorcerer', level: 3 }, { cls: 'druid', level: 5 }]))).toBe('druid');
  expect(backgroundClass({ page: 'me' }, ch([{ cls: 'sorcerer', level: 3 }, { cls: 'druid', level: 3 }]))).toBe('sorcerer');
});
test('inside a class section, that class', () => {
  const c = ch([{ cls: 'sorcerer', level: 5 }, { cls: 'druid', level: 2 }]);
  expect(backgroundClass({ page: 'me-spells', section: 'lvl-1-druid' }, c)).toBe('druid');
  expect(backgroundClass({ page: 'me-spells', section: 'cantrips-druid' }, c)).toBe('druid');
  expect(backgroundClass({ page: 'me-actions', section: 'class-druid' }, c)).toBe('druid');
  expect(backgroundClass({ page: 'me-actions', section: 'subclass-druid' }, c)).toBe('druid');
  expect(backgroundClass({ page: 'me-spells', section: 'cantrips-race-tiefling' }, c)).toBe('sorcerer');
  expect(backgroundClass({ page: 'me-spells', section: 'lvl-2-feature-shadow-arts' }, c)).toBe('sorcerer');
  expect(backgroundClass({ page: 'me-actions', section: 'race' }, c)).toBe('sorcerer');
  expect(backgroundClass({ page: 'me-actions' }, c)).toBe('sorcerer');
});
test('a section naming a class the character lacks falls back to the menu class', () => {
  expect(backgroundClass({ page: 'me-actions', section: 'class-druid' }, ch([{ cls: 'bard', level: 2 }]))).toBe('bard');
});
test('option sections belong to the class owning the slot', () => {
  const c = ch([{ cls: 'druid', level: 5 }, { cls: 'sorcerer', level: 3 }]);
  expect(backgroundClass({ page: 'me-actions', section: 'opt-metamagic' }, c)).toBe('sorcerer');
  expect(backgroundClass({ page: 'me-card', kind: 'feature', id: 'metamagic-careful-spell', section: 'opt-metamagic' }, c)).toBe('sorcerer');
});
test('a feature card without a section: the class owning the feature', () => {
  const c = ch([{ cls: 'sorcerer', level: 5 }, { cls: 'druid', level: 2, sub: 'circle-of-the-moon' }]);
  expect(backgroundClass({ page: 'me-card', kind: 'feature', id: 'wild-shape' }, c)).toBe('druid');
  expect(backgroundClass({ page: 'me-card', kind: 'feature', id: 'combat-wild-shape' }, c)).toBe('druid');
  expect(backgroundClass({ page: 'me-card', kind: 'feature', id: 'metamagic-careful-spell' }, ch([{ cls: 'druid', level: 5 }, { cls: 'sorcerer', level: 3 }]))).toBe('sorcerer');
  expect(backgroundClass({ page: 'me-card', kind: 'spell', id: 'shillelagh' }, c)).toBe('sorcerer');
  expect(backgroundClass({ page: 'me-card', kind: 'feature', id: 'eldritch-master' }, c)).toBe('sorcerer');
});
test('no class screens', () => {
  for (const r of [{ page: 'start' }, { page: 'settings' }, { page: 'edit', step: 'basics' }] as Route[]) expect(backgroundClass(r, null)).toBe('none');
  expect(backgroundClass({ page: 'me' }, null)).toBe('none');
  expect(backgroundClass({ page: 'me-spells', section: 'lvl-1-druid' }, ch([]))).toBe('none');
});
