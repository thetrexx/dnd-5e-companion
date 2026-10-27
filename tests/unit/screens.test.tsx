import { fireEvent, render } from '@testing-library/preact';
import { DATA } from '../../src/data';
import { Card } from '../../src/ui/screens/Card';
import { Menu } from '../../src/ui/screens/Menu';
import { SubclassPicker } from '../../src/ui/screens/SubclassPicker';
import { Start } from '../../src/ui/screens/Start';
import { Separator } from '../../src/ui/Separator';

const spell = (id: string) => DATA.spells.find((s) => s.id === id)!;

test('Card shows the spell icon top right', () => {
  const mm = spell('magic-missile');
  expect(mm.icon).toBeTruthy();
  const r = render(<Card kind="spell" id="magic-missile" cls="wizard" level={3} />);
  expect(r.container.querySelector('.card-icon img')!.getAttribute('src')).toBe(mm.icon);
});

test('Card falls back to the school icon when the spell has no icon', () => {
  expect(spell('alarm').icon).toBeUndefined();
  const r = render(<Card kind="spell" id="alarm" cls="wizard" level={3} />);
  expect(r.container.querySelector('.card-icon img')!.getAttribute('src')).toContain('/icons/fallback/school-abjuration.svg');
});

test('Card shows the reaction trigger with the cost', () => {
  const r = render(<Card kind="spell" id="shield" cls="wizard" level={3} />);
  expect(r.container.querySelector('.card-cost')!.textContent)
    .toContain('Reaction, when you');
});

test('Card divider uses the card separator variant', () => {
  const r = render(<Card kind="spell" id="magic-missile" cls="wizard" level={3} />);
  expect(r.container.querySelector('.sep.sep-card')).toBeTruthy();
  expect(render(<Separator ornament="X" full />).container.querySelector('.sep-card')).toBeNull();
});

test('Menu subline names level and subclass', () => {
  expect(render(<Menu cls="wizard" level={3} />).container.querySelector('.hint')!.textContent).toBe('Level 3');
  expect(render(<Menu cls="wizard" level={3} sub="school-of-evocation" />).container.querySelector('.hint')!.textContent).toBe('Level 3 · School of Evocation');
  expect(render(<Menu cls="wizard" level={1} sub="school-of-evocation" />).container.querySelector('.hint')!.textContent).toBe('Level 1');
});

test('Card shows scaling for the route level', () => {
  const hi = render(<Card kind="feature" id="action-surge" cls="fighter" level={17} />);
  expect(hi.container.textContent).toContain('Uses: 2');
  const lo = render(<Card kind="feature" id="action-surge" cls="fighter" level={1} />);
  expect(lo.container.textContent).not.toContain('Uses:');
});

test('Card shows the reaction trigger on features and labels option sources', () => {
  const r = render(<Card kind="feature" id="fighting-style-protection" cls="fighter" level={1} />);
  expect(r.container.querySelector('.card-cost')!.textContent).toContain('Reaction, An enemy you can see attacks');
  expect(r.container.querySelector('.card-sub')!.textContent).toContain('Fighting Style');
  expect(r.container.querySelector('a.back')!.getAttribute('href')).toBe('#/actions/fighter/1?s=opt-fighting-style');
});

test('SubclassPicker lists subclasses and No subclass', () => {
  const r = render(<SubclassPicker cls="fighter" level={3} />);
  expect(r.container.querySelector('.page-title')!.textContent).toBe('Fighter');
  expect(r.container.querySelector('.hint')!.textContent).toBe('Pick a Martial Archetype');
  expect([...r.container.querySelectorAll('button')].map(b => b.textContent)).toEqual(['Champion', 'Battle Master', 'Eldritch Knight', 'Arcane Archer', 'Cavalier', 'Samurai', 'No subclass']);
});

test('Menu row icons and slot icon survive a failed load', () => {
  const r = render(<Menu cls="wizard" level={3} />);
  const ri = r.container.querySelector('img.ri')!;
  fireEvent.error(ri);
  expect(r.container.querySelector('img.ri')!.getAttribute('src')).toContain('/icons/fallback/');
  const before = r.container.querySelectorAll('.slot img').length;
  fireEvent.error(r.container.querySelector('.slot img')!);
  expect(r.container.querySelectorAll('.slot img').length).toBe(before - 1);
  expect(r.container.querySelector('.slot b')).toBeTruthy();
});

test('Start tile icon falls back on error', () => {
  const r = render(<Start />);
  const img = r.container.querySelector('.tile img')!;
  fireEvent.error(img);
  expect(r.container.querySelector('.tile img')!.getAttribute('src')).toContain('/icons/fallback/');
});

