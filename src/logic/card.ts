import type { Cost, Spell } from '../data/types';

export interface Explainer { title: string; body: string }

export function diceRange(dice: string): { min: number; max: number } {
  const m = /^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/.exec(dice.trim());
  if (!m) throw new Error(`bad dice: ${dice}`);
  const n = Number(m[1]);
  const bonus = m[4] ? (m[3] === '-' ? -1 : 1) * Number(m[4]) : 0;
  return { min: n + bonus, max: n * Number(m[2]) + bonus };
}

export function levelLine(s: Spell): string {
  return s.level === 0 ? `${s.school} Cantrip` : `Level ${s.level} ${s.school} Spell`;
}

export function damageLine(s: Spell): { headline: string; detail: string } | null {
  const d = s.summary?.damage;
  if (!d) return null;
  const { min, max } = diceRange(d.dice);
  const n = d.count ?? 1;
  const headline = `${min * n}~${max * n} ${d.healing ? 'Healing' : 'Damage'}`;
  const detail = d.count && d.count > 1
    ? `${d.count} ${d.unit ? `${d.unit} ` : ''}× ${d.dice} ${d.type}`
    : `${d.dice} ${d.type}`;
  return { headline, detail };
}

export function tags(s: Spell): string[] {
  const out = [s.range.replace(/ feet$/, ' ft'), s.duration];
  const r = s.summary?.resolution;
  if (r === 'auto') out.push('Auto-hit');
  else if (r === 'attack') out.push('Attack roll');
  else if (r === 'save' && s.summary?.save) out.push(`${s.summary.save.toUpperCase()} save`);
  if (s.concentration) out.push('Concentration');
  if (s.ritual) out.push('Ritual');
  return out;
}

const COST_LABEL: Record<Exclude<Cost, 'other'>, string> = { action: 'Action', bonus: 'Bonus Action', reaction: 'Reaction' };

export function costBar(s: Spell): { cost: Cost; label: string; slot?: string; trigger?: string } {
  const { cost, text, trigger } = s.cast;
  const bar: { cost: Cost; label: string; slot?: string; trigger?: string } = { cost, label: cost === 'other' ? text : COST_LABEL[cost] };
  if (cost === 'reaction' && trigger) bar.trigger = trigger;
  if (s.level >= 1) bar.slot = `Level ${s.level} Spell Slot`;
  return bar;
}

export function componentInfo(s: Spell): { v: Explainer | null; s: Explainer | null; m: Explainer | null } {
  const c = s.components;
  let m: Explainer | null = null;
  if (c.m) {
    const priced = c.m.costGp !== undefined;
    const parts = [priced ? `Costs ${c.m.costGp} gp.` : ''];
    if (c.m.consumed) parts.push('The spell consumes it.');
    else parts.push(`A component pouch or spellcasting focus ${priced ? "can't" : 'can'} stand in for it.`);
    m = { title: 'Material', body: `${c.m.text.replace(/\.$/, '')}. ${parts.filter(Boolean).join(' ')}` };
  }
  return {
    v: c.v ? { title: 'Verbal', body: "You must chant mystic words out loud. You can't cast it while gagged, unable to speak, or inside a Silence spell." } : null,
    s: c.s ? { title: 'Somatic', body: 'You must make gestures with at least one free hand. Holding a sword and a shield? Stow one first.' } : null,
    m,
  };
}
