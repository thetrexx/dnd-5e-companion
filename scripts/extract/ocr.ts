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

const normWords = (s: string): string[] => s.split(/\s+/).map(normalizeOcr).filter(Boolean);

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

/** Longest run of consecutive normalized words that `text` shares with `ocr`, tolerating one misread letter per word. */
export function longestSharedRun(text: string, ocr: string): number {
  const a = normWords(text);
  const b = normWords(ocr);
  let best = 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (wordsMatch(a[i - 1], b[j - 1])) { cur[j] = prev[j - 1] + 1; if (cur[j] > best) best = cur[j]; }
    }
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
