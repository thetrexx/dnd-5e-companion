import { readFileSync } from 'node:fs';
import { THEMES, applyTheme } from '../../src/theme/themes';

test('applyTheme sets data-theme', () => {
  expect(applyTheme('faerun')).toBe('faerun');
  expect(document.documentElement.dataset.theme).toBe('faerun');
});
test('unknown theme falls back', () => {
  expect(applyTheme('nope')).toBe('faerun');
  expect(document.documentElement.dataset.theme).toBe('faerun');
});
test('registry lists faerun', () => {
  expect(THEMES).toEqual([{ id: 'faerun', name: 'Faerûn' }]);
});

test('theme defines the motion tokens for every strength', () => {
  const css = readFileSync('src/styles/themes/faerun.css', 'utf8');
  for (const s of ['off', 'faint', 'medium', 'strong']) expect(css).toMatch(new RegExp(`data-strength="${s}"\][^}]*--motion-i`));
  for (const t of ['--mist-o', '--blood-o', '--cells-o', '--sorcerer-cell-core', '--row-motif-mask', '--bg-motif-mask', '--none-bg-o']) expect(css).toContain(t);
});
