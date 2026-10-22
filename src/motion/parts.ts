import type { Part, Rnd, Shape } from './types';
import { toD, type Pt } from './geom';

export const f1 = (n: number) => n.toFixed(1);
export const r1 = (n: number) => +n.toFixed(1);
export const line = (shape: string | Pt[], at: number, dur: number, cls?: string): Part =>
  ({ kind: 'line', d: typeof shape === 'string' ? shape : toD(shape), at, dur, cls });
export const pop = (x: number, y: number, rot: number, at: number, shapes: Shape[], scale?: number): Part =>
  scale === undefined ? { kind: 'pop', x, y, rot, at, shapes } : { kind: 'pop', x, y, rot, scale, at, shapes };
// a small shape that travels along keyframes (falling loot, flying arrows)
export const mover = (x: number, y: number, at: number, dur: number, frames: Keyframe[], shapes: Shape[]): Part =>
  ({ kind: 'move', x, y, at, dur, frames, shapes });
export const shape = (tag: Shape['tag'], attrs: Shape['attrs'], cls?: string): Shape => cls ? { tag, attrs, cls } : { tag, attrs };
export const sign = (rnd: Rnd) => rnd() < .5 ? 1 : -1;
