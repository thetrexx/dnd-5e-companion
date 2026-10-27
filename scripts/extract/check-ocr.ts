import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { BOOKS, type BookId } from './config.ts';
import { judgeRecord } from './ocr.ts';
import { extractPage } from './pages.ts';

type Rec = {
  id: string; name: string; book?: BookId; page?: number; description?: string[];
  trigger?: string; prereq?: { text?: string }; resource?: string; uses?: string;
};
type Spell = Rec & {
  level: number; school: string; ritual?: boolean; range: string; duration: string; higherLevels?: string;
  cast: { text: string; trigger?: string }; components: { v: boolean; s: boolean; m?: { text: string } };
};

const KINDS = ['spells', 'features', 'subclasses', 'races', 'feats', 'options'] as const;
type Kind = typeof KINDS[number];
const REPORT = '.cache/ocr-report.md';

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const accept = existsSync('scripts/extract/ocr-accept.json') ? readJson<Record<string, string>>('scripts/extract/ocr-accept.json') : {};

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

function spellText(s: Spell): string {
  const school = s.school.toLowerCase();
  const line = (s.level === 0 ? `${s.school} cantrip` : `${ordinal(s.level)}-level ${school}`) + (s.ritual ? ' (ritual)' : '');
  const c = s.components;
  const comps = [c.v && 'V', c.s && 'S', c.m && `M (${c.m.text})`].filter(Boolean).join(', ');
  return [
    s.name, line,
    `Casting Time: ${s.cast.text}`, `Range: ${s.range}`, `Components: ${comps}`, `Duration: ${s.duration}`,
    ...(s.description ?? []),
    ...(s.higherLevels ? [`At Higher Levels. ${s.higherLevels}`] : []),
  ].join('\n');
}

/** The words we wrote, one entry per field: description, higher levels, material item list, reaction trigger. */
function proseOf(s: Spell): string[] {
  return [(s.description ?? []).join('\n'), s.higherLevels ?? '', s.components.m?.text ?? '', s.cast.trigger ?? ''].filter(Boolean);
}

/** A feature's or feat's own words, one entry per field. */
function recProse(r: Rec): string[] {
  return [(r.description ?? []).join('\n'), r.trigger ?? '', r.prereq?.text ?? '', r.resource ?? '', r.uses ?? ''].filter(Boolean);
}

function ocrPages(page: number, book: BookId): string {
  const cache = BOOKS[book].cache;
  let out = '';
  for (const p of [page, page + 1, page + 2]) {
    // page + 2 only when page + 1 is a full-page illustration (no text), so the entry continues there
    if (p === page + 2 && readFileSync(`${cache}/p${page + 1}.txt`, 'utf8').trim()) break;
    extractPage(p, book);
    out += readFileSync(`${cache}/p${p}.txt`, 'utf8') + '\n';
  }
  return out;
}

interface Item { key: string; text: string; page: number; book: BookId; prose: string[] }

function items(kind: Kind): Item[] | 'skip' {
  if (kind === 'spells') {
    return readJson<Spell[]>('data/spells.json').map(s => ({ key: `spells:${s.id}`, text: spellText(s), page: s.page!, book: s.book ?? 'phb', prose: proseOf(s) }));
  }
  let recs: Rec[];
  if (kind === 'features') {
    recs = readdirSync('data/features').filter(f => f.endsWith('.json')).flatMap(f => readJson<Rec[]>(`data/features/${f}`));
  } else if (kind === 'feats') {
    recs = readJson<Rec[]>('data/feats.json');
  } else {
    return 'skip'; // subclasses, races, options carry no description: nothing to compare
  }
  return recs.map(r => ({ key: `${kind}:${r.id}`, text: [r.name, ...recProse(r)].join('\n'), page: r.page!, book: r.book ?? 'phb', prose: recProse(r) }));
}

interface Result { key: string; why: string[]; accepted?: string }

const arg = process.argv[2];
if (arg && !KINDS.includes(arg as Kind)) {
  console.error(`usage: node scripts/extract/check-ocr.ts [${KINDS.join('|')}]`);
  process.exit(1);
}
const kinds = arg ? [arg as Kind] : [...KINDS];

let checked = 0;
const failures: Result[] = [];
for (const kind of kinds) {
  const list = items(kind);
  if (list === 'skip') { console.log(`${kind}: skipped (no description to compare)`); continue; }
  for (const it of list) {
    checked++;
    if (!Number.isInteger(it.page)) { failures.push({ key: it.key, why: ['no page'], accepted: accept[it.key] }); continue; }
    if (!BOOKS[it.book].textLayer) { failures.push({ key: it.key, why: ['no text layer'], accepted: accept[it.key] }); continue; }
    const r = judgeRecord(it.text, ocrPages(it.page, it.book), it.prose);
    if (!r.pass) failures.push({ key: it.key, why: r.reasons, accepted: accept[it.key] });
  }
}

const open = failures.filter(f => !f.accepted);
for (const f of open) console.log(`FAIL ${f.key}: ${f.why.join('; ')}`);
const lines = [
  '# OCR check report', '',
  `Checked ${checked}, failed ${failures.length} (${open.length} not accepted).`, '',
  ...[...open, ...failures.filter(f => f.accepted)].flatMap(f => [
    `## ${f.key}${f.accepted ? ` (accepted: ${f.accepted})` : ''}`,
    ...f.why.map(w => `- ${w}`),
    '',
  ]),
];
mkdirSync('.cache', { recursive: true });
writeFileSync(REPORT, lines.join('\n'));
console.log(`checked ${checked}, failed ${failures.length} (${open.length} not accepted). Report: ${REPORT}`);
process.exit(open.length ? 1 : 0);
