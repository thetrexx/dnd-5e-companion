export type Rnd = () => number; // [0, 1)
export interface Shape { tag: 'path' | 'circle' | 'ellipse'; attrs: Record<string, string | number>; cls?: string }
export type Part =
  | { kind: 'line'; d: string; at: number; dur: number; cls?: string } // at: fraction of the grow phase
  | { kind: 'pop'; x: number; y: number; rot: number; scale?: number; at: number; shapes: Shape[] }
  | { kind: 'move'; x: number; y: number; at: number; dur: number; frames: Keyframe[]; shapes: Shape[] }
  // children render inside one <g> that turns `deg` degrees about (cx, cy) over the whole cycle
  | { kind: 'spin'; cx: number; cy: number; deg: number; parts: Part[] }
  // a dot on the spark layer (runLoop's o.over); `at` is a fraction of the grow phase and may exceed 1
  | { kind: 'spark'; x: number; y: number; r: number; at: number; dur: number; frames: Keyframe[] };
export type Gen = (W: number, H: number, rnd: Rnd) => Part[];
export interface Timing { G: number; HOLD: number; WITHER: number; POP: number }
export const ROW_TIMING: Timing = { G: 3600, HOLD: 1600, WITHER: 3000, POP: 600 };
export const BG_TIMING: Timing = { G: 7000, HOLD: 4000, WITHER: 6000, POP: 1400 };
