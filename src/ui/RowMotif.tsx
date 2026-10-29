import { useEffect, useRef } from 'preact/hooks';
import type { ClassId } from '../data/types';
import { canAnimate, drawStill, playTurn } from '../motion/engine';
import { motionMode } from '../motion/mode';
import { joinRelay } from '../motion/relay';
import { ROW_MOTIFS } from '../motion/rowMotifs';
import { ROW_TIMING, type Gen } from '../motion/types';
import { useResized } from './useResized';

// off or no motif for this class: nothing rendered, no effect work
// gen and tone (a token name, no var()) override the class's row art and its line colour; still shows the still frame
// even when animated
export function RowMotif(p: { cls: ClassId; gen?: Gen; tone?: string; still?: boolean }) {
  const gen = p.gen ?? ROW_MOTIFS[p.cls], tone = p.tone ?? `--${p.cls}-line`, ref = useRef<SVGSVGElement>(null);
  const mode = p.still && motionMode() === 'animated' ? 'static' : motionMode();
  const on = !!gen && mode !== 'off';
  // drawn still, and redrawn at the new size after a resize
  const size = useResized(on);
  useEffect(() => {
    const svg = ref.current, row = svg?.parentElement;
    if (!on || !row) return;
    let d = drawStill(row, svg, gen);
    if (mode !== 'animated' || !canAnimate()) return;
    // animated, the rows take turns redrawing (see relay.ts)
    return joinRelay(row, async sig => { d = await playTurn(row, svg, gen, ROW_TIMING, d, { signal: sig }); });
  }, [p.cls, gen, on, mode, size]);
  if (!on) return null;
  return <svg ref={ref} class="fx-row" aria-hidden="true" style={`--fx-c: var(${tone}); --fx-o: var(--${p.cls}-row-o)`} />;
}
