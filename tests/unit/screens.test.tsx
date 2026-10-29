import { readFileSync } from 'node:fs';
import { fireEvent, render } from '@testing-library/preact';
import { DATA } from '../../src/data';
import { Card } from '../../src/ui/screens/Card';
import { Menu } from '../../src/ui/screens/Menu';
import { SectionPage } from '../../src/ui/screens/SectionPage';
import { spellSections } from '../../src/logic/sections';
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
  expect([...r.container.querySelectorAll('button')].map(b => b.textContent)).toEqual(['Champion', 'Battle Master', 'Eldritch Knight', 'Arcane Archer', 'Cavalier', 'Samurai', 'Psi Warrior', 'Rune Knight', 'No subclass']);
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

test('Start class icon falls back on error', () => {
  const r = render(<Start />);
  const img = r.container.querySelector('.start-cls img')!;
  fireEvent.error(img);
  expect(r.container.querySelector('.start-cls img')!.getAttribute('src')).toContain('/icons/fallback/');
});

test('Start lists 13 classes A-Z, Artificer first, Artificer with its own icon', () => {
  const r = render(<Start />);
  const btns = [...r.container.querySelectorAll('.start-list > button.start-cls')];
  expect(btns.map(b => b.textContent)).toEqual(['Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']);
  expect(btns[0].querySelector('img')!.getAttribute('src')).toBe('icons/class-artificer.svg');
  expect(r.container.querySelector('.start-title')!.textContent).toBe('D&D 5E Cheat Sheet');
});

test('My Character Sheet: person_edit icon, no strands, today\'s subtitle', () => {
  const r = render(<Start />);
  const me = r.container.querySelector('.start-list > button.start-me:first-child')!;
  expect(me.querySelector('svg path')!.getAttribute('d')!.startsWith('M493.33-226.67Z')).toBe(true);
  expect(me.querySelector('.strands')).toBeNull();
  expect(me.querySelector('.start-me-text > span')!.textContent).toBe('My Character Sheet');
  expect(me.querySelector('small')!.textContent).toBe('Create your character');
});

test('every class button has strands and a motif layer; Barbarian bleeds blood red', () => {
  const r = render(<Start />);
  const btns = [...r.container.querySelectorAll('button.start-cls')];
  expect(r.container.querySelectorAll('.strands')).toHaveLength(13);
  expect(r.container.querySelectorAll('svg.fx-row')).toHaveLength(13);
  expect(btns.every(b => b.querySelector('.strands') && b.querySelector('svg.fx-row'))).toBe(true);
  const barb = btns.find(b => b.textContent === 'Barbarian')!;
  expect(barb.querySelector('svg.fx-row')!.getAttribute('style')).toContain('--barbarian-blood');
  expect(btns.find(b => b.textContent === 'Bard')!.querySelector('svg.fx-row')!.getAttribute('style')).toContain('--bard-line');
  // jsdom has no layout: pin the rule that fades the class art at both ends (checked in a browser by e2e)
  expect(readFileSync('src/styles/screens.css', 'utf8')).toMatch(/\.start-cls \.fx-row\{[^}]*;mask:var\(--start-motif-mask\)/);
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
test('Blessed Strikes names Divine Strike once', () => {
  const r = render(<Card kind="feature" id="optional-cleric-blessed-strikes" cls="cleric" level={8} />);
  expect(r.container.querySelector('.card-sub')!.textContent).toMatch(/Optional, replaces Divine Strike$/);
});
test('Primal Companion card keeps Bestial Fury and Share Spells', () => {
  const r = render(<Card kind="feature" id="optional-beast-master-primal-companion" cls="ranger" level={11} sub="beast-master" />);
  expect(r.container.querySelector('.card-scaling')!.textContent).toContain('Beast attacks: 2');
  expect(r.container.querySelector('.card-desc')!.textContent).toMatch(/Bestial Fury.*two attacks/);
  expect(r.container.querySelector('.card-desc')!.textContent).toContain('Share Spells');
  expect(render(<Card kind="feature" id="optional-beast-master-primal-companion" cls="ranger" level={10} sub="beast-master" />)
    .container.querySelector('.card-scaling')!.textContent).toContain('Beast attacks: 1');
});
test('locked spell page dims its cards except the ones already granted', () => {
  const eproto = Element.prototype as unknown as Record<string, unknown>;
  eproto.scrollTo = () => {}; // jsdom has no scrolling
  const r = render(<SectionPage title="Spells" back={{ href: '#/', label: 'Back' }} onPick={() => {}}
    sections={spellSections('artificer', 15, 'alchemist').filter(s => s.id === 'lvl-5')} />);
  delete eproto.scrollTo;
  const dim = (name: string) => [...r.container.querySelectorAll('.ic')].find(b => b.textContent!.startsWith(name))!.classList.contains('dim');
  expect(r.container.querySelector('.locked-note')!.textContent).toBe('Unlocks at Artificer 17');
  expect(dim('Greater Restoration')).toBe(false);
  expect(dim('Animate Objects')).toBe(true);
});
