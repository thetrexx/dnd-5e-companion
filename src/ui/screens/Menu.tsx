import { DATA } from '../../data';
import type { ClassId } from '../../data/types';
import { menuRows } from '../../logic/menu';
import type { MenuRow } from '../../logic/menu';
import { toHash } from '../../router';
import { GearButton } from '../GearButton';
import { Separator } from '../Separator';

export const SLOT_ICON = 'https://bg3.wiki/w/images/e/ef/Spell_Slot_Icon.png';

function rowStyle(r: MenuRow) {
  const base = r.motif ? `var(--${r.motif})` : 'var(--accent)';
  const amount = r.motif ? `calc(var(--${r.motif}-row-o) * var(--row-motif-scale))` : 'var(--row-wash)';
  return { background: `linear-gradient(90deg, color-mix(in srgb, ${base} ${amount}, var(--surface)), var(--surface) 80%)` };
}

export function Menu(p: { cls: ClassId; level: number }) {
  const c = DATA.classes.find((x) => x.id === p.cls)!;
  return (
    <div class="screen">
      <GearButton />
      <a class="back" href={toHash({ page: 'level', cls: p.cls })}>‹ Level</a>
      <Separator ornament={'\u{1F65A}'} label={c.name} full />
      <p class="hint center">Level {p.level}</p>
      <div class="rows">
        {menuRows(p.cls, p.level).map((r) =>
          r.kind === 'separator' ? (
            <Separator key="sep" ornament={'☙'} label={r.label} full />
          ) : (
            <button type="button" key={r.kind + r.label} class={`row${r.dimmed ? ' dim' : ''}`} style={rowStyle(r)}
              onClick={() => { if (r.target) location.hash = toHash(r.target); }}>
              <span class="rl">
                {r.icon?.type === 'slot' ? (
                  <span class="slot"><img src={SLOT_ICON} alt="" width={20} height={20} /><b>{r.icon.level}</b></span>
                ) : r.icon ? (
                  <img class="ri" src={r.icon.src} alt="" width={24} height={24} />
                ) : null}
                <span>{r.label}</span>
              </span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
