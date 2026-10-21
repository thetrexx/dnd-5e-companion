import { DATA } from '../../data';
import type { ClassId } from '../../data/types';
import { subclassesAt } from '../../logic/subclass';
import { toHash } from '../../router';

export function LevelPicker(p: { cls: ClassId }) {
  const c = DATA.classes.find((x) => x.id === p.cls);
  const pick = (n: number) => {
    location.hash = toHash(subclassesAt(p.cls, n).length > 0
      ? { page: 'subclass', cls: p.cls, level: n }
      : { page: 'menu', cls: p.cls, level: n });
  };
  return (
    <div class="screen">
      <a class="back" href={toHash({ page: 'start' })}>‹ Back</a>
      <h1 class="page-title">{c ? c.name : p.cls}</h1>
      <p class="hint">Pick a level</p>
      <div class="levels">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <button type="button" key={n} class="lvl" onClick={() => pick(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}
