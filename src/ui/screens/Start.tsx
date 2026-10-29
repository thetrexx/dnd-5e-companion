import { classLine } from '../../character/derive';
import { loadCharacter } from '../../character/store';
import { classesAZ } from '../../data';
import { menuMotif, menuTone } from '../../motion/menuMotifs';
import { motionMode } from '../../motion/mode';
import { toHash } from '../../router';
import { GearButton } from '../GearButton';
import { Icon } from '../Icon';
import { IosTip } from '../IosTip';
import { PersonEditIcon } from '../PersonEditIcon';
import { RowMotif } from '../RowMotif';
import { Strands } from '../Strands';

export function Start() {
  const ch = loadCharacter();
  const ready = !!ch && ch.classes.length > 0;
  return (
    <div class="screen start">
      <GearButton />
      <h1 class="start-title">D&amp;D 5E Cheat Sheet</h1>
      <div class="start-list">
        {/* no strands: gold lines, a faint wash and, when animated, a shine sweeping across */}
        <button type="button" class={`start-me${motionMode() === 'animated' ? ' shine' : ''}`}
          onClick={() => { location.hash = ready ? '#/me' : '#/edit/basics'; }}>
          <PersonEditIcon class="start-me-icon" />
          <span class="start-me-text">
            <span>My Character Sheet</span>
            <small>{ch?.name || (ready ? classLine(ch) : 'Create your character')}</small>
          </span>
        </button>
        {/* back to front: the strands, the class art, then icon and name. The art holds still here: thirteen animated
            rows were too slow on phones, and the sliding strands carry the motion */}
        {classesAZ().map((c) => (
          <button type="button" key={c.id} class="start-cls"
            onClick={() => { location.hash = toHash({ page: 'level', cls: c.id }); }}>
            <Strands cls={c.id} />
            <RowMotif cls={c.id} gen={menuMotif(c.id)} tone={menuTone(c.id)} still />
            <span class="start-cls-l"><Icon src={c.plainIcon} fallback="spell" alt="" size={38} />{c.name}</span>
          </button>
        ))}
      </div>
      <IosTip />
    </div>
  );
}
