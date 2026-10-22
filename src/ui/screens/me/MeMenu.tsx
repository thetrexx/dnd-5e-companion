import { classLine } from '../../../character/derive';
import type { Character } from '../../../character/types';
import { charMenuRows } from '../../../character/view';
import { MenuView } from '../../MenuView';

export function MeMenu(p: { ch: Character }) {
  return <MenuView title={p.ch.name || 'My Character'} subline={classLine(p.ch)} back={{ href: '#/', label: '‹ Home' }}
    rows={charMenuRows(p.ch)} extra={<a class="edit-link" href="#/edit/basics">Edit character</a>} />;
}
