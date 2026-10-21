import type { ClassId } from '../../data/types';
import { actionSections } from '../../logic/sections';
import { SectionPage } from './SectionPage';

export function ActionsPage(p: { cls: ClassId; level: number; section?: string }) {
  return <SectionPage title="Actions" kind="feature" cls={p.cls} level={p.level} section={p.section}
    sections={actionSections(p.cls, p.level)} />;
}
