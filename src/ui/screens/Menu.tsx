import { DATA } from '../../data';
import type { ClassId } from '../../data/types';
import { menuRows, WARLOCK_SLOT_ICON } from '../../logic/menu';
import { effectiveSub } from '../../logic/subclass';
import type { MenuRow } from '../../logic/menu';
import { toHash } from '../../router';
import { GearButton } from '../GearButton';
import { useState } from 'preact/hooks';
import { Icon } from '../Icon';
import { Separator } from '../Separator';

export const SLOT_ICON = 'https://bg3.wiki/w/images/e/ef/Spell_Slot_Icon.png';

function rowStyle(r: MenuRow) {
  const base = r.motif ? `var(--${r.motif})` : 'var(--accent)';
  const amount = r.motif ? `calc(var(--${r.motif}-row-o) * var(--row-motif-scale))` : 'var(--row-wash)';
  return { background: `linear-gradient(90deg, color-mix(in srgb, ${base} ${amount}, var(--surface)), var(--surface) 80%)` };
}

function SlotIcon(p: { level: number; warlock?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <span class="slot">
      {!failed && <img src={p.warlock ? WARLOCK_SLOT_ICON : SLOT_ICON} alt="" width={20} height={20} onError={() => setFailed(true)} />}
      <b>{p.level}</b>
    </span>
  );
}

export function Menu(p: { cls: ClassId; level: number; sub?: string }) {
  const c = DATA.classes.find((x) => x.id === p.cls)!;
  const s = effectiveSub(p.cls, p.level, p.sub);
  return (
    <div class="screen">
      <GearButton />
      <a class="back" href={toHash({ page: 'level', cls: p.cls })}>‹ Level</a>
      <Separator ornament={'\u{1F65A}'} label={c.name} full />
      <p class="hint center">{`Level ${p.level}${s ? ` · ${s.name}` : ''}`}</p>
      <div class="rows">
        {menuRows(p.cls, p.level, s?.id).map((r) =>
          r.kind === 'separator' ? (
            <Separator key="sep" ornament={'☙'} label={r.label} full />
          ) : (
            <a key={r.kind + r.label} class={`row${r.dimmed ? ' dim' : ''}`} style={rowStyle(r)}
              href={r.target ? toHash(r.target) : undefined}>
              <span class="rl">
                {r.icon?.type === 'slot' ? (
                  <SlotIcon level={r.icon.level} warlock={r.icon.warlock} />
                ) : r.icon ? (
                  <Icon class="ri" src={r.icon.src} fallback="action" alt="" size={24} />
                ) : null}
                <span>{r.label}</span>
              </span>
            </a>
          ),
        )}
      </div>
    </div>
  );
}
