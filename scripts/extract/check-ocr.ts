import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { CACHE } from './config.ts';
import { judgeRecord } from './ocr.ts';
import { extractPage } from './pages.ts';

type Rec = { id: string; name: string; page?: number; description?: string[]; textSource?: 'srd' | 'summary'; higherLevels?: string };
type Spell = Rec & {
  level: number; school: string; ritual?: boolean; range: string; duration: string; higherLevels?: string;
  cast: { text: string }; components: { v: boolean; s: boolean; m?: { text: string } };
};

const KINDS = ['spells', 'features', 'subclasses', 'races', 'feats', 'options'] as const;
type Kind = typeof KINDS[number];
const REPORT = '.cache/ocr-report.md';

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const accept = existsSync('scripts/extract/ocr-accept.json') ? readJson<Record<string, string>>('scripts/extract/ocr-accept.json') : {};

const sortKey = (name: string): string => name.toLowerCase().replace(/['’]/g, '');

/** Every PHB spell name in book order, from spell-lists.json (Task 4) when present; else empty. */
function bookOrder(): string[] {
  const path = 'scripts/extract/spell-lists.json';
  if (!existsSync(path)) return [];
  const lists = readJson<Record<string, string[]>>(path);
  const names = [...new Set(Object.values(lists).flat())];
  return names.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

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

function ocrPages(page: number): string {
  let out = '';
  for (const p of [page, page + 1]) {
    extractPage(p);
    out += readFileSync(`${CACHE}/p${p}.txt`, 'utf8') + '\n';
  }
  return out;
}

interface Item { key: string; source: 'srd' | 'summary'; text: string; page: number; span?: { from: string; to?: string } }

function items(kind: Kind): Item[] | 'skip' {
  if (kind === 'spells') {
    const spells = readJson<Spell[]>('data/spells.json');
    const sorted = [...spells].sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)));
    const book = bookOrder();
    return sorted.map((s, i) => {
      const at = book.findIndex(n => sortKey(n) === sortKey(s.name));
      const to = at >= 0 ? book[at + 1] : sorted[i + 1]?.name;
      return { key: `spells:${s.id}`, source: s.textSource ?? 'srd', text: spellText(s), page: s.page!, span: { from: s.name, to } };
    });
  }
  let recs: Rec[];
  if (kind === 'features') {
    recs = readdirSync('data/features').filter(f => f.endsWith('.json')).flatMap(f => readJson<Rec[]>(`data/features/${f}`));
  } else if (kind === 'feats') {
    recs = readJson<Rec[]>('data/feats.json');
  } else {
    return 'skip'; // subclasses, races, options carry no description: nothing to compare
  }
  return recs.map(r => ({ key: `${kind}:${r.id}`, source: r.textSource ?? 'srd', text: [r.name, ...(r.description ?? [])].join('\n'), page: r.page! }));
}

interface Result { key: string; source?: string; why: string[]; excerpts: string[]; accepted?: string }

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
    if (!Number.isInteger(it.page)) { failures.push({ key: it.key, source: it.source, why: ['no page'], excerpts: [], accepted: accept[it.key] }); continue; }
    const r = judgeRecord(it.source, it.text, ocrPages(it.page), it.span);
    if (!r.pass) failures.push({ key: it.key, source: it.source, why: r.reasons, excerpts: [], accepted: accept[it.key] });
  }
}

const open = failures.filter(f => !f.accepted);
for (const f of open) console.log(`FAIL ${f.key} [${f.source ?? 'srd'}]: ${f.why.join('; ')}`);
const lines = [
  '# OCR check report', '',
  `Checked ${checked}, failed ${failures.length} (${open.length} not accepted).`, '',
  ...[...open, ...failures.filter(f => f.accepted)].flatMap(f => [
    `## ${f.key} [${f.source ?? 'srd'}]${f.accepted ? ` (accepted: ${f.accepted})` : ''}`,
    ...f.why.map(w => `- ${w}`),
    ...f.excerpts.map(e => `- missing: "${e}"`), '',
  ]),
];
mkdirSync('.cache', { recursive: true });
writeFileSync(REPORT, lines.join('\n'));
console.log(`checked ${checked}, failed ${failures.length} (${open.length} not accepted). Report: ${REPORT}`);
process.exit(open.length ? 1 : 0);
