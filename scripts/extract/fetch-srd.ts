// Fills .cache/srd/ from dnd5eapi: _list.json plus one <index>.json per SRD spell.
// Requests run one at a time with a short pause, and files already on disk are skipped,
// so a rerun only fetches what is missing. spell-facts.ts reads only the structured fields.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const API = 'https://www.dnd5eapi.co';
const DIR = '.cache/srd';
const PAUSE_MS = 150;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

async function cached(file: string, path: string): Promise<{ data: unknown; fetched: boolean }> {
  if (existsSync(file)) return { data: JSON.parse(readFileSync(file, 'utf8')), fetched: false };
  const data = await getJson(path);
  writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
  await sleep(PAUSE_MS);
  return { data, fetched: true };
}

mkdirSync(DIR, { recursive: true });
const list = (await cached(`${DIR}/_list.json`, '/api/2014/spells')).data as { results: { index: string; url: string }[] };
let fetched = 0;
for (const r of list.results) {
  if ((await cached(`${DIR}/${r.index}.json`, r.url)).fetched) fetched++;
}
console.log(`srd spells: ${list.results.length} listed, ${fetched} fetched, ${list.results.length - fetched} cached`);
