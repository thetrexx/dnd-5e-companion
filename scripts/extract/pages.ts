import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CACHE, PAGE_OFFSET, PHB_PDF } from './config.ts';

function run(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`poppler not found: "${cmd}" is not on PATH. Install poppler (e.g. winget install oschwartz10612.Poppler) and retry.`);
      process.exit(1);
    }
    throw e;
  }
}

/** Writes .cache/phb/p<book page>.png and .txt unless they already exist. */
export function extractPage(book: number): void {
  const pdfPage = String(book + PAGE_OFFSET);
  mkdirSync(CACHE, { recursive: true });
  const png = `${CACHE}/p${book}.png`;
  const txt = `${CACHE}/p${book}.txt`;
  if (!existsSync(png)) {
    const prefix = `${CACHE}/tmp${book}`;
    run('pdfimages', ['-png', '-f', pdfPage, '-l', pdfPage, PHB_PDF, prefix]);
    const made = readdirSync(CACHE).filter(f => f.startsWith(`tmp${book}-`)).map(f => `${CACHE}/${f}`);
    if (!made.length) { console.error(`page ${book}: pdfimages found no image`); process.exit(1); }
    made.sort((a, b) => statSync(b).size - statSync(a).size);
    renameSync(made[0], png);
    for (const extra of made.slice(1)) unlinkSync(extra);
  }
  if (!existsSync(txt)) {
    writeFileSync(txt, run('pdftotext', ['-raw', '-f', pdfPage, '-l', pdfPage, PHB_PDF, '-']));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const from = Number(process.argv[2]);
  const to = Number(process.argv[3] ?? process.argv[2]);
  if (!Number.isInteger(from) || !Number.isInteger(to) || to < from) {
    console.error('usage: node scripts/extract/pages.ts <from> <to>   (book page numbers)');
    process.exit(1);
  }
  for (let p = from; p <= to; p++) extractPage(p);
  console.log(`pages ${from}-${to} ready in ${CACHE}`);
}
