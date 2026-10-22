import { loadCharacter } from '../../character/store';
import { DATA } from '../../data';
import { CLASS_IDS } from '../../data/validate';
import { toHash } from '../../router';
import { GearButton } from '../GearButton';
import { Icon } from '../Icon';
import { IosTip } from '../IosTip';
import type { ClassId } from '../../data/types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Start() {
  const ch = loadCharacter();
  const ready = !!ch && ch.classes.length > 0;
  return (
    <div class="screen start">
      <GearButton />
      <h1 class="start-title">Spellbook &amp; Steel</h1>
      <div class="tiles">
        <button type="button" class="tile wide"
          onClick={() => { location.hash = ready ? '#/me' : '#/edit/basics'; }}>
          <span>My Character Sheet</span>
          <small>{ch?.name || 'Create your character'}</small>
        </button>
        {CLASS_IDS.map((id) => {
          const c = DATA.classes.find((x) => x.id === id);
          return (
            <button type="button" key={id} class="tile" disabled={!c} style={{ '--tile': `var(--${id}-line)` }}
              onClick={() => { location.hash = toHash({ page: 'level', cls: id as ClassId }); }}>
              {c && <Icon src={c.plainIcon} fallback="spell" alt="" size={36} />}
              <span>{c ? c.name : cap(id)}</span>
            </button>
          );
        })}
      </div>
      <IosTip />
    </div>
  );
}
