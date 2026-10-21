import { useEffect, useState } from 'preact/hooks';

export type School = 'abjuration' | 'conjuration' | 'divination' | 'enchantment' | 'evocation' | 'illusion' | 'necromancy' | 'transmutation';
export type FallbackName = 'spell' | 'action' | 'verbal' | 'somatic' | 'material' | `school-${School}`;
const SCHOOLS: string[] = ['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation'];

/** Self-hosted fallback for a spell: its school glyph, or the generic spell icon for an unknown school. */
export function spellFallback(s: { school: string }): FallbackName {
  const k = s.school.toLowerCase();
  return SCHOOLS.includes(k) ? (`school-${k}` as FallbackName) : 'spell';
}

export function fallbackUrl(name: FallbackName): string {
  return `${import.meta.env.BASE_URL}icons/fallback/${name}.svg`;
}

export function Icon(p: { src?: string; fallback: FallbackName; alt: string; size: number; class?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [p.src]);
  const src = p.src && !failed ? p.src : fallbackUrl(p.fallback);
  return (
    <img class={p.class} src={src} alt={p.alt} width={p.size} height={p.size} loading="lazy"
      onError={() => setFailed(true)} />
  );
}
