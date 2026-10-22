import { useState } from 'preact/hooks';
import { DATA } from '../../data';
import { totalLevel } from '../../character/derive';
import type { CharClass } from '../../character/types';
import type { ClassId } from '../../data/types';
import { Separator } from '../Separator';
import type { StepProps } from './Editor';

const ORN = '☙';
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);

export function StepClasses({ ch, update }: StepProps) {
  const free = DATA.classes.filter((c) => !ch.classes.some((x) => x.cls === c.id));
  const [pick, setPick] = useState('');
  const [removing, setRemoving] = useState<ClassId | null>(null);
  const chosen = free.some((c) => c.id === pick) ? pick : free[0]?.id ?? '';
  const set = (i: number, patch: Partial<CharClass>) => update({ ...ch, classes: ch.classes.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const total = totalLevel(ch);
  return (
    <div class="step">
      <Separator ornament={ORN} label="Classes" full />
      {ch.classes.map((cc, i) => {
        const def = DATA.classes.find((c) => c.id === cc.cls);
        if (!def) return null;
        return (
          <div key={cc.cls} class="class-block">
            <h2 class="class-name">{def.name}</h2>
            <label class="field">{def.name} level
              <select value={cc.level} onChange={(e) => set(i, { level: Number((e.currentTarget as HTMLSelectElement).value) })}>
                {LEVELS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            {cc.level >= def.subclassLevel && (
              <label class="field">{def.name} {def.subclassLabel}
                <select value={cc.sub ?? ''} onChange={(e) => set(i, { sub: (e.currentTarget as HTMLSelectElement).value || undefined })}>
                  <option value="">No {def.subclassLabel}</option>
                  {DATA.subclasses.filter((s) => s.cls === cc.cls).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            )}
            <button type="button" class={`danger${removing === cc.cls ? ' sure' : ''}`}
              onClick={() => (removing === cc.cls ? update({ ...ch, classes: ch.classes.filter((_, j) => j !== i) }) : setRemoving(cc.cls))}>
              {removing === cc.cls ? 'Tap again to remove' : 'Remove'}
            </button>
          </div>
        );
      })}
      {free.length > 0 && (
        <div class="add-class">
          <label class="field">Add a class
            <select value={chosen} onChange={(e) => setPick((e.currentTarget as HTMLSelectElement).value)}>
              {free.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button type="button" class="btn" onClick={() => chosen && update({ ...ch, classes: [...ch.classes, { cls: chosen as ClassId, level: 1 }] })}>Add class</button>
        </div>
      )}
      <p class="note">Character level {total}</p>
      {total > 20 && <p class="warn">Character level can't go above 20.</p>}
      <p class="hint">List the class you started with first.</p>
    </div>
  );
}
