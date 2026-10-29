import { useEffect, useRef, useState } from 'preact/hooks';
import type { ClassId } from '../data/types';
import { motionMode } from '../motion/mode';
import { STRAND_TILE, makeStrands, strandMask, strandOutline, strandSpeed, type Strand } from '../motion/strands';
import { useResized } from './useResized';

interface Dims { W: number; H: number; col: number }

const RES = .5; // the strands are blurred, so half resolution looks the same at a quarter of the pixels

// one strand, blurred, along a strip a window wide plus one tile
function paint(cv: HTMLCanvasElement, W: number, H: number, s: Strand, colour: string) {
  const w = W + STRAND_TILE;
  cv.width = Math.ceil(w * RES); cv.height = Math.ceil(H * RES);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.scale(RES, RES);
  ctx.filter = `blur(${2.2 * RES}px)`;
  ctx.fillStyle = colour;
  const pts = strandOutline(w, H, s);
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.top) : ctx.moveTo(p.x, p.top));
  for (let i = pts.length; i--;) ctx.lineTo(pts[i]!.x, pts[i]!.bot);
  ctx.closePath();
  ctx.fill();
}

// two soft ribbons behind a class button. Redrawing them every frame was too slow on phones, so each is painted
// once (again only after a resize) and, when animated, slid sideways by a CSS transform the compositor runs alone
export function Strands(p: { cls: ClassId }) {
  const ref = useRef<HTMLDivElement>(null), a = useRef<HTMLCanvasElement>(null), b = useRef<HTMLCanvasElement>(null);
  const strands = useRef<[Strand, Strand] | undefined>(undefined);
  const [dims, setDims] = useState<Dims | null>(null);
  const size = useResized(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect(), W = r.width, H = r.height;
    if (!W || !H) { setDims(null); return; }
    const sw = el.closest('.screen')?.getBoundingClientRect().width;
    const col = sw || W;
    setDims(d => d && d.W === W && d.H === H && d.col === col ? d : { W, H, col });
  }, [size]);
  const [sa, sb] = strands.current ??= makeStrands(Math.random);
  useEffect(() => {
    if (!dims || !a.current || !b.current) return;
    const tokens = getComputedStyle(document.documentElement), { W, H } = dims;
    paint(a.current, W, H, sa, tokens.getPropertyValue(`--${p.cls}`).trim());
    paint(b.current, W, H, sb, tokens.getPropertyValue(`--${p.cls}-line`).trim());
  }, [dims, p.cls]);
  const animated = motionMode() === 'animated';
  // the strip shifts one tile per cycle, the direction and pace its strand's
  const slide = (s: Strand, k: string) => {
    const v = strandSpeed(s);
    return animated
      ? { class: `${k} strand-${v > 0 ? 'l' : 'r'}`, style: `animation-duration:${(STRAND_TILE / Math.abs(v)).toFixed(2)}s` }
      : { class: k };
  };
  // the strength fade across the window stays put: a mask on the frame, not on the strips
  const style = `--strand-tile:${STRAND_TILE}px${dims ? `;--strand-mask:${strandMask(dims.W, dims.col)}` : ''}`;
  return <div ref={ref} class="strands" aria-hidden="true" style={style}>
    <canvas ref={a} {...slide(sa, 'strand-a')} />
    <canvas ref={b} {...slide(sb, 'strand-b')} />
  </div>;
}
