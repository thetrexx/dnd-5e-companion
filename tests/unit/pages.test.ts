import { pageRef } from '../../scripts/extract/pages';
import { BOOKS } from '../../scripts/extract/config';
test('phb page ref keeps the old cache and offset', () =>
  expect(pageRef(242)).toMatchObject({ pdfPage: 243, png: '.cache/phb/p242.png', txt: '.cache/phb/p242.txt' }));
test('dmg offset', () => expect(pageRef(97, 'dmg')).toMatchObject({ pdfPage: 101, png: '.cache/dmg/p97.png' }));
test('xge page ref', () => expect(pageRef(50, 'xge').pdf).toMatch(/Xanathar's Guide to Everything\.pdf$/));
test('giants has no text layer', () => expect(BOOKS.bgg.textLayer).toBe(false));
test('raster choice per book', () => {
  expect(BOOKS.phb.raster).toBe('pdfimages');
  for (const b of ['xge', 'tce', 'scag', 'dmg', 'bgg'] as const) expect(BOOKS[b].raster).toBe('pdftoppm');
});
