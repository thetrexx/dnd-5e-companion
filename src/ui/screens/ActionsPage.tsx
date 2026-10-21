import type { ClassId } from '../../data/types';
import { actionSections } from '../../logic/sections';
import { effectiveSub } from '../../logic/subclass';
import { SectionPage } from './SectionPage';

export function ActionsPage(p: { cls: ClassId; level: number; sub?: string; section?: string }) {
  const s = effectiveSub(p.cls, p.level, p.sub);
  return <SectionPage title="Actions" kind="feature" cls={p.cls} level={p.level} sub={s?.id} section={p.section}
    sections={actionSections(p.cls, p.level, s?.id)} />;
}
