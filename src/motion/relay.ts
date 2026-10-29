import { watchScreen } from './engine';

// A list's rows take turns: one plays while the rest stand still, so a long list costs about one row (every row
// animating at once was too slow on phones). Turns pass down the list in page order and wrap round; rows off screen
// are skipped, a row that leaves the screen mid-turn ends its turn, and a hidden page holds the next one.
type Turn = (sig: AbortSignal) => Promise<void>;
interface Seat { el: Element; turn: Turn; shown: boolean; ctrl?: AbortController; unwatch(): void }

const FIRST = 1200, GAP = 300; // ms of stillness before the first turn and between turns
const seats: Seat[] = [];
let running = false, last: Element | undefined, wake = () => {};

// resolves after ms, or at once when something changes (a row joins, leaves, scrolls on or off, the page shows)
const nap = (ms?: number) => new Promise<void>(res => {
  const t = ms === undefined ? undefined : setTimeout(go, ms);
  function go() { clearTimeout(t); wake = () => {}; res(); }
  wake = go;
});
const nudge = () => wake();
// waits ms, cut short only if every row leaves
async function rest(ms: number) {
  const until = Date.now() + ms;
  while (seats.length && Date.now() < until) await nap(until - Date.now());
}

// the next row on screen after the last one to play, in page order
function next(): Seat | undefined {
  const shown = seats.filter(s => s.shown)
    .sort((a, b) => a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  const from = last?.isConnected ? last : undefined;
  return (from && shown.find(s => from.compareDocumentPosition(s.el) & Node.DOCUMENT_POSITION_FOLLOWING)) || shown[0];
}

async function relay() {
  running = true;
  document.addEventListener('visibilitychange', nudge);
  await rest(FIRST);
  while (seats.length) {
    const s = document.hidden ? undefined : next();
    if (!s) { await nap(); continue; }
    last = s.el;
    const ctrl = s.ctrl = new AbortController();
    await s.turn(ctrl.signal).catch(() => {});
    if (s.ctrl === ctrl) s.ctrl = undefined;
    await rest(GAP);
  }
  document.removeEventListener('visibilitychange', nudge);
  running = false; last = undefined;
}

// el takes turn(sig) when its turn comes; returns leave, which also ends a turn in progress
export function joinRelay(el: Element, turn: Turn): () => void {
  const seat: Seat = { el, turn, shown: typeof IntersectionObserver !== 'function', unwatch: () => {} };
  seat.unwatch = watchScreen(el)(on => { seat.shown = on; if (!on) seat.ctrl?.abort(); nudge(); });
  seats.push(seat);
  if (running) nudge(); else void relay();
  return () => {
    const i = seats.indexOf(seat);
    if (i < 0) return;
    seats.splice(i, 1); seat.unwatch(); seat.ctrl?.abort(); nudge();
  };
}
