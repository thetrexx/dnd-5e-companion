import { readFileSync } from 'node:fs';
import { compareToOcr, normalizeOcr } from '../../scripts/extract/ocr';

const ocr = readFileSync('tests/unit/fixtures/ocr-fire-bolt.txt', 'utf8');
const real = 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell ignites if it isn\'t being worn or carried.';
const second = 'This spell\'s damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10).';
const full = `Fire Bolt
Evocation cantrip
Casting Time: 1 action
Range: 120 feet
Components: V, S
Duration: Instantaneous
${real}
${second}`;
const span = { from: 'FIRE BOLT', to: 'FIRE SHIELD' };

test('clean transcription passes', () => {
  const r = compareToOcr(real, ocr);
  expect(r.coverage).toBeGreaterThanOrEqual(0.92); expect(r.missingNumbers).toEqual([]);
});
test('wrong number is caught', () => expect(compareToOcr(real.replace('1d10', '1d12'), ocr).missingNumbers).toEqual(['1d12']));
test('wrong words are caught', () => expect(compareToOcr(real.replace('a creature or object', 'an ally or enemy'), ocr).coverage).toBeLessThan(0.92));
test('full book-style text passes with span', () => {
  const r = compareToOcr(full, ocr, span);
  expect(r.reverse!).toBeGreaterThanOrEqual(0.85);
  expect(r.coverage).toBeGreaterThanOrEqual(0.92);
  expect(r.missingNumbers).toEqual([]);
});
test('dropped sentence is caught by reverse', () => {
  const r = compareToOcr(full.replace(' A flammable object hit by this spell ignites if it isn\'t being worn or carried.', ''), ocr, span);
  expect(r.reverse!).toBeLessThan(0.85);
});
test('normalize', () => expect(normalizeOcr('Vou /ire IdlO')).toBe(normalizeOcr('You fire 1d10')));
