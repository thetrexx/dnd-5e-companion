import { useEffect, useRef } from 'preact/hooks';
import type { ClassId } from '../data/types';
import { onScreen, runLoop } from '../motion/engine';
import { motionMode } from '../motion/mode';
import { ROW_MOTIFS } from '../motion/rowMotifs';
import { ROW_TIMING } from '../motion/types';
import { useResized } from './useResized';

// off or no motif for this class: nothing rendered, no effect work
export function RowMotif(p: { cls: ClassId }) {
  const gen = ROW_MOTIFS[p.cls], mode = motionMode(), ref = useRef<SVGSVGElement>(null);
  const on = !!gen && mode !== 'off';
  // the static frame redraws at the new size; an animated row redraws every cycle anyway
  const size = useResized(on && mode === 'static');
  useEffect(() => {
    const svg = ref.current, row = svg?.parentElement;
    if (!on || !row) return;
    const ctrl = new AbortController();
    void runLoop(row, svg, gen, ROW_TIMING, {
      animate: mode === 'animated', alive: () => !ctrl.signal.aborted, signal: ctrl.signal, startDelay: Math.random() * 3500, gate: onScreen(row),
    });
    return () => ctrl.abort();
  }, [p.cls, on, mode, size]);
  if (!on) return null;
  return <svg ref={ref} class="fx-row" aria-hidden="true" style={`--fx-c: var(--${p.cls}-line); --fx-o: var(--${p.cls}-row-o)`} />;
}
