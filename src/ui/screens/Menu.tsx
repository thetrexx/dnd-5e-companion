import { DATA } from '../../data';
import type { ClassId } from '../../data/types';
import { menuRows } from '../../logic/menu';
import { effectiveSub } from '../../logic/subclass';
import { toHash } from '../../router';
import { MenuView } from '../MenuView';

export function Menu(p: { cls: ClassId; level: number; sub?: string }) {
  const c = DATA.classes.find((x) => x.id === p.cls)!;
  const s = effectiveSub(p.cls, p.level, p.sub);
  return <MenuView title={c.name} subline={`Level ${p.level}${s ? ` · ${s.name}` : ''}`}
    back={{ href: toHash({ page: 'level', cls: p.cls }), label: '‹ Level' }} rows={menuRows(p.cls, p.level, s?.id)} />;
}
