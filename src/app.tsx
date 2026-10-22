import { useEffect, useState } from 'preact/hooks';
import { DATA } from './data';
import { rememberRoute } from './lastRoute';
import { parseHash } from './router';
import { Start } from './ui/screens/Start';
import { LevelPicker } from './ui/screens/LevelPicker';
import { Menu } from './ui/screens/Menu';
import { SubclassPicker } from './ui/screens/SubclassPicker';
import { SpellsPage } from './ui/screens/SpellsPage';
import { ActionsPage } from './ui/screens/ActionsPage';
import { Settings } from './ui/screens/Settings';
import { Card } from './ui/screens/Card';
import { Editor } from './ui/editor/Editor';
import { loadCharacter } from './character/store';
import { MeMenu } from './ui/screens/me/MeMenu';
import { MeSpells } from './ui/screens/me/MeSpells';
import { MeActions } from './ui/screens/me/MeActions';
import { MeCard } from './ui/screens/me/MeCard';
import { Background } from './ui/Background';
import { backgroundClass } from './logic/background';
import { motionMode } from './motion/mode';
import { SETTINGS_EVENT, loadSettings } from './settings/settings';
import type { Route } from './data/types';
import type { Character } from './character/types';

const bgInputs = () => { const s = loadSettings(); return `${s.theme}|${s.strength}`; };

export function App() {
  const [hash, setHash] = useState(location.hash);
  // a saved theme or strength re-renders, so the background follows it at once; other saves leave the screens alone
  const [, setBgInputs] = useState(bgInputs);
  useEffect(() => {
    let current = location.hash;
    const on = () => {
      rememberRoute(current);
      current = location.hash;
      setHash(current);
    };
    const saved = () => setBgInputs(bgInputs());
    addEventListener('hashchange', on);
    addEventListener(SETTINGS_EVENT, saved);
    return () => { removeEventListener('hashchange', on); removeEventListener(SETTINGS_EVENT, saved); };
  }, []);
  const r = parseHash(hash);
  const ch = r.page === 'me' || r.page.startsWith('me-') ? loadCharacter() : null;
  // one background behind every screen: it persists across navigation and restarts only when its key changes
  const kind = backgroundClass(r, ch), theme = loadSettings().theme;
  return (
    <>
      <Background key={`${kind}|${theme}|${motionMode()}`} kind={kind} theme={theme} />
      {screen(r, ch)}
    </>
  );
}

function screen(r: Route, ch: Character | null) {
  if (r.page === 'edit') return <Editor step={r.step} />;
  if (r.page === 'me' || r.page.startsWith('me-')) {
    if (!ch || ch.classes.length === 0) return <Editor step={ch ? 'classes' : 'basics'} />;
    if (r.page === 'me') return <MeMenu ch={ch} />;
    if (r.page === 'me-spells') return <MeSpells ch={ch} section={r.section} />;
    if (r.page === 'me-actions') return <MeActions ch={ch} section={r.section} />;
    if (r.page === 'me-card') return <MeCard ch={ch} kind={r.kind} id={r.id} section={r.section} />;
  }
  if ('cls' in r && !DATA.classes.some((c) => c.id === r.cls)) return <Start />;
  switch (r.page) {
    case 'level': return <LevelPicker cls={r.cls} />;
    case 'subclass': return <SubclassPicker cls={r.cls} level={r.level} />;
    case 'menu': return <Menu cls={r.cls} level={r.level} sub={r.sub} />;
    case 'spells': return <SpellsPage cls={r.cls} level={r.level} sub={r.sub} section={r.section} />;
    case 'actions': return <ActionsPage cls={r.cls} level={r.level} sub={r.sub} section={r.section} />;
    case 'card': return <Card kind={r.kind} id={r.id} cls={r.cls} level={r.level} sub={r.sub} />;
    case 'settings': return <Settings />;
    default: return <Start />;
  }
}
