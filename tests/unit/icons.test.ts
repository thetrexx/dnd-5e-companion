import { existsSync } from 'node:fs';
import { DATA } from '../../src/data';
import { iconCandidates } from '../../scripts/extract/icons';
import { spellFallback } from '../../src/ui/Icon';

test('candidates', () => {
  const c = iconCandidates('Mage Armor');
  expect(c.slice(0, 2)).toEqual(['File:Mage_Armor_Icon.webp', 'File:Mage_Armor_Icon.png']);
  expect(c).toContain('File:Mage_Armour_Icon.webp');
  expect(iconCandidates('Shield')).toContain('File:Shield_spell_Icon.webp');
});
test('school fallback', () => {
  expect(spellFallback(DATA.spells.find(s => s.id === 'fireball')!)).toBe('school-evocation');
  for (const sc of ['abjuration','conjuration','divination','enchantment','evocation','illusion','necromancy','transmutation'])
    expect(existsSync(`public/icons/fallback/school-${sc}.svg`), sc).toBe(true);
});
test('icon coverage', () => {
  const withIcon = DATA.spells.filter(s => s.icon?.startsWith('https://bg3.wiki/w/images/')).length;
  expect(withIcon).toBeGreaterThanOrEqual(200);
  expect(DATA.subclasses.filter(s => s.hotbarIcon && !s.hotbarIcon.startsWith('https://bg3.wiki/')).map(s => s.id)).toEqual([]);
});
test('build:spells keeps resolved icons', async () => {
  const { readFileSync } = await import('node:fs');
  const icons = JSON.parse(readFileSync('scripts/extract/spell-icons.json', 'utf8')) as Record<string, string>;
  for (const [id, url] of Object.entries(icons)) expect(DATA.spells.find(s => s.id === id)?.icon, id).toBe(url);
});
