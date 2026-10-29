import { useEffect, useRef, useState } from 'preact/hooks';
import type { ClassId } from '../data/types';
import { watchScreen } from '../motion/engine';
import { motionMode } from '../motion/mode';
import { makeStrands, strandD, strandStops } from '../motion/strands';
import { onStrandFrame } from '../motion/strandLoop';
import { useResized } from './useResized';

interface Dims { W: number; H: number; col: number }

// two soft ribbons behind a class button; drawn once, and animated by the shared loop only in 'animated' mode
export function Strands(p: { cls: ClassId }) {
  const mode = motionMode(), ref = useRef<SVGSVGElement>(null), a = useRef<SVGPathElement>(null), b = useRef<SVGPathElement>(null);
  const strands = useRef<ReturnType<typeof makeStrands> | undefined>(undefined);
  const [dims, setDims] = useState<Dims | null>(null);
  const size = useResized(true);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect(), W = r.width, H = r.height;
    if (!W || !H) { setDims(null); return; }
    const sw = svg.closest('.screen')?.getBoundingClientRect().width;
    const col = sw || W;
    setDims(d => d && d.W === W && d.H === H && d.col === col ? d : { W, H, col });
  }, [size]);
  useEffect(() => {
    if (!dims || !a.current || !b.current) return;
    const { W, H, col } = dims, [sa, sb] = strands.current ??= makeStrands(Math.random), pa = a.current, pb = b.current;
    const draw = (t: number) => { pa.setAttribute('d', strandD(W, H, col, t, sa)); pb.setAttribute('d', strandD(W, H, col, t, sb)); };
    // rAF timestamps share performance.now()'s origin, so the first frame matches what the loop would draw next
    draw(mode === 'animated' ? performance.now() / 1000 : 0);
    if (mode !== 'animated') return;
    let stop: (() => void) | undefined, live = true;
    const run = (shown: boolean) => {
      if (!live) return;
      if (shown) { if (!stop) { draw(performance.now() / 1000); stop = onStrandFrame(draw); } } else { stop?.(); stop = undefined; }
    };
    if (typeof IntersectionObserver !== 'function') run(true);
    const unwatch = watchScreen(ref.current!)(run);
    return () => { live = false; unwatch(); stop?.(); };
  }, [dims, mode, p.cls]);
  const cl = dims ? (dims.W - dims.col) / 2 : 0, x1 = cl - 240, x2 = dims ? cl + dims.col + 240 : 0;
  const stops = (c: string, o: string) => dims && strandStops(dims.col).map(([off, f]) =>
    <stop key={off} offset={off} style={`stop-color:var(${c});stop-opacity:calc(${f} * var(${o}) * var(--motion-i, 1))`} />);
  // viewBox stretches a stale frame over the new size until the debounced resize redraw lands
  return <svg ref={ref} class="strands" aria-hidden="true" viewBox={dims ? `0 0 ${dims.W} ${dims.H}` : undefined} preserveAspectRatio="none">
    <defs>
      <linearGradient id={`sa-${p.cls}`} gradientUnits="userSpaceOnUse" x1={x1} x2={x2} y1="0" y2="0">{stops(`--${p.cls}`, '--strand-a-o')}</linearGradient>
      <linearGradient id={`sb-${p.cls}`} gradientUnits="userSpaceOnUse" x1={x1} x2={x2} y1="0" y2="0">{stops(`--${p.cls}-line`, '--strand-b-o')}</linearGradient>
      <filter id={`strand-blur-${p.cls}`} x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter>
    </defs>
    <path ref={a} fill={`url(#sa-${p.cls})`} filter={`url(#strand-blur-${p.cls})`} />
    <path ref={b} fill={`url(#sb-${p.cls})`} filter={`url(#strand-blur-${p.cls})`} />
  </svg>;
}
