import { readFileSync } from 'node:fs';
import { findSpellPage, mapSrdSpell, phbId } from '../../scripts/extract/srd-spells.ts';

const names = JSON.parse(readFileSync('scripts/extract/phb-names.json', 'utf8'));
const fx = (n: string) => JSON.parse(readFileSync(`tests/unit/fixtures/srd-${n}.json`, 'utf8'));
test('fireball', () => expect(mapSrdSpell(fx('fireball'), names)).toMatchObject({
  id: 'fireball', level: 3, school: 'Evocation', cast: { cost: 'action', text: '1 action' }, range: '150 feet',
  components: { v: true, s: true, m: { text: 'A tiny ball of bat guano and sulfur', consumed: false } },
  summary: { damage: { dice: '8d6', type: 'Fire' }, resolution: 'save', save: 'dex', upcast: '+1d6 per slot level above 3rd' },
}));
test('cure wounds plusMod', () => expect(mapSrdSpell(fx('cure-wounds'), names).summary?.damage).toMatchObject({ dice: '1d8', healing: true, plusMod: true }));
test('confusion table rows', () => {
  const d = mapSrdSpell(fx('confusion'), names).description;
  expect(d.some(p => p.startsWith('1: '))).toBe(true); expect(d.some(p => p.startsWith('9-10: '))).toBe(true);
  expect(d.join(' ')).not.toMatch(/[|*]/);
});
test('shield is a reaction', () => expect(mapSrdSpell(fx('shield'), names).cast.cost).toBe('reaction'));
test('phb names', () => expect(phbId("Tasha's Hideous Laughter")).toBe('tashas-hideous-laughter'));
test('findSpellPage', () => expect(findSpellPage('Fire Bolt', new Map([[241, 'x'], [242, readFileSync('tests/unit/fixtures/ocr-fire-bolt.txt', 'utf8')]]))).toBe(242));
test('textSource is srd', () => expect(mapSrdSpell(fx('fireball'), names).textSource).toBe('srd'));
