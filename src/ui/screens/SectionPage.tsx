import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import type { Section } from '../../logic/sections';
import { IconGrid } from '../IconGrid';
import { Separator } from '../Separator';

export function SectionPage(p: {
  title: string; back: { href: string; label: string }; section?: string; sections: Section[];
  empty?: string; head?: ComponentChildren; onPick(id: string, section: string): void;
}) {
  useEffect(() => {
    const el = p.section ? document.getElementById(p.section) : null;
    if (el) el.scrollIntoView();
    else document.getElementById('scroller')?.scrollTo(0, 0);
  }, [p.section, p.back.href, p.title]);
  return (
    <div class="screen fixed">
      <header class="fixed-head">
        <a class="back" href={p.back.href}>{p.back.label}</a>
        {p.head && <div class="head-extra">{p.head}</div>}
        <h1 class="page-title">{p.title}</h1>
      </header>
      <div class="scroller" id="scroller">
        {p.empty ? <p class="empty">{p.empty}</p> : null}
        {p.sections.filter((s) => s.items.length > 0).map((s) => (
          <section key={s.id} id={s.id} class={`sec${s.locked ? ' locked' : ''}`}>
            <Separator ornament={'☙'} label={s.title} sub={s.subtitle}
              color={s.motif ? `var(--${s.motif}-line)` : undefined} />
            {s.locked && <p class="locked-note">{s.locked}</p>}
            <div class="sec-grid">
              <IconGrid items={s.items} tags={s.tags} ringed={s.mine} onPick={(id) => p.onPick(id, s.id)} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
