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

export function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    let current = location.hash;
    const on = () => {
      rememberRoute(current);
      current = location.hash;
      setHash(current);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const r = parseHash(hash);
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
