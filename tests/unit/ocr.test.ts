import { readFileSync } from 'node:fs';
import { judgeRecord, longestSharedRun, missingNumbers, normalizeOcr } from '../../scripts/extract/ocr';

const ocr = readFileSync('tests/unit/fixtures/ocr-fire-bolt.txt', 'utf8');
const real = 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell ignites if it isn\'t being worn or carried.';

test('clean numbers pass', () => expect(missingNumbers(real, ocr)).toEqual([]));
test('wrong number is caught', () => expect(missingNumbers(real.replace('1d10', '1d12'), ocr)).toEqual(['1d12']));
test('normalize', () => expect(normalizeOcr('Vou /ire IdlO')).toBe(normalizeOcr('You fire 1d10')));

const own = 'Ranged spell attack out to 120 feet; a hit deals 1d10 fire, and unattended flammable objects catch fire.';
test('copied text has a long shared run', () =>
  expect(longestSharedRun('You hurl a mote of fire at a creature or object within range.', ocr)).toBeGreaterThanOrEqual(8));
test('own words stay short', () => expect(longestSharedRun(own, ocr)).toBeLessThan(8));
test('judge: wrong number fails, own words pass', () => {
  expect(judgeRecord(own, ocr).pass).toBe(true);
  expect(judgeRecord(own.replace('1d10', '1d12'), ocr).reasons.join()).toContain('1d12');
  expect(judgeRecord('You hurl a mote of fire at a creature or object within range.', ocr).pass).toBe(false);
});
