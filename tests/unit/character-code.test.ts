// @vitest-environment node
import { readFileSync } from 'node:fs';
import { decodeCharacter, encodeCharacter, ERR_DAMAGED, ERR_NOT_CODE } from '../../src/character/code';
import type { Character } from '../../src/character/types';

const lyra: Character = { v: 1, name: 'Lyra', race: 'tiefling', classes: [{ cls: 'sorcerer', level: 5, sub: 'draconic-bloodline' }],
  options: ['metamagic-quickened-spell', 'metamagic-twinned-spell', 'draconic-ancestry-red'], feats: [],
  spells: [{ id: 'fire-bolt', cls: 'sorcerer' }, { id: 'shield', cls: 'sorcerer' }] };

test('round trip', async () => expect(await decodeCharacter(await encodeCharacter(lyra))).toEqual({ ok: true, ch: lyra, dropped: [] }));
test('a level 5 sorcerer fits in 400 characters', async () => {
  const full = { ...lyra, spells: ['fire-bolt', 'mage-hand', 'prestidigitation', 'light', 'minor-illusion', 'shield', 'magic-missile', 'chromatic-orb', 'misty-step', 'scorching-ray', 'fireball'].map(id => ({ id, cls: 'sorcerer' as const })) };
  const code = await encodeCharacter(full);
  expect(code).toMatch(/^SS1-[A-Za-z0-9_-]+$/);
  expect(code.length).toBeLessThan(400);
});
test('whitespace and line breaks are ignored', async () => {
  const code = await encodeCharacter(lyra);
  const wrapped = ` ${code.slice(0, 20)}\n${code.slice(20, 40)} \r\n${code.slice(40)}\n`;
  expect((await decodeCharacter(wrapped)).ok).toBe(true);
});
test('not a code', async () => {
  for (const s of ['', 'hello', 'SS9-abc']) expect(await decodeCharacter(s)).toEqual({ ok: false, error: ERR_NOT_CODE });
});
test('cut short or garbled', async () => {
  const code = await encodeCharacter(lyra);
  for (const s of [code.slice(0, code.length - 10), 'SS1-@@@@', 'SS1-AAAA'])
    expect(await decodeCharacter(s)).toEqual({ ok: false, error: ERR_DAMAGED });
});
test('uncompressed fallback', async () => {
  vi.stubGlobal('CompressionStream', undefined);
  const code = await encodeCharacter(lyra);
  vi.unstubAllGlobals();
  expect(code.startsWith('SS0-')).toBe(true);
  expect((await decodeCharacter(code)).ok).toBe(true);
});
test('zero-width characters are ignored', async () => {
  const code = await encodeCharacter(lyra);
  const dirty = `\u200b${code.slice(0, 10)}\u200c${code.slice(10, 30)}\u200d\ufeff${code.slice(30)}\u00a0`;
  expect((await decodeCharacter(dirty)).ok).toBe(true);
});
test('falls back to uncompressed when deflate-raw is missing', async () => {
  vi.stubGlobal('CompressionStream', class { constructor() { throw new TypeError('Unsupported compression format'); } });
  const code = await encodeCharacter(lyra);
  vi.unstubAllGlobals();
  expect(code.startsWith('SS0-')).toBe(true);
  expect(await decodeCharacter(code)).toEqual({ ok: true, ch: lyra, dropped: [] });
});
