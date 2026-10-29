import { envelope } from './noise';

export interface NoiseOptions {
  scale: number; period: number; animate: boolean; alive(): boolean; blur?: number; // css px
  paint(px: Uint8ClampedArray, w: number, h: number, t: number, e: number, W: number, H: number, k: number): void;
  tick?(t: number, e: number, dt: number): void;
}

const context = (cv: HTMLCanvasElement): CanvasRenderingContext2D | null => {
  try { return cv.getContext('2d'); } catch { return null; }
};

// low-res pixel budget: a tablet or desktop canvas gets coarser instead of costlier
const BUDGET = 24000, GAP = 40;

// puts each frame on the canvas, blurred by r of its own pixels before the browser scales it up: blurring the
// screen-sized layer every frame was slow on phones. Without canvas filters (older Safari) the layer is blurred instead
function shower(cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D, w: number, h: number, r: number, css: number): (img: ImageData) => void {
  const plain = (img: ImageData) => ctx.putImageData(img, 0, 0);
  if (!r) return plain;
  const src = 'filter' in ctx ? document.createElement('canvas') : null, sctx = src && context(src);
  if (!src || !sctx) { cv.style.filter = `blur(${css}px)`; return plain; }
  src.width = w; src.height = h;
  ctx.filter = `blur(${r}px)`;
  return img => { sctx.putImageData(img, 0, 0); ctx.clearRect(0, 0, w, h); ctx.drawImage(src, 0, 0); };
}

// a noise field drawn at low resolution and scaled up soft; e is the gather / hang / fade envelope, k how much coarser than o.scale it is
export function runNoise(cv: HTMLCanvasElement, host: Element, o: NoiseOptions): () => void {
  const { width: W, height: H } = host.getBoundingClientRect(), k = Math.max(1, Math.sqrt(W * H / (o.scale * o.scale * BUDGET)));
  const w = Math.max(1, Math.ceil(W / (o.scale * k))), h = Math.max(1, Math.ceil(H / (o.scale * k)));
  cv.width = w; cv.height = h;
  const ctx = context(cv);
  if (!ctx) return () => {};
  const img = ctx.createImageData(w, h), show = shower(cv, ctx, w, h, (o.blur ?? 0) / (o.scale * k), o.blur ?? 0);
  const render = (t: number, e: number, dt: number) => {
    o.paint(img.data, w, h, t, e, W, H, k); show(img); o.tick?.(t, e, dt);
  };
  if (!o.animate) { render(0, 1, 0); return () => {}; }
  let id = 0, stopped = false, t0 = -1, due = -Infinity, prevEl = -1, paused = 0, hiddenAt = -1, seen = -1;
  const frame = (now: number) => {
    if (stopped || !o.alive()) return;
    id = requestAnimationFrame(frame);
    // browsers suspend rAF in hidden tabs, so a long gap between callbacks counts as paused too
    const gap = seen < 0 ? 0 : now - seen;
    seen = now;
    if (document.hidden) { if (hiddenAt < 0) hiddenAt = now; return; }
    if (gap > 1000 && hiddenAt < 0 && t0 >= 0) paused += gap;
    if (hiddenAt >= 0) { if (t0 >= 0) paused += now - hiddenAt; hiddenAt = -1; }
    // one frame every GAP ms on average (25 fps on a 60 Hz screen); after a stall, restart from now rather than catch up
    if (now < due) return;
    due = now - due > GAP ? now + GAP : due + GAP;
    if (t0 < 0) t0 = now;
    const el = now - t0 - paused;
    render(el / 1000, envelope((el % o.period) / o.period), prevEl < 0 ? 0 : (el - prevEl) / 1000);
    prevEl = el;
  };
  id = requestAnimationFrame(frame);
  return () => { if (stopped) return; stopped = true; cancelAnimationFrame(id); };
}
