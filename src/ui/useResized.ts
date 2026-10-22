import { useEffect, useState } from 'preact/hooks';

// counts window resizes and rotations once they settle for 250 ms; a height change under 20% (a phone's address bar
// sliding away while scrolling) does not count; off: no listeners
export function useResized(on: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    let w = innerWidth, h = innerHeight, t: ReturnType<typeof setTimeout> | undefined;
    const settled = () => {
      if (innerWidth === w && Math.abs(innerHeight - h) < h * .2) return;
      w = innerWidth; h = innerHeight; setN((k) => k + 1);
    };
    const fire = () => { clearTimeout(t); t = setTimeout(settled, 250); };
    addEventListener('resize', fire); addEventListener('orientationchange', fire);
    return () => { clearTimeout(t); removeEventListener('resize', fire); removeEventListener('orientationchange', fire); };
  }, [on]);
  return n;
}
