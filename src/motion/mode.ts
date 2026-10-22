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
