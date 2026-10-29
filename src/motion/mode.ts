import { loadSettings, reducedMotion } from '../settings/settings';
import { parseRgb, type Rgb } from './noise';

export type MotionMode = 'off' | 'static' | 'animated';

export function motionMode(): MotionMode {
  if (loadSettings().strength === 'off') return 'off';
  return reducedMotion() ? 'static' : 'animated';
}

export function themeRgb(token: string): Rgb | null {
  return parseRgb(getComputedStyle(document.documentElement).getPropertyValue(token));
}

// a theme length token in px (as a number), 0 when unset
export const themePx = (token: string): number => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)) || 0;
