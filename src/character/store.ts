import { readJSON, removeKey, writeJSON } from '../settings/storage';
import { parseCharacter } from './parse';
import type { Character } from './types';

export const CHARACTER_KEY = 'dndcs.character';

export function loadCharacter(): Character | null {
  const r = parseCharacter(readJSON<unknown>(CHARACTER_KEY, null));
  return r.ok ? r.ch : null;
}

export function saveCharacter(ch: Character): boolean {
  return writeJSON(CHARACTER_KEY, ch);
}

export function deleteCharacter(): void {
  removeKey(CHARACTER_KEY);
}
