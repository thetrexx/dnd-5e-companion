import { readFileSync } from 'node:fs';
import { compareToOcr, judgeRecord, longestSharedRun, normalizeOcr } from '../../scripts/extract/ocr';

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

const prose = `BLESS Enchantment
Casting Time: 1 action
You bless up to three creatures. The light of the gods is upon them, and light fills the area.
LIGHT Evoeation eantrip
Casting Time: 1 aetion
You touch one object that is no larger than 10 feet in any dimension.
LONGSTRIDER Transmutation`;
test('span heading anchors to its line, not earlier prose', () => {
  const r = compareToOcr('Light\nEvocation cantrip\nCasting Time: 1 action\nYou touch one object that is no larger than 10 feet in any dimension.', prose, { from: 'Light', to: 'Longstrider' });
  expect(r.reverse!).toBeGreaterThanOrEqual(0.85);
  expect(r.spanEndMissing).toBeUndefined();
});
test('missing span end is flagged, not sliced to the end', () => {
  const r = compareToOcr('Light', prose, { from: 'Light', to: 'Nonexistent Spell' });
  expect(r.spanEndMissing).toBe(true);
  expect(r.reverse).toBeUndefined();
});

const own = 'Ranged spell attack out to 120 feet; a hit deals 1d10 fire, and unattended flammable objects catch fire.';
test('copied text has a long shared run', () =>
  expect(longestSharedRun('You hurl a mote of fire at a creature or object within range.', ocr)).toBeGreaterThanOrEqual(8));
test('own words stay short', () => expect(longestSharedRun(own, ocr)).toBeLessThan(8));
test('summary mode: wrong number fails, own words pass', () => {
  expect(judgeRecord('summary', own, ocr).pass).toBe(true);
  expect(judgeRecord('summary', own.replace('1d10', '1d12'), ocr).reasons.join()).toContain('1d12');
  expect(judgeRecord('summary', 'You hurl a mote of fire at a creature or object within range.', ocr).pass).toBe(false);
});
test('srd mode: copied text passes, wrong number fails', () => {
  expect(judgeRecord('srd', real, ocr).pass).toBe(true);
  expect(judgeRecord('srd', real.replace('1d10', '1d12'), ocr).pass).toBe(false);
});
