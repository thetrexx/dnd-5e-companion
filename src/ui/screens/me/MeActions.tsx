import type { Character } from '../../../character/types';
import { charActionSections } from '../../../character/view';
import { toHash } from '../../../router';
import { SectionPage } from '../SectionPage';

export function MeActions(p: { ch: Character; section?: string }) {
  return <SectionPage title="Actions" back={{ href: '#/me', label: '‹ Menu' }} section={p.section}
    sections={charActionSections(p.ch)}
    onPick={(id, section) => { location.hash = toHash({ page: 'me-card', kind: 'feature', id, section }); }} />;
}
