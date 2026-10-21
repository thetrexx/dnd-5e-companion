import { readFileSync } from 'node:fs';
import { judgeRecord, longestSharedRun, missingNumbers, normalizeOcr, wordsMatch } from '../../scripts/extract/ocr';

// Invented spell, not from any book. The fixture is the same text with the misreads a scan's
// text layer makes (c->e, f->/, 1->I, Y->V, u->ll).
const ocr = readFileSync('tests/unit/fixtures/ocr-glimmer-dart.txt', 'utf8');
const real = "You fling a sliver of cold light at one creature you can see within range. Make a ranged spell attack. On a hit, the creature takes 1d8 radiant damage and glows faintly until the start of your next turn, so it can't hide in dim light.";
const copied = 'Make a ranged spell attack. On a hit, the creature takes 1d8 radiant damage';

test('clean numbers pass', () => expect(missingNumbers(real, ocr)).toEqual([]));
test('wrong number is caught', () => expect(missingNumbers(real.replace('1d8', '1d12'), ocr)).toEqual(['1d12']));
test('normalize', () => expect(normalizeOcr('Vou /ling Id8 yollr')).toBe(normalizeOcr('You fling 1d8 your')));

const own = 'Shoot a 90 ft ray: on a hit, 1d8 radiant, and the target sheds a faint glow that ends at your next turn.';
test('copied text has a long shared run', () => expect(longestSharedRun(copied, ocr)).toBeGreaterThanOrEqual(8));
test('own words stay short', () => expect(longestSharedRun(own, ocr)).toBeLessThan(8));
test('judge: wrong number fails, own words pass', () => {
  expect(judgeRecord(own, ocr).pass).toBe(true);
  expect(judgeRecord(own.replace('1d8', '1d12'), ocr).reasons.join()).toContain('1d12');
  expect(judgeRecord(copied, ocr).pass).toBe(false);
});
test('judge tests each prose field on its own', () => {
  expect(judgeRecord(own, ocr, [own, copied]).pass).toBe(false);
  // a run cannot be built across two fields
  expect(judgeRecord(own, ocr, ['Make a ranged spell attack.', 'On a hit, the creature takes']).pass).toBe(true);
});

test('wordsMatch tolerates one misread letter in words of 4+ letters', () => {
  expect(wordsMatch('damage', 'danage')).toBe(true); // changed
  expect(wordsMatch('faintly', 'faintlly')).toBe(true); // added
  expect(wordsMatch('creature', 'creatre')).toBe(true); // dropped
  expect(wordsMatch('damage', 'danaje')).toBe(false); // two edits
  expect(wordsMatch('the', 'tha')).toBe(false); // short words match only exactly
  expect(wordsMatch('spell', 'spellbook')).toBe(false);
});
test('a single misread does not break a copied run', () => {
  const misread = ocr.replace('radiant', 'radiamt').replace('takes', 'takcs');
  expect(longestSharedRun(copied, misread)).toBe(longestSharedRun(copied, ocr));
  expect(longestSharedRun(copied, misread)).toBeGreaterThanOrEqual(8);
});
