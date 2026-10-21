import { DATA } from '../../data';
import type { ClassId } from '../../data/types';
import { subclassesAt } from '../../logic/subclass';
import { toHash } from '../../router';
import { Icon } from '../Icon';

export function SubclassPicker(p: { cls: ClassId; level: number }) {
  const c = DATA.classes.find((x) => x.id === p.cls)!;
  const go = (sub?: string) => {
    location.hash = toHash(sub ? { page: 'menu', cls: p.cls, level: p.level, sub } : { page: 'menu', cls: p.cls, level: p.level });
  };
  return (
    <div class="screen">
      <a class="back" href={toHash({ page: 'level', cls: p.cls })}>‹ Level</a>
      <h1 class="page-title">{c.name}</h1>
      <p class="hint">Pick a {c.subclassLabel}</p>
      <div class="rows">
        {subclassesAt(p.cls, p.level).map((s) => (
          <button type="button" key={s.id} class="row pick" onClick={() => go(s.id)}>
            <span class="rl">
              <Icon class="ri" src={s.hotbarIcon ?? c.hotbarIcon} fallback="action" alt="" size={24} />
              <span>{s.name}</span>
            </span>
          </button>
        ))}
        <button type="button" class="row pick" onClick={() => go()}>
          <span class="rl"><span>No subclass</span></span>
        </button>
      </div>
    </div>
  );
}
