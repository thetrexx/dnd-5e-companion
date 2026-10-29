// one requestAnimationFrame loop shared by every strand layer; rAF does not fire in a hidden tab
export const STRAND_FPS = 30;

const subs = new Set<(t: number) => void>();
let id = 0, last = -Infinity;

function tick(ts: number) {
  id = 0;
  if (!subs.size) return;
  if (ts - last >= 1000 / STRAND_FPS - 5) { last = ts; for (const cb of [...subs]) cb(ts / 1000); }
  if (subs.size) id = requestAnimationFrame(tick);
}

// calls cb with t in seconds, about STRAND_FPS times a second (5 ms slack so 60 Hz frame jitter does not drop to 20); the returned function unsubscribes
export function onStrandFrame(cb: (t: number) => void): () => void {
  subs.add(cb);
  if (!id) id = requestAnimationFrame(tick);
  return () => {
    subs.delete(cb);
    if (!subs.size && id) { cancelAnimationFrame(id); id = 0; last = -Infinity; }
  };
}
