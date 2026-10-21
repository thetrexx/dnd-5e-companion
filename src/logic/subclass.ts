import { DATA } from '../data';
import type { ClassId, SubclassDef } from '../data/types';

/** The subclass if it exists, belongs to the class and the level has reached the class's subclass level. */
export function effectiveSub(cls: ClassId, level: number, sub?: string): SubclassDef | undefined {
  if (!sub) return undefined;
  const c = DATA.classes.find(x => x.id === cls);
  const s = DATA.subclasses.find(x => x.id === sub);
  return c && s && s.cls === cls && level >= c.subclassLevel ? s : undefined;
}

export function subclassesAt(cls: ClassId, level: number): SubclassDef[] {
  const c = DATA.classes.find(x => x.id === cls);
  return c && level >= c.subclassLevel ? DATA.subclasses.filter(s => s.cls === cls) : [];
}
