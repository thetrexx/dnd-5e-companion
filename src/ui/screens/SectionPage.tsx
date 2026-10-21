import { useEffect } from 'preact/hooks';
import type { ClassId, Route } from '../../data/types';
import type { Section } from '../../logic/sections';
import { toHash } from '../../router';
import { IconGrid } from '../IconGrid';
import { Separator } from '../Separator';

export function SectionPage(p: {
  title: string; cls: ClassId; level: number; section?: string; sections: Section[];
  kind: 'spell' | 'feature'; empty?: string;
}) {
  useEffect(() => {
    const el = p.section ? document.getElementById(p.section) : null;
    if (el) el.scrollIntoView();
    else document.getElementById('scroller')?.scrollTo(0, 0);
  }, [p.section, p.cls, p.level, p.title]);
  return (
    <div class="screen fixed">
      <header class="fixed-head">
        <a class="back" href={toHash({ page: 'menu', cls: p.cls, level: p.level })}>‹ Menu</a>
        <h1 class="page-title">{p.title}</h1>
      </header>
      <div class="scroller" id="scroller">
        {p.empty ? <p class="empty">{p.empty}</p> : null}
        {p.sections.map((s) => (
          <section key={s.id} id={s.id} class={`sec${s.locked ? ' locked' : ''}`}>
            <Separator ornament={'☙'} label={s.title} sub={s.subtitle}
              color={s.motif ? `var(--${s.motif}-line)` : undefined} />
            {s.locked && <p class="locked-note">{s.locked}</p>}
            <div class="sec-grid">
              <IconGrid items={s.items} onPick={(id) => {
                const r: Route = { page: 'card', kind: p.kind, id, cls: p.cls, level: p.level };
                location.hash = toHash(r);
              }} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
