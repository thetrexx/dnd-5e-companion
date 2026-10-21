import { useEffect, useState } from 'preact/hooks';

export type FallbackName = 'spell' | 'action' | 'verbal' | 'somatic' | 'material';

export function fallbackUrl(name: FallbackName): string {
  return `${import.meta.env.BASE_URL}icons/fallback/${name}.svg`;
}

export function Icon(p: { src?: string; fallback: 'spell' | 'action'; alt: string; size: number; class?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [p.src]);
  const src = p.src && !failed ? p.src : fallbackUrl(p.fallback);
  return (
    <img class={p.class} src={src} alt={p.alt} width={p.size} height={p.size} loading="lazy"
      onError={() => setFailed(true)} />
  );
}
