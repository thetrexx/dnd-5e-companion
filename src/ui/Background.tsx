import { useEffect, useRef } from 'preact/hooks';
import { BG_MOTIFS, type BgKey } from '../motion/bgMotifs';
import { runLoop } from '../motion/engine';
import { motionMode, themePx, themeRgb } from '../motion/mode';
import { makeCells, makeNoise, paintBlood, paintMist, stepCells } from '../motion/noise';
import { runNoise } from '../motion/noiseLayer';
import { f1 } from '../motion/parts';
import { BG_TIMING } from '../motion/types';
import { useResized } from './useResized';

const NS = 'http://www.w3.org/2000/svg';
const none = () => {};
interface Layer { animate: boolean; alive(): boolean }

// Warlock: mist gathers from the bottom; skipped when the theme has no mist colour
function mist(cv: HTMLCanvasElement, host: Element, o: Layer): () => void {
  const rgb = themeRgb('--warlock-mist');
  if (!rgb) return none;
  const { fbm } = makeNoise(Math.random);
  return runNoise(cv, host, { scale: 5, period: 17000, blur: themePx('--mist-blur'), ...o, paint: (px, w, h, t, e, _W, _H, k) => paintMist(px, w, h, t, e, fbm, rgb, k) });
}

// Sorcerer: a vein of blood with cells riding it, tumbling as they go
function blood(cv: HTMLCanvasElement, cellSvg: SVGSVGElement, host: Element, o: Layer): () => void {
  const base = themeRgb('--sorcerer-blood'), hi = themeRgb('--sorcerer-blood-hi');
  if (!base || !hi) return none;
  const { fbm } = makeNoise(Math.random), { width: W, height: H } = host.getBoundingClientRect();
  cellSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const cells = makeCells(Math.random, W, 7), gs = cells.map(() => {
    const g = cellSvg.appendChild(document.createElementNS(NS, 'g'));
    for (const [rx, ry, cls] of [[4.2, 3.4, 'cell'], [2, 1.5, 'cell-core']] as const) {
      const e = g.appendChild(document.createElementNS(NS, 'ellipse'));
      e.setAttribute('rx', String(rx)); e.setAttribute('ry', String(ry)); e.setAttribute('class', cls);
    }
    return g;
  });
  const stop = runNoise(cv, host, {
    scale: 4, period: 15000, blur: themePx('--blood-blur'), ...o, paint: (px, w, h, t, e) => paintBlood(px, w, h, t, e, W, H, fbm, base, hi),
    tick: (t, e, dt) => stepCells(cells, dt, t, W, H).forEach((c, i) => {
      gs[i].setAttribute('transform', `translate(${f1(c.x)} ${f1(c.y)}) rotate(${c.rot}) scale(1 ${f1(c.sy)})`);
      gs[i].setAttribute('opacity', f1(e * .85));
    }),
  });
  return () => { stop(); cellSvg.replaceChildren(); };
}

// the current class's line art behind the whole screen, plus its noise layer; off: nothing rendered, no effect work
export function Background(p: { kind: BgKey; theme: string }) {
  const mode = motionMode(), wrap = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null), cells = useRef<SVGSVGElement>(null), sparks = useRef<SVGSVGElement>(null);
  // a resize or rotation restarts the layers at the new size
  const size = useResized(mode !== 'off');
  useEffect(() => {
    const host = wrap.current, bg = svg.current, cv = canvas.current;
    if (mode === 'off' || !host || !bg) return;
    const ctrl = new AbortController(), o: Layer = { animate: mode === 'animated', alive: () => !ctrl.signal.aborted };
    // artificer sparks fly on their own unmasked layer, so the centre fade never dims them
    void runLoop(host, bg, BG_MOTIFS[p.kind], BG_TIMING, { ...o, signal: ctrl.signal, over: sparks.current ?? undefined });
    const stop = !cv ? none : p.kind === 'warlock' ? mist(cv, host, o) : cells.current ? blood(cv, cells.current, host, o) : none;
    return () => { ctrl.abort(); stop(); };
  }, [p.kind, p.theme, mode, size]);
  if (mode === 'off') return null;
  return (
    <div ref={wrap} class="fx-bg-wrap" aria-hidden="true">
      {p.kind === 'sorcerer' && <canvas ref={canvas} class="fx-blood" />}
      {p.kind === 'sorcerer' && <svg ref={cells} class="fx-cells" />}
      {p.kind === 'warlock' && <canvas ref={canvas} class="fx-mist" />}
      <svg ref={svg} class="fx-bg" style={`--fx-c: var(--${p.kind}-line); --fx-o: var(--${p.kind}-bg-o)`} />
      {p.kind === 'artificer' && <svg ref={sparks} class="fx-sparks" />}
    </div>
  );
}
