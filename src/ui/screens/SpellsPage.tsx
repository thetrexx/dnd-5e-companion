import { DATA } from '../../data';
import type { ClassId } from '../../data/types';
import { spellSections } from '../../logic/sections';
import { effectiveSub } from '../../logic/subclass';
import { toHash } from '../../router';
import { SectionPage } from './SectionPage';

export function SpellsPage(p: { cls: ClassId; level: number; sub?: string; section?: string }) {
  const c = DATA.classes.find((x) => x.id === p.cls)!;
  const s = effectiveSub(p.cls, p.level, p.sub);
  const empty = c.caster === 'none' && !s?.casting ? `${c.name}s don't cast spells` : undefined;
  const withSub = s ? { sub: s.id } : {};
  return <SectionPage title="Spells" section={p.section}
    back={{ href: toHash({ page: 'menu', cls: p.cls, level: p.level, ...withSub }), label: '‹ Menu' }}
    sections={empty ? [] : spellSections(p.cls, p.level, s?.id)} empty={empty}
    onPick={(id) => { location.hash = toHash({ page: 'card', kind: 'spell', id, cls: p.cls, level: p.level, ...withSub }); }} />;
}
