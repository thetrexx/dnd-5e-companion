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
test('a word the page hyphenates across a line break still counts toward a copied run', () => {
  // the invented fixture, with "ereature" and "radiant" split at line ends as a book layout would
  const hyphenated = ocr.replace('the ereature takes', 'the erea-\nture takes').replace('Id8 radiant', 'Id8 radi-\r\nant');
  expect(hyphenated).not.toBe(ocr);
  expect(longestSharedRun(copied, hyphenated)).toBe(longestSharedRun(copied, ocr));
  expect(judgeRecord(copied, hyphenated).pass).toBe(false);
});
test('a single misread does not break a copied run', () => {
  const misread = ocr.replace('radiant', 'radiamt').replace('takes', 'takcs');
  expect(longestSharedRun(copied, misread)).toBe(longestSharedRun(copied, ocr));
  expect(longestSharedRun(copied, misread)).toBeGreaterThanOrEqual(8);
});

// Invented sentences, not from any book. Each card differs from its page only by the normalisation under
// test, placed mid-run so that without it neither half reaches 8 words (each test fails on the old matcher).
const page = 'Motes drift and fill a 30-foot radius with soft light until the lantern dies out.';
test('hyphenated sizes match however the hyphens fall', () => {
  const card = 'Motes drift and fill a 30-foot-radius with soft light until the lantern';
  expect(longestSharedRun(card, page)).toBeGreaterThanOrEqual(8);
  expect(judgeRecord(card, page).pass).toBe(false);
});
test('ft, foot and feet are one word', () => {
  const card = 'Motes drift and fill a 30 ft radius with soft light until the lantern';
  expect(longestSharedRun(card, page)).toBeGreaterThanOrEqual(8);
  expect(longestSharedRun(card, page.replace('30-foot radius', '30 feet radius'))).toBeGreaterThanOrEqual(8);
  expect(judgeRecord(card, page).pass).toBe(false);
});
test('a size the page breaks after its digit-hyphen at a line end still folds its unit', () => {
  const card = 'Motes drift and fill a 30 ft radius with soft light until the lantern';
  for (const broken of [page.replace('30-foot', '30-\nfoot'), page.replace('30-foot', '30-\r\nfoot')]) {
    expect(longestSharedRun(card, broken)).toBeGreaterThanOrEqual(8);
    expect(judgeRecord(card, broken).pass).toBe(false);
  }
});
test('two words the text layer merged still count toward a copied run', () => {
  const merged = 'The moth circles twice and settles ifyou stay still, then it glows until the next dawn breaks.';
  const card = 'The moth circles twice and settles if you stay still, then it glows until the';
  expect(longestSharedRun(card, merged)).toBeGreaterThanOrEqual(8);
  expect(judgeRecord(card, merged).pass).toBe(false);
});
test('a number word swapped for digits still counts toward a copied run', () => {
  const words = 'The lantern hums for one minute, then three sparks leap toward the nearest foe and burst.';
  const card = 'The lantern hums for 1 minute, then 3 sparks leap toward the nearest';
  expect(longestSharedRun(card, words)).toBeGreaterThanOrEqual(8);
  expect(judgeRecord(card, words).reasons.join()).toContain('copied');
  // and the other way round: the card spells out what the page prints as digits
  expect(longestSharedRun('The lantern hums for ten minutes, then twelve sparks leap toward the', 'The lantern hums for 10 minutes, then 12 sparks leap toward the nearest foe.')).toBeGreaterThanOrEqual(8);
});
test('an ordinal swapped for its digit form still counts toward a copied run', () => {
  const words = 'Sparks gather on the third round and ignite the dry grass near you.';
  const card = 'Sparks gather on the 3rd round and ignite the dry grass';
  expect(longestSharedRun(card, words)).toBeGreaterThanOrEqual(8);
  expect(judgeRecord(card, words).reasons.join()).toContain('copied');
  expect(longestSharedRun('Sparks gather on the 1st round and ignite the dry grass', words.replace('third', 'first'))).toBeGreaterThanOrEqual(8);
});
test('the new normalisations do not make own words match', () => {
  expect(longestSharedRun('Motes of light orbit you; the glow reaches 30 ft, then fades.', page)).toBeLessThan(8);
});
