// Tolerant comparison of transcribed text against the scan's badly OCR'd text layer. Pure: no fs.

const SHINGLE = 8;

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

function shingles(n: string): string[] {
  const out: string[] = [];
  for (let i = 0; i + SHINGLE <= n.length; i++) out.push(n.slice(i, i + SHINGLE));
  return out;
}

function share(items: string[], haystack: string): number {
  if (!items.length) return 1;
  let hit = 0;
  for (const s of items) if (haystack.includes(s)) hit++;
  return hit / items.length;
}

/**
 * Index in `lines` of the heading line for `name`: the line whose normalized start equals the
 * normalized name. Headings are in caps, so a line that starts with the name in caps wins over
 * one that merely starts with the same letters in prose.
 */
function findHeading(lines: string[], name: string, after: number): number {
  const n = normalizeOcr(name);
  let loose = -1;
  for (let i = after; i < lines.length; i++) {
    if (!normalizeOcr(lines[i]).startsWith(n)) continue;
    if (!/[a-z]/.test(lines[i].trim().slice(0, name.length))) return i;
    if (loose < 0) loose = i;
  }
  return loose;
}

/**
 * `ocr` is raw text with newlines (headings are found at line starts). With `span`, `reverse` is
 * the share of the cut's shingles found in the text. If `span.from` is absent, reverse is 0. If
 * `span.to` is given but absent after the heading, `reverse` is undefined and `spanEndMissing` is true.
 */
export function compareToOcr(text: string, ocr: string, span?: { from: string; to?: string }):
  { coverage: number; reverse?: number; spanEndMissing?: boolean; missingNumbers: string[]; missingExcerpts: string[] } {
  const nText = normalizeOcr(text);
  const nOcr = normalizeOcr(ocr);
  const coverage = share(shingles(nText), nOcr);

  const missingNumbers = (text.match(/\d[\dd]*\w*/g) ?? []).filter(t => !nOcr.includes(normalizeOcr(t)));

  const words = text.split(/\s+/).filter(Boolean);
  const missingExcerpts: string[] = [];
  for (let i = 0; i + 6 <= words.length && missingExcerpts.length < 3;) {
    const win = words.slice(i, i + 6);
    const sh = shingles(normalizeOcr(win.join(' ')));
    if (sh.length && sh.every(s => !nOcr.includes(s))) { missingExcerpts.push(win.join(' ')); i += 6; } else i++;
  }

  let reverse: number | undefined;
  let spanEndMissing: boolean | undefined;
  if (span) {
    const lines = ocr.split(/\r?\n/);
    const a = findHeading(lines, span.from, 0);
    if (a < 0) reverse = 0;
    else {
      const b = span.to ? findHeading(lines, span.to, a + 1) : lines.length;
      if (b < 0) spanEndMissing = true;
      else reverse = share(shingles(normalizeOcr(lines.slice(a, b).join('\n'))), nText);
    }
  }
  return { coverage, reverse, spanEndMissing, missingNumbers, missingExcerpts };
}

const MIN_COVERAGE = 0.92;
const MIN_REVERSE = 0.85;
const MAX_RUN = 8;

const normWords = (s: string): string[] => s.split(/\s+/).map(normalizeOcr).filter(Boolean);

/** Longest run of consecutive normalized words that `text` shares with `ocr`. */
export function longestSharedRun(text: string, ocr: string): number {
  const a = normWords(text);
  const b = normWords(ocr);
  let best = 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) { cur[j] = prev[j - 1] + 1; if (cur[j] > best) best = cur[j]; }
    }
    prev = cur;
  }
  return best;
}

/** srd: word-for-word checks. summary: facts match (numbers) and own words (short shared run). */
export function judgeRecord(source: 'srd' | 'summary', text: string, ocr: string, span?: { from: string; to?: string }):
  { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const r = compareToOcr(text, ocr, source === 'srd' ? span : undefined);
  if (r.missingNumbers.length) reasons.push(`missing numbers: ${r.missingNumbers.join(', ')}`);
  if (source === 'srd') {
    if (r.coverage < MIN_COVERAGE) reasons.push(`coverage ${r.coverage.toFixed(2)} < ${MIN_COVERAGE}`);
    if (r.spanEndMissing) reasons.push(`span end not found: ${span!.to}`);
    if (r.reverse !== undefined && r.reverse < MIN_REVERSE) reasons.push(`reverse ${r.reverse.toFixed(2)} < ${MIN_REVERSE}`);
  } else {
    const run = longestSharedRun(text, ocr);
    if (run >= MAX_RUN) reasons.push(`copied: ${run} consecutive words match the book (limit ${MAX_RUN - 1})`);
  }
  return { pass: reasons.length === 0, reasons };
}
