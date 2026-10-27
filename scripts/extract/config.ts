import type { BookId } from '../../src/data/types.ts';
export type { BookId };

export const BOOK_DIR = process.env.BOOK_DIR ?? 'C:/Users/trexx/Desktop/T-ReXx/d&d';

/** offset: pdf page = book page + offset. cache: p<book page>.png / .txt. textLayer: false = scan with no text. */
export const BOOKS: Record<BookId, { pdf: string; offset: number; cache: string; textLayer: boolean }> = {
  phb: { pdf: process.env.PHB_PDF ?? `${BOOK_DIR}/PDF 5E Player's Handbook.pdf`, offset: 1, cache: '.cache/phb', textLayer: true },
  xge: { pdf: `${BOOK_DIR}/PDF 5E Xanathar's Guide to Everything.pdf`, offset: 1, cache: '.cache/xge', textLayer: true },
  tce: { pdf: `${BOOK_DIR}/PDF 5E Tashas_Cauldron_of_Everything.pdf`, offset: 1, cache: '.cache/tce', textLayer: true },
  scag: { pdf: `${BOOK_DIR}/PDF 5E Sword Coast Adventurer's Guide.pdf`, offset: 1, cache: '.cache/scag', textLayer: true },
  dmg: { pdf: `${BOOK_DIR}/PDF 5E Dungeon Master's Guide.pdf`, offset: 4, cache: '.cache/dmg', textLayer: true },
  bgg: { pdf: `${BOOK_DIR}/PDF 5E Glory of the Giants.pdf`, offset: 0, cache: '.cache/bgg', textLayer: false }, // offset 0: printed pages 22 and 24 are pdf pages 22 and 24 (checked on page images, 2026-10-27)
};
