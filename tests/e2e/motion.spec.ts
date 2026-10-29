import { test, expect, type Page } from '@playwright/test';

const anims = (page: Page) => page.evaluate(() => document.getAnimations().length);
// background canvases; the start menu's strand strips are canvases too, and stay in every mode
const BG_CANVAS = 'canvas:not(.strand-a, .strand-b)';

test('spell rows animate, actions row has no motif, taps still navigate', async ({ page }) => {
  await page.goto('./#/menu/sorcerer/5');
  const spellRows = page.locator('a.row', { hasText: /Cantrips|Level \d+ Spells/ });
  await expect(spellRows.first()).toBeVisible();
  const n = await spellRows.count();
  expect(n).toBeGreaterThan(1);
  await expect(page.locator('a.row svg.fx-row')).toHaveCount(n);
  await expect.poll(() => page.locator('svg.fx-row path').count(), { timeout: 6000 }).toBeGreaterThan(0);
  await expect.poll(() => anims(page), { timeout: 6000 }).toBeGreaterThan(0);
  await expect(page.getByRole('link', { name: 'Actions', exact: true }).locator('svg')).toHaveCount(0);
  await page.getByRole('link', { name: /Level 1 Spells/ }).click();
  await expect(page).toHaveURL(/#\/spells\/sorcerer\/5.*lvl-1/);
});

// every row animating at once was too slow on phones: rows stand drawn and take turns
test('spell rows take turns: never more than one row animating', async ({ page }) => {
  await page.goto('./#/menu/druid/20');
  await expect(page.locator('a.row svg.fx-row path').first()).toBeAttached();
  const busy = () => page.evaluate(() => [...document.querySelectorAll('a.row')]
    .filter((r) => r.querySelector('svg.fx-row')?.getAnimations({ subtree: true }).some((a) => a.playState === 'running')).length);
  let seen = 0;
  for (let i = 0; i < 12; i++) {
    const n = await busy();
    expect(n).toBeLessThanOrEqual(1);
    seen += n;
    await page.waitForTimeout(500);
  }
  expect(seen).toBeGreaterThan(0);
});

test('mist is blurred on its small canvas, not as a screen-sized filter', async ({ page }) => {
  await page.goto('./#/menu/warlock/5');
  const mist = page.locator('canvas.fx-mist');
  await expect(mist).toHaveCount(1);
  expect(await mist.evaluate((c) => getComputedStyle(c).filter)).toBe('none');
});

test('backgrounds per screen', async ({ page }) => {
  await page.goto('./#/menu/warlock/5');
  await expect(page.locator('svg.fx-bg')).toBeVisible();
  await expect(page.locator('canvas.fx-mist')).toHaveCount(1);
  await page.goto('./#/menu/sorcerer/5');
  await expect(page.locator('canvas.fx-blood')).toHaveCount(1);
  await page.goto('./');
  await expect(page.locator('svg.fx-bg')).toBeVisible();
  await expect(page.locator(BG_CANVAS)).toHaveCount(0);
});

test('reduced motion: patterns drawn but still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/menu/wizard/5');
  await expect.poll(() => page.locator('svg.fx-row path').count(), { timeout: 6000 }).toBeGreaterThan(0);
  await page.waitForTimeout(2000);
  expect(await anims(page)).toBe(0);
});

test('Off removes every pattern; Medium brings them back', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByText('Off', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Off' })).toBeChecked();
  for (const hash of ['./#/menu/druid/5', './#/menu/warlock/5', './#/menu/sorcerer/5', './#/menu/artificer/5', './']) {
    await page.goto(hash);
    await expect(page.locator('a.row, a.cls, button').first()).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page.locator('svg.fx-row'), hash).toHaveCount(0);
    await expect(page.locator('svg.fx-bg'), hash).toHaveCount(0);
    await expect(page.locator('svg.fx-sparks'), hash).toHaveCount(0);
    await expect(page.locator(BG_CANVAS), hash).toHaveCount(0);
    expect(await anims(page), hash).toBe(0);
  }
  await page.goto('./#/settings');
  await page.getByText('Medium', { exact: true }).click();
  await page.goto('./#/menu/druid/5');
  await expect(page.locator('svg.fx-row').first()).toBeAttached();
  await expect(page.locator('svg.fx-bg')).toBeVisible();
});

test('no console errors across menu, spells, card, back', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' && !(m.text().startsWith('Failed to load resource') && /bg3\.wiki/.test(m.location().url))) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('./');
  await expect(page.locator('button.start-cls').first()).toBeVisible();
  await page.waitForTimeout(1500);
  await page.goto('./#/menu/sorcerer/5');
  await page.waitForTimeout(1500);
  await page.getByRole('link', { name: /Level 1 Spells/ }).click();
  await expect(page).toHaveURL(/#\/spells\//);
  await page.locator('.grid button.ic').first().click();
  await expect(page).toHaveURL(/#\/card\//);
  await expect(page.locator('.card')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#\/spells\//);
  await page.goBack();
  await expect(page).toHaveURL(/#\/menu\/sorcerer\/5/);
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});

test('320px: menu fits with motion layers', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./#/menu/bard/20');
  await expect(page.locator('a.row').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('320px: Artificer menu fits with motion layers, sparks drawn', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./#/menu/artificer/20');
  await expect(page.locator('a.row').first()).toBeVisible();
  await expect(page.locator('svg.fx-sparks')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
