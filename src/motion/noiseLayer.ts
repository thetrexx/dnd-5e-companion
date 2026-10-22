import { envelope } from './noise';

export interface NoiseOptions {
  scale: number; period: number; animate: boolean; alive(): boolean;
  paint(px: Uint8ClampedArray, w: number, h: number, t: number, e: number, W: number, H: number): void;
  tick?(t: number, e: number, dt: number): void;
}

const context = (cv: HTMLCanvasElement): CanvasRenderingContext2D | null => {
  try { return cv.getContext('2d'); } catch { return null; }
};

// a noise field drawn at low resolution and scaled up soft; e is the gather / hang / fade envelope
export function runNoise(cv: HTMLCanvasElement, host: Element, o: NoiseOptions): () => void {
  const { width: W, height: H } = host.getBoundingClientRect(), w = Math.ceil(W / o.scale), h = Math.ceil(H / o.scale);
  cv.width = w; cv.height = h;
  const ctx = context(cv);
  if (!ctx) return () => {};
  const img = ctx.createImageData(w, h);
  const render = (t: number, e: number, dt: number) => {
    o.paint(img.data, w, h, t, e, W, H); ctx.putImageData(img, 0, 0); o.tick?.(t, e, dt);
  };
  if (!o.animate) { render(0, 1, 0); return () => {}; }
  let id = 0, stopped = false, t0 = -1, last = -Infinity, prev = -1, paused = 0, hiddenAt = -1;
  const frame = (now: number) => {
    if (stopped || !o.alive()) return;
    id = requestAnimationFrame(frame);
    if (document.hidden) { if (hiddenAt < 0) hiddenAt = now; return; }
    if (hiddenAt >= 0) { if (t0 >= 0) paused += now - hiddenAt; hiddenAt = -1; }
    if (now - last < 40) return;
    if (t0 < 0) t0 = now;
    const el = now - t0 - paused;
    render(el / 1000, envelope((el % o.period) / o.period), prev < 0 ? 0 : (now - prev) / 1000);
    last = prev = now;
  };
  id = requestAnimationFrame(frame);
  return () => { if (stopped) return; stopped = true; cancelAnimationFrame(id); };
}
