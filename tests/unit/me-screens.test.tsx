import { cleanup, fireEvent, render } from '@testing-library/preact';
import { App } from '../../src/app';
import { saveCharacter } from '../../src/character/store';
import { emptyCharacter } from '../../src/character/types';
import { loadSettings } from '../../src/settings/settings';
import { MeCard } from '../../src/ui/screens/me/MeCard';
import { MeMenu } from '../../src/ui/screens/me/MeMenu';
import { MeSpells } from '../../src/ui/screens/me/MeSpells';
import { Start } from '../../src/ui/screens/Start';

const lyra = { ...emptyCharacter(), name: 'Lyra', race: 'tiefling', classes: [{ cls: 'sorcerer' as const, level: 5, sub: 'draconic-bloodline' }],
  spells: [{ id: 'fire-bolt', cls: 'sorcerer' as const }, { id: 'shield', cls: 'sorcerer' as const }, { id: 'fireball', cls: 'sorcerer' as const }] };

// jsdom has no scrolling
Element.prototype.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
beforeEach(() => { localStorage.clear(); location.hash = ''; });
test('menu shows name, class line and character rows', () => {
  const r = render(<MeMenu ch={lyra} />);
  expect(r.container.textContent).toContain('Lyra');
  expect(r.container.textContent).toContain('Sorcerer 5');
  expect(r.getByText('Tiefling Spells')).toBeTruthy();
  expect(r.getByText('Edit character').getAttribute('href')).toBe('#/edit/basics');
});
test('My/All toggle filters and persists', () => {
  const r = render(<MeSpells ch={lyra} />);
  expect(r.container.querySelectorAll('.ic.mine')).toHaveLength(0);
  fireEvent.click(r.getByRole('button', { name: 'All' }));
  expect(r.container.querySelectorAll('.ic.mine').length).toBeGreaterThan(0);
  expect(loadSettings().spellView).toBe('all');
});
test('jumping to a section My hides switches to All', () => {
  render(<MeSpells ch={lyra} section="lvl-2-sorcerer" />);
  expect(loadSettings().spellView).toBe('all');
});
test('changing section later switches to All; a visible section stays on My', () => {
  const r = render(<MeSpells ch={lyra} section="lvl-1-sorcerer" />);
  expect(loadSettings().spellView).toBe('mine');
  expect(r.getByRole('button', { name: 'My spells' }).getAttribute('aria-pressed')).toBe('true');
  r.rerender(<MeSpells ch={lyra} section="lvl-2-sorcerer" />);
  expect(r.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true');
  expect(loadSettings().spellView).toBe('all');
});
test('no picked spells: all spells, no toggle', () => {
  const r = render(<MeSpells ch={{ ...lyra, spells: [] }} />);
  expect(r.queryByRole('button', { name: 'All' })).toBeNull();
  expect(r.container.querySelectorAll('.ic').length).toBeGreaterThan(20);
});
test('card back link and feature level', () => {
  const r = render(<MeCard ch={lyra} kind="feature" id="font-of-magic" section="class-sorcerer" />);
  expect(r.container.querySelector('.back')!.getAttribute('href')).toBe('#/me/actions?s=class-sorcerer');
});
test('start tile', () => {
  const r = render(<Start />);
  expect(r.getByText('Create your character')).toBeTruthy();
  fireEvent.click(r.getByText('My Character Sheet'));
  expect(location.hash).toBe('#/edit/basics');
  saveCharacter(lyra);
  cleanup();
  const r2 = render(<Start />);
  fireEvent.click(r2.getByText('My Character Sheet'));
  expect(location.hash).toBe('#/me');
});
test('me routes without a character never crash', () => {
  location.hash = '#/me/spells';
  expect(() => render(<App />)).not.toThrow();
});
