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

export function compareToOcr(text: string, ocr: string, span?: { from: string; to?: string }):
  { coverage: number; reverse?: number; missingNumbers: string[]; missingExcerpts: string[] } {
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
  if (span) {
    const a = nOcr.indexOf(normalizeOcr(span.from));
    if (a < 0) reverse = 0;
    else {
      const toN = span.to ? normalizeOcr(span.to) : '';
      const b = toN ? nOcr.indexOf(toN, a + 1) : -1;
      reverse = share(shingles(nOcr.slice(a, b < 0 ? undefined : b)), nText);
    }
  }
  return { coverage, reverse, missingNumbers, missingExcerpts };
}
