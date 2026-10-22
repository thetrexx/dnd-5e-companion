import { useState } from 'preact/hooks';
import { DATA } from '../../data';
import { castingInfo, pickCounts, pickableSpells } from '../../character/derive';
import { autoSpells } from '../../character/grants';
import type { CharClass } from '../../character/types';
import { IconGrid } from '../IconGrid';
import { Separator } from '../Separator';
import { GrantPicker } from './GrantPicker';
import type { StepProps } from './Editor';

const ORN = '☙';
const count = (label: string, n: number, of: number, tail = '') => `${label} ${n} of ${of}${tail}${n > of ? ' more than usual' : ''}`;

function ClassSpells({ ch, update, cc, i }: StepProps & { cc: CharClass; i: number }) {
  const [q, setQ] = useState('');
  const info = castingInfo(cc);
  const def = DATA.classes.find((c) => c.id === cc.cls);
  if (!info || !def) return null;
  const counts = pickCounts(ch, cc.cls);
  const mine = ch.spells.filter((s) => s.cls === cc.cls);
  const picked = mine.filter((s) => !s.extra).map((s) => s.id);
  const extras = mine.filter((s) => s.extra).map((s) => s.id);
  const pickable = pickableSpells(cc);
  const onList = new Set(pickable.map((p) => p.spell.id));
  const always = autoSpells(ch).filter((a) => a.source.cls === cc.cls && a.unlocked).map((a) => a.spell);
  // always-prepared spells aren't offered again, unless picked before (so the pick can be undone)
  const grid = pickable.filter((p) => !always.includes(p.spell) || picked.includes(p.spell.id));
  const tags: Record<string, string> = {};
  for (const p of pickable) if (p.tag) tags[p.spell.id] = p.tag;
  const isPrepared = info.prepared !== undefined;
  const limit = isPrepared ? info.prepared! : info.known;
  const start = (def.maxSpellLevel ?? []).findIndex((m) => m >= 1) + 1;
  const line = [
    (info.cantrips > 0 || counts.cantrips > 0) && count('Cantrips', counts.cantrips, info.cantrips),
    info.maxLevel === 0
      ? (start > 0 ? `Spells start at ${def.name} ${start}` : 'No spells yet')
      : [limit !== undefined && count('Spells', counts.spells, limit, isPrepared ? ' prepared' : ' known'), `up to level ${info.maxLevel}`],
  ].flat().filter(Boolean).join(' · ');
  const toggle = (id: string) => update({ ...ch, spells: picked.includes(id)
    ? ch.spells.filter((s) => !(s.id === id && s.cls === cc.cls && !s.extra))
    : [...ch.spells, { id, cls: cc.cls }] });
  const addExtra = (id: string) => { setQ(''); update({ ...ch, spells: [...ch.spells, { id, cls: cc.cls, extra: true }] }); };
  const dropExtra = (id: string) => update({ ...ch, spells: ch.spells.filter((s) => !(s.id === id && s.cls === cc.cls && s.extra)) });
  const text = q.trim().toLowerCase();
  const found = text ? DATA.spells.filter((s) => s.name.toLowerCase().includes(text) && !onList.has(s.id) && !extras.includes(s.id)).slice(0, 20) : [];
  const levels = Array.from({ length: info.maxLevel + 1 }, (_, n) => n);
  const setMod = (v: string) => {
    const n = v === '' ? NaN : Math.min(10, Math.max(-5, Math.round(Number(v))));
    update({ ...ch, classes: ch.classes.map((c, j) => (j === i ? { ...c, mod: Number.isNaN(n) ? undefined : n } : c)) });
  };
  return (
    <div class="class-block">
      <Separator ornament={ORN} label={def.name} full />
      {isPrepared && (
        <label class="field">{info.ability.toUpperCase()} modifier
          <input type="number" min={-5} max={10} value={cc.mod ?? ''} onInput={(e) => setMod((e.currentTarget as HTMLInputElement).value)} />
        </label>
      )}
      <p class={counts.cantrips > info.cantrips || (limit !== undefined && counts.spells > limit) ? 'warn' : 'note'}>{line}</p>
      {always.length > 0 && (
        <>
          <h3 class="lvl-name">Always prepared</h3>
          <IconGrid items={always} ringed={always.map((s) => s.id)} onPick={() => {}} />
        </>
      )}
      {levels.map((n) => {
        const items = grid.filter((p) => p.spell.level === n).map((p) => p.spell);
        return items.length > 0 && (
          <div key={n}>
            <h3 class="lvl-name">{n === 0 ? 'Cantrips' : `Level ${n}`}</h3>
            <IconGrid items={items} tags={tags} ringed={picked} onPick={toggle} />
          </div>
        );
      })}
      {extras.length > 0 && (
        <IconGrid items={DATA.spells.filter((s) => extras.includes(s.id))} ringed={extras} onPick={dropExtra} />
      )}
      <label class="field">Add a spell from another list
        <input type="search" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
      </label>
      {found.length > 0 && <IconGrid items={found} onPick={addExtra} />}
    </div>
  );
}

export function StepSpells(p: StepProps) {
  const casters = p.ch.classes.map((cc, i) => ({ cc, i })).filter(({ cc }) => castingInfo(cc));
  return (
    <div class="step">
      {casters.length === 0 && <p class="note">None of your classes cast spells.</p>}
      {casters.map(({ cc, i }) => <ClassSpells key={cc.cls} {...p} cc={cc} i={i} />)}
      <GrantPicker {...p} step="spells" />
    </div>
  );
}
