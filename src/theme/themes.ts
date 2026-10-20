export interface ThemeInfo {
  id: string;
  name: string;
}

export const THEMES: ThemeInfo[] = [{ id: 'faerun', name: 'Faerûn' }];

const DEFAULT_THEME = 'faerun';
export const THEME_STORAGE_KEY = 'theme';

export function applyTheme(id: string): string {
  const applied = THEMES.some((t) => t.id === id) ? id : DEFAULT_THEME;
  document.documentElement.dataset.theme = applied;
  return applied;
}

export function storedTheme(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
