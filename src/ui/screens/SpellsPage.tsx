import { DATA } from '../../data';
import type { ClassId } from '../../data/types';
import { spellSections } from '../../logic/sections';
import { effectiveSub } from '../../logic/subclass';
import { SectionPage } from './SectionPage';

export function SpellsPage(p: { cls: ClassId; level: number; sub?: string; section?: string }) {
  const c = DATA.classes.find((x) => x.id === p.cls)!;
  const s = effectiveSub(p.cls, p.level, p.sub);
  const empty = c.caster === 'none' && !s?.casting ? `${c.name}s don't cast spells` : undefined;
  return <SectionPage title="Spells" kind="spell" cls={p.cls} level={p.level} sub={s?.id} section={p.section}
    sections={empty ? [] : spellSections(p.cls, p.level, s?.id)} empty={empty} />;
}
