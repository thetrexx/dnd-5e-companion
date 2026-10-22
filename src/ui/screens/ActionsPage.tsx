import type { ClassId } from '../../data/types';
import { actionSections } from '../../logic/sections';
import { effectiveSub } from '../../logic/subclass';
import { toHash } from '../../router';
import { SectionPage } from './SectionPage';

export function ActionsPage(p: { cls: ClassId; level: number; sub?: string; section?: string }) {
  const s = effectiveSub(p.cls, p.level, p.sub);
  const withSub = s ? { sub: s.id } : {};
  return <SectionPage title="Actions" section={p.section}
    back={{ href: toHash({ page: 'menu', cls: p.cls, level: p.level, ...withSub }), label: '‹ Menu' }}
    sections={actionSections(p.cls, p.level, s?.id)}
    onPick={(id) => { location.hash = toHash({ page: 'card', kind: 'feature', id, cls: p.cls, level: p.level, ...withSub }); }} />;
}
