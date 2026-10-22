import { parseCharacter, type ParseResult } from './parse';
import type { Character } from './types';

export const ERR_NOT_CODE = "That isn't a Spellbook & Steel backup code.";
export const ERR_DAMAGED = 'This code is damaged or cut short. Copy the whole code and try again.';

const toBase64Url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function pipe(stream: { writable: WritableStream; readable: ReadableStream }, bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const w = stream.writable.getWriter();
  // Failures surface through the readable side; keep these from going unhandled.
  w.write(bytes).catch(() => {});
  w.close().catch(() => {});
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

export async function encodeCharacter(ch: Character): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(ch)) as Uint8Array<ArrayBuffer>;
  const plain = 'SS0-' + toBase64Url(json);
  if (typeof CompressionStream === 'undefined') return plain;
  try {
    return 'SS1-' + toBase64Url(await pipe(new CompressionStream('deflate-raw'), json));
  } catch {
    return plain; // no 'deflate-raw' in this browser
  }
}

export async function decodeCharacter(code: string): Promise<ParseResult> {
  // pasted codes can carry line breaks and zero-width characters
  const s = code.replace(/[\s\u200b-\u200d\ufeff]/g, '');
  const kind = s.slice(0, 4);
  if (kind !== 'SS1-' && kind !== 'SS0-') return { ok: false, error: ERR_NOT_CODE };
  let raw: unknown;
  try {
    let bytes = fromBase64Url(s.slice(4));
    if (kind === 'SS1-') bytes = await pipe(new DecompressionStream('deflate-raw'), bytes);
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, error: ERR_DAMAGED };
  }
  return parseCharacter(raw);
}
