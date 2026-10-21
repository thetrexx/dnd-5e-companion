import { DATA } from '../../data';
import type { ClassId, Cost, Feature, FeatureCost } from '../../data/types';
import { costBar, damageLine, levelLine, tags } from '../../logic/card';
import { effectiveSub } from '../../logic/subclass';
import { toHash } from '../../router';
import { ComponentIcons } from '../ComponentIcons';
import { Icon } from '../Icon';
import { Separator } from '../Separator';

const SYMBOL: Record<FeatureCost, { sym: string; token: string }> = {
  action: { sym: '●', token: '--cost-action' },
  bonus: { sym: '▲', token: '--cost-bonus' },
  reaction: { sym: '◆', token: '--cost-reaction' },
  other: { sym: '○', token: '--cost-action' },
  free: { sym: '○', token: '--cost-action' },
  passive: { sym: '○', token: '--cost-action' },
};
const COST_LABEL: Record<FeatureCost, string> = {
  action: 'Action', bonus: 'Bonus Action', reaction: 'Reaction', other: 'Other', free: 'Free', passive: 'Passive',
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function CostItem(p: { cost: FeatureCost; label: string }) {
  const s = SYMBOL[p.cost];
  return <span><span style={{ color: `var(${s.token})` }}>{s.sym}</span> {p.label}</span>;
}

function featureSection(f: Feature): string {
  if (f.source.kind === 'subclass') return 'subclass';
  if (f.source.kind === 'option') return `opt-${f.source.id}`;
  if (f.source.kind !== 'generic') return 'class';
  return f.cost === 'bonus' ? 'bonus' : f.cost === 'reaction' ? 'reactions' : 'actions';
}

function sourceLabel(f: Feature): string {
  const { kind, id } = f.source;
  if (kind === 'generic') return 'General';
  if (kind === 'subclass') return DATA.subclasses.find((s) => s.id === id)?.name ?? cap(id.replace(/-/g, ' '));
  if (kind === 'option') return DATA.optionGroups.find((g) => g.id === id)?.name ?? cap(id.replace(/-/g, ' '));
  return cap(id.replace(/-/g, ' '));
}

export function Card(p: { kind: 'spell' | 'feature'; id: string; cls: ClassId; level: number; sub?: string }) {
  const spell = p.kind === 'spell' ? DATA.spells.find((s) => s.id === p.id) : undefined;
  const feature = p.kind === 'feature' ? DATA.features.find((f) => f.id === p.id) : undefined;
  const page = p.kind === 'spell' ? 'spells' : 'actions';
  const section = spell ? (spell.level === 0 ? 'cantrips' : `lvl-${spell.level}`) : feature ? featureSection(feature) : undefined;
  const sub = effectiveSub(p.cls, p.level, p.sub)?.id;
  const back = toHash({ page, cls: p.cls, level: p.level, ...(sub && { sub }), section });
  const head = (
    <header class="fixed-head">
      <a class="back" href={back}>‹ {cap(page)}</a>
    </header>
  );
  if (!spell && !feature) {
    return <div class="screen fixed">{head}<div class="scroller"><p class="empty">Nothing found</p></div></div>;
  }
  const dmg = spell ? damageLine(spell) : null;
  const bar = spell ? costBar(spell) : null;
  const source = feature ? sourceLabel(feature) : '';
  const extra = feature ? [feature.resource, feature.uses].filter(Boolean).join(' · ') : '';
  const scaling = (feature?.scaling ?? []).map((s) => ({ label: s.label, value: s.values[p.level - 1] })).filter((s) => s.value);
  const featureLabel = feature
    ? COST_LABEL[feature.cost] + (feature.cost === 'reaction' && feature.trigger ? `, ${feature.trigger}` : '') + (extra ? ` · ${extra}` : '')
    : '';
  return (
    <div class="screen fixed">
      {head}
      <div class="scroller">
        <article class="card">
          <div class="card-icon"><Icon src={(spell ?? feature)!.icon} fallback={spell ? 'spell' : 'action'} alt="" size={54} /></div>
          <h1 class="card-title">{spell ? spell.name : feature!.name}</h1>
          <div class="card-sub">{spell ? levelLine(spell) : `${source} Feature · Level ${feature!.level}`}</div>
          {dmg && <div class="card-dmg">{dmg.headline}</div>}
          {dmg && <div class="card-dmg-detail">{dmg.detail}</div>}
          <Separator ornament={''} card />
          <div class="card-desc">
            {(spell ? spell.description : feature!.description).map((t, i) => <p key={i}>{t}</p>)}
            {spell?.higherLevels && <p><span class="orn">{'❦'}</span> <i>At Higher Levels.</i> {spell.higherLevels}</p>}
          </div>
          {scaling.length > 0 && (
            <div class="card-scaling">{scaling.map((s) => <div key={s.label}>{s.label}: {s.value}</div>)}</div>
          )}
          {spell && <div class="card-tags">{tags(spell).map((t) => <span key={t}>{t}</span>)}</div>}
          {spell && <ComponentIcons spell={spell} />}
          {(spell ?? feature)!.textSource === 'summary' && <div class="card-ref">Full rules: PHB p. {(spell ?? feature)!.page}</div>}
          <div class="card-cost">
            {bar && <CostItem cost={bar.cost} label={bar.trigger ? `${bar.label}, ${bar.trigger}` : bar.label} />}
            {bar?.slot && <span><span style={{ color: 'var(--cost-slot)' }}>■</span> {bar.slot}</span>}
            {feature && <CostItem cost={feature.cost} label={featureLabel} />}
          </div>
        </article>
      </div>
    </div>
  );
}