test('every card ends with the PHB page line', () => {
  const wb = render(<Card kind="feature" id="weapon-bond" cls="fighter" level={3} sub="eldritch-knight" />);
  expect(wb.container.textContent).toContain('Full rules: PHB p. 75');
  const fb = render(<Card kind="spell" id="fire-bolt" cls="wizard" level={3} />);
  expect(fb.container.textContent).toContain('Full rules: PHB p. 242');
  const fi = render(<Card kind="spell" id="fireball" cls="wizard" level={5} />);
  expect(fi.container.textContent).toContain('Full rules: PHB p. 241');
  for (const r of [wb, fb]) {
    const art = r.container.querySelector('article.card')!;
    expect(art.lastElementChild!.className).toBe('card-ref');
    expect(art.querySelector('.card-cost')!.nextElementSibling!.className).toBe('card-ref');
  }
});

test('Card shows a feature trigger for any cost', () => {
  const f = DATA.features.find((x) => x.id === 'frenzy')!;
  expect(f.cost).toBe('bonus');
  expect(f.trigger).toBeTruthy();
  const r = render(<Card kind="feature" id="frenzy" cls="barbarian" level={3} sub="path-of-the-berserker" />);
  expect(r.container.querySelector('.card-cost')!.textContent).toContain(`Bonus Action, ${f.trigger}`);
});

test('Card option back link points to the group that lists it for this class', () => {
  const r = render(<Card kind="feature" id="fighting-style-protection" cls="paladin" level={2} />);
  expect(r.container.querySelector('a.back')!.getAttribute('href')).toContain('opt-fighting-style-paladin');
  expect(r.container.querySelector('.card-sub')!.textContent).toContain('Fighting Style');
});

test('Card names the race on race features', () => {
  const r = render(<Card kind="feature" id="breath-weapon" cls="fighter" level={1} />);
  expect(r.container.querySelector('.card-sub')!.textContent).toContain('Dragonborn Feature');
});
test('Card back override', () => {
  const r = render(<Card kind="spell" id="shield" cls="wizard" level={3} back="#/me/spells?s=lvl-1-wizard" />);
  expect(r.container.querySelector('.back')!.getAttribute('href')).toBe('#/me/spells?s=lvl-1-wizard');
});
test('Card uses the data name for race and feat sources', () => {
  const race = render(<Card kind="feature" id="relentless-endurance" cls="fighter" level={1} />);
  expect(race.container.querySelector('.card-sub')!.textContent).toContain('Half-Orc Feature');
  const feat = render(<Card kind="feature" id="great-weapon-master" cls="fighter" level={1} />);
  expect(feat.container.querySelector('.card-sub')!.textContent).toContain('Great Weapon Master Feature');
});

test('Card marks optional features and what they replace', () => {
  const foe = render(<Card kind="feature" id="optional-ranger-favored-foe" cls="ranger" level={1} />);
  expect(foe.container.querySelector('.card-sub')!.textContent).toBe('Ranger Feature · Level 1 · Optional, replaces Favored Enemy');
  expect(foe.container.querySelector('a.back')!.getAttribute('href')).toBe('#/actions/ranger/1?s=class');
  const pc = render(<Card kind="feature" id="optional-beast-master-primal-companion" cls="ranger" level={3} sub="beast-master" />);
  expect(pc.container.querySelector('.card-sub')!.textContent).toBe("Beast Master Feature · Level 3 · Optional, replaces Ranger's Companion, Companion Commands");
  expect(pc.container.querySelector('a.back')!.getAttribute('href')).toContain('s=subclass');
  const t = render(<Card kind="feature" id="deft-explorer-tireless" cls="ranger" level={10} />);
  expect(t.container.querySelector('.card-sub')!.textContent).toBe('Ranger Feature · Level 10 · Optional');
});
test('Primal Companion card keeps Bestial Fury and Share Spells', () => {
  const r = render(<Card kind="feature" id="optional-beast-master-primal-companion" cls="ranger" level={11} sub="beast-master" />);
  expect(r.container.querySelector('.card-scaling')!.textContent).toContain('Beast attacks: 2');
  expect(r.container.querySelector('.card-desc')!.textContent).toMatch(/Bestial Fury.*two attacks/);
  expect(r.container.querySelector('.card-desc')!.textContent).toContain('Share Spells');
  expect(render(<Card kind="feature" id="optional-beast-master-primal-companion" cls="ranger" level={10} sub="beast-master" />)
    .container.querySelector('.card-scaling')!.textContent).toContain('Beast attacks: 1');
});
