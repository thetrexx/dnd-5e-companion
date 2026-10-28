// Tolerant comparison of transcribed text against the scan's badly OCR'd text layer. Pure: no fs.

export function normalizeOcr(s: string): string {
  return s.toLowerCase()
    .replace(/u/g, 'll').replace(/rn/g, 'm')
    .replace(/[ce]/g, 'e')
    .replace(/[il1|!/f]/g, 'l')
    .replace(/[5s]/g, 's')
    .replace(/[yv]/g, 'v')
    .replace(/[0o]/g, 'o')
    .replace(/[^a-z0-9]/g, '');
}

/** Numbers and dice in `text` that the scan's text layer does not contain. */
export function missingNumbers(text: string, ocr: string): string[] {
  const nOcr = normalizeOcr(ocr);
  return (text.match(/\d[\dd]*\w*/g) ?? []).filter(t => !nOcr.includes(normalizeOcr(t)));
}

const MAX_RUN = 8;

/**
 * Rejoins words the page split with a hyphen at a line break ("crea-\nture" becomes "creature"). A hyphen
 * after a digit is a compound size ("30-\nfoot"), so it becomes a space and the unit stays its own word.
 */
export function joinHyphenation(s: string): string {
  return s.replace(/(\d)[-­‐]\s*\r?\n\s*(\w)/g, '$1 $2').replace(/(\w)[-­‐]\s*\r?\n\s*(\w)/g, '$1$2');
}

/** "ft", "foot" and "feet" (as `normalizeOcr` folds them) count as one word. */
const UNIT = new Set(['ft', 'foot', 'feet'].map(normalizeOcr));

const CARDINALS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const TENS: [string, number][] = [['thirty', 30], ['forty', 40], ['fifty', 50], ['sixty', 60], ['seventy', 70], ['eighty', 80], ['ninety', 90]];
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const suffix = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

/**
 * Number words fold to the digits a card uses ("three" to 3, "third" to 3rd), so a copy that only swaps
 * the one for the other is still caught. Keys and values are both normalized, so the fold only joins a
 * number word to its digits: any word it also catches was already equal to that number word.
 */
const NUMBER = new Map<string, string>([
  ...CARDINALS.map((w, i): [string, string] => [w, String(i + 1)]),
  ...TENS.map(([w, n]): [string, string] => [w, String(n)]),
  ...ORDINALS.map((w, i): [string, string] => [w, `${i + 1}${suffix(i + 1)}`]),
].map(([w, d]) => [normalizeOcr(w), normalizeOcr(d)]));

/**
 * Words for run matching: line-break hyphenation rejoined, then compound hyphens and "×" split, so
 * "30-ft-radius" and "30-foot radius" both give 30 / ft / radius; unit words fold to one, number words to digits.
 */
const normWords = (s: string): string[] =>
  joinHyphenation(s).replace(/[-­‐–×]/g, ' ').split(/\s+/).map(normalizeOcr).filter(Boolean)
    .map(w => (UNIT.has(w) ? 'leet' : NUMBER.get(w) ?? w));

/**
 * Two normalized words match when equal, or when both have 4+ letters and differ by one edit
 * (one letter changed, added or dropped). This absorbs single-character OCR misreads that
 * `normalizeOcr` does not fold, without letting short words ("a", "the") match loosely.
 */
export function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * The text layer with every line break removed and its two halves glued (no space), so a word the page
 * split at a line end without a hyphen ("intel / ligence") is whole again. A hyphen the first pass left
 * at the break goes too.
 */
const glueLines = (s: string): string => joinHyphenation(s).replace(/[-­‐]?[^\S\r\n]*\r?\n\s*/g, '');

/**
 * Longest run of consecutive normalized words that `text` shares with `ocr`, tolerating one misread letter
 * per word. A text-layer word that is two of ours run together ("ifyou") counts as both. Takes the larger
 * of two passes: the text layer as is, and with its line breaks glued (`glueLines`). Gluing also fuses two
 * unrelated words at every line end, which can break a real run, so the first pass stays.
 */
export function longestSharedRun(text: string, ocr: string): number {
  const a = normWords(text);
  return Math.max(runOf(a, normWords(ocr)), runOf(a, normWords(glueLines(ocr))));
}

function runOf(a: string[], b: string[]): number {
  let best = 0;
  let prev2 = new Array<number>(b.length + 1).fill(0);
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (wordsMatch(a[i - 1], b[j - 1])) cur[j] = prev[j - 1] + 1;
      if (i >= 2 && b[j - 1] === a[i - 2] + a[i - 1]) cur[j] = Math.max(cur[j], prev2[j - 1] + 2);
      if (cur[j] > best) best = cur[j];
    }
    prev2 = prev;
    prev = cur;
  }
  return best;
}

/**
 * Facts match (every number in `text` is in the book) and own words (no long run shared with the book).
 * `prose` is the part we wrote ourselves; the stat block above it matches the book by design, so only
 * `prose` is tested for copying. It defaults to `text`. Pass a list to test each field on its own, so a
 * run never spans two fields.
 */
export function judgeRecord(text: string, ocr: string, prose: string | string[] = text): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const missing = missingNumbers(text, ocr);
  if (missing.length) reasons.push(`missing numbers: ${missing.join(', ')}`);
  const run = Math.max(0, ...(Array.isArray(prose) ? prose : [prose]).map(p => longestSharedRun(p, ocr)));
  if (run >= MAX_RUN) reasons.push(`copied: ${run} consecutive words match the book (limit ${MAX_RUN - 1})`);
  return { pass: reasons.length === 0, reasons };
}
