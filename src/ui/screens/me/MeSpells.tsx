import { useEffect, useState } from 'preact/hooks';
import type { Character } from '../../../character/types';
import { charSpellSections, hasPickedSpells } from '../../../character/view';
import { toHash } from '../../../router';
import { loadSettings, saveSettings } from '../../../settings/settings';
import type { SpellView } from '../../../settings/settings';
import { SectionPage } from '../SectionPage';

const has = (ch: Character, view: SpellView, section: string) => charSpellSections(ch, view).some((s) => s.id === section);

export function MeSpells(p: { ch: Character; section?: string }) {
  const picked = hasPickedSpells(p.ch);
  // a jump to a section My hides opens All, and keeps it
  const hidden = () => picked && !!p.section && loadSettings().spellView === 'mine'
    && !has(p.ch, 'mine', p.section) && has(p.ch, 'all', p.section);
  const [pref, setPref] = useState<SpellView>(() => (hidden() ? 'all' : loadSettings().spellView));
  // keyed on the character's content: a re-render with an equal character must not force All again
  const chKey = JSON.stringify(p.ch);
  useEffect(() => {
    if (hidden()) { saveSettings({ ...loadSettings(), spellView: 'all' }); setPref('all'); }
  }, [p.section, chKey]);
  const view: SpellView = picked ? pref : 'all';
  const set = (v: SpellView) => { saveSettings({ ...loadSettings(), spellView: v }); setPref(v); };
  const btn = (v: SpellView, label: string) => (
    <button type="button" class="seg-btn" aria-pressed={view === v} onClick={() => set(v)}>{label}</button>
  );
  return <SectionPage title="Spells" back={{ href: '#/me', label: '‹ Menu' }} section={p.section}
    head={picked ? <div class="seg">{btn('mine', 'My spells')}{btn('all', 'All')}</div> : undefined}
    sections={charSpellSections(p.ch, view)}
    onPick={(id, section) => { location.hash = toHash({ page: 'me-card', kind: 'spell', id, section }); }} />;
}
