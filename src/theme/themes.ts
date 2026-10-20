export interface ThemeInfo {
  id: string;
  name: string;
}

export const THEMES: ThemeInfo[] = [{ id: 'faerun', name: 'Faerûn' }];

const DEFAULT_THEME = 'faerun';

export function applyTheme(id: string): string {
  const applied = THEMES.some((t) => t.id === id) ? id : DEFAULT_THEME;
  document.documentElement.dataset.theme = applied;
  return applied;
}
