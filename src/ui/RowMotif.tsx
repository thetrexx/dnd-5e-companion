import { useEffect, useRef } from 'preact/hooks';
import type { ClassId } from '../data/types';
import { runLoop } from '../motion/engine';
import { motionMode } from '../motion/mode';
import { ROW_MOTIFS } from '../motion/rowMotifs';
import { ROW_TIMING } from '../motion/types';

// off or no motif for this class: nothing rendered, no effect work
export function RowMotif(p: { cls: ClassId }) {
  const gen = ROW_MOTIFS[p.cls], mode = motionMode(), ref = useRef<SVGSVGElement>(null);
  const on = !!gen && mode !== 'off';
  useEffect(() => {
    const svg = ref.current;
    if (!on || !svg?.parentElement) return;
    const ctrl = new AbortController();
    void runLoop(svg.parentElement, svg, gen, ROW_TIMING, {
      animate: mode === 'animated', alive: () => !ctrl.signal.aborted, signal: ctrl.signal, startDelay: Math.random() * 3500,
    });
    return () => ctrl.abort();
  }, [p.cls, on, mode]);
  if (!on) return null;
  return <svg ref={ref} class="fx-row" aria-hidden="true" style={`--fx-c: var(--${p.cls}-line); --fx-o: var(--${p.cls}-row-o)`} />;
}
