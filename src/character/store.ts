import { readJSON, removeKey, writeJSON } from '../settings/storage';
import { parseCharacter } from './parse';
import type { Character } from './types';

export const CHARACTER_KEY = 'dndcs.character';

/** Last saved character, so blocked storage still keeps it for this visit. */
let session: Character | null = null;

export function loadCharacter(): Character | null {
  const r = parseCharacter(readJSON<unknown>(CHARACTER_KEY, null));
  return r.ok ? r.ch : session;
}

export function saveCharacter(ch: Character): boolean {
  session = ch;
  return writeJSON(CHARACTER_KEY, ch);
}

export function deleteCharacter(): void {
  session = null;
  removeKey(CHARACTER_KEY);
}
