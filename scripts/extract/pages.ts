import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS, type BookId } from './config.ts';

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

export function pageRef(page: number, book: BookId = 'phb'): { pdf: string; pdfPage: number; png: string; txt: string } {
  const b = BOOKS[book];
  return { pdf: b.pdf, pdfPage: page + b.offset, png: `${b.cache}/p${page}.png`, txt: `${b.cache}/p${page}.txt` };
}

/** Writes <book cache>/p<book page>.png and .txt unless they already exist. A book with no text layer gets an empty .txt. */
export function extractPage(page: number, book: BookId = 'phb'): void {
  const { pdf, pdfPage, png, txt } = pageRef(page, book);
  const cache = BOOKS[book].cache;
  const pdfPageArg = String(pdfPage);
  mkdirSync(cache, { recursive: true });
  if (!existsSync(png)) {
    if (BOOKS[book].raster === 'pdftoppm') {
      run('pdftoppm', ['-png', '-r', '150', '-singlefile', '-f', pdfPageArg, '-l', pdfPageArg, pdf, `${cache}/p${page}`]);
      if (!existsSync(png)) { console.error(`${book} page ${page}: pdftoppm wrote no image`); process.exit(1); }
    } else {
      const prefix = `${cache}/tmp${page}`;
      run('pdfimages', ['-png', '-f', pdfPageArg, '-l', pdfPageArg, pdf, prefix]);
      const made = readdirSync(cache).filter(f => f.startsWith(`tmp${page}-`)).map(f => `${cache}/${f}`);
      if (!made.length) { console.error(`${book} page ${page}: pdfimages found no image`); process.exit(1); }
      made.sort((a, b) => statSync(b).size - statSync(a).size);
      renameSync(made[0], png);
      for (const extra of made.slice(1)) unlinkSync(extra);
    }
  }
  if (!existsSync(txt)) {
    writeFileSync(txt, BOOKS[book].textLayer ? run('pdftotext', ['-raw', '-f', pdfPageArg, '-l', pdfPageArg, pdf, '-']) : '');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const from = Number(process.argv[2]);
  const to = Number(process.argv[3] ?? process.argv[2]);
  const book = (process.argv[4] ?? 'phb') as BookId;
  if (!Number.isInteger(from) || !Number.isInteger(to) || to < from || !(book in BOOKS)) {
    console.error(`usage: node scripts/extract/pages.ts <from> <to> [${Object.keys(BOOKS).join('|')}]   (book page numbers, book defaults to phb)`);
    process.exit(1);
  }
  for (let p = from; p <= to; p++) extractPage(p, book);
  console.log(`${book} pages ${from}-${to} ready in ${BOOKS[book].cache}`);
}
