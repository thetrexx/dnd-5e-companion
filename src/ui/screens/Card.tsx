import { DATA } from '../../data';
import type { ClassId, Cost, Feature } from '../../data/types';
import { costBar, damageLine, levelLine, tags } from '../../logic/card';
import { toHash } from '../../router';
import { ComponentIcons } from '../ComponentIcons';
import { Separator } from '../Separator';

const SYMBOL: Record<Cost | 'free', { sym: string; token: string }> = {
  action: { sym: '●', token: '--cost-action' },
  bonus: { sym: '▲', token: '--cost-bonus' },
  reaction: { sym: '◆', token: '--cost-reaction' },
  other: { sym: '○', token: '--cost-action' },
  free: { sym: '○', token: '--cost-action' },
};
const COST_LABEL: Record<Cost | 'free', string> = {
  action: 'Action', bonus: 'Bonus Action', reaction: 'Reaction', other: 'Other', free: 'Free',
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function CostItem(p: { cost: Cost | 'free'; label: string }) {
  const s = SYMBOL[p.cost];
  return <span><span style={{ color: `var(${s.token})` }}>{s.sym}</span> {p.label}</span>;
}

function featureSection(f: Feature): string {
  if (f.source.kind !== 'generic') return 'class';
  return f.cost === 'bonus' ? 'bonus' : f.cost === 'reaction' ? 'reactions' : 'actions';
}

export function Card(p: { kind: 'spell' | 'feature'; id: string; cls: ClassId; level: number }) {
  const spell = p.kind === 'spell' ? DATA.spells.find((s) => s.id === p.id) : undefined;
  const feature = p.kind === 'feature' ? DATA.features.find((f) => f.id === p.id) : undefined;
  const page = p.kind === 'spell' ? 'spells' : 'actions';
  const section = spell ? (spell.level === 0 ? 'cantrips' : `lvl-${spell.level}`) : feature ? featureSection(feature) : undefined;
  const back = toHash({ page, cls: p.cls, level: p.level, section });
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
  const source = feature
    ? feature.source.kind === 'generic' ? 'General' : cap(feature.source.id.replace(/-/g, ' '))
    : '';
  const extra = feature ? [feature.resource, feature.uses].filter(Boolean).join(' · ') : '';
  return (
    <div class="screen fixed">
      {head}
      <div class="scroller">
        <article class="card">
          <h1 class="card-title">{spell ? spell.name : feature!.name}</h1>
          <div class="card-sub">{spell ? levelLine(spell) : `${source} Feature · Level ${feature!.level}`}</div>
          {dmg && <div class="card-dmg">{dmg.headline}</div>}
          {dmg && <div class="card-dmg-detail">{dmg.detail}</div>}
          <Separator ornament={''} />
          <div class="card-desc">
            {(spell ? spell.description : feature!.description).map((t, i) => <p key={i}>{t}</p>)}
            {spell?.higherLevels && <p><span class="orn">{'❦'}</span> <i>At Higher Levels.</i> {spell.higherLevels}</p>}
          </div>
          {spell && <div class="card-tags">{tags(spell).map((t) => <span key={t}>{t}</span>)}</div>}
          {spell && <ComponentIcons spell={spell} />}
          <div class="card-cost">
            {bar && <CostItem cost={bar.cost} label={bar.label} />}
            {bar?.slot && <span><span style={{ color: 'var(--cost-slot)' }}>■</span> {bar.slot}</span>}
            {feature && <CostItem cost={feature.cost} label={COST_LABEL[feature.cost] + (extra ? ` · ${extra}` : '')} />}
          </div>
        </article>
      </div>
    </div>
  );
}
