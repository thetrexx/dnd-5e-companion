import { DATA } from '../../data';
import type { ClassId } from '../../data/types';
import { spellSections } from '../../logic/sections';
import { SectionPage } from './SectionPage';

export function SpellsPage(p: { cls: ClassId; level: number; section?: string }) {
  const c = DATA.classes.find((x) => x.id === p.cls)!;
  const empty = c.caster === 'none' ? `${c.name}s don't cast spells` : undefined;
  return <SectionPage title="Spells" kind="spell" cls={p.cls} level={p.level} section={p.section}
    sections={empty ? [] : spellSections(p.cls, p.level)} empty={empty} />;
}
