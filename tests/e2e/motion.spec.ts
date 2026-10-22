import { test, expect, type Page } from '@playwright/test';

const anims = (page: Page) => page.evaluate(() => document.getAnimations().length);

test('spell rows animate, actions row has no motif, taps still navigate', async ({ page }) => {
  await page.goto('./#/menu/sorcerer/5');
  const rows = page.locator('a.row', { has: page.locator('svg.fx-row') });
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(1);
  await expect.poll(() => page.locator('svg.fx-row path').count(), { timeout: 6000 }).toBeGreaterThan(0);
  await expect.poll(() => anims(page), { timeout: 6000 }).toBeGreaterThan(0);
  await expect(page.locator('a.row', { hasText: 'Actions' }).first().locator('svg')).toHaveCount(0);
  await page.getByRole('link', { name: /Level 1 Spells/ }).click();
  await expect(page).toHaveURL(/#\/spells\/sorcerer\/5.*lvl-1/);
});

test('backgrounds per screen', async ({ page }) => {
  await page.goto('./#/menu/warlock/5');
  await expect(page.locator('svg.fx-bg')).toBeVisible();
  await expect(page.locator('canvas.fx-mist')).toHaveCount(1);
  await page.goto('./#/menu/sorcerer/5');
  await expect(page.locator('canvas.fx-blood')).toHaveCount(1);
  await page.goto('./');
  await expect(page.locator('svg.fx-bg')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
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
  await page.goto('./#/menu/druid/5');
  await expect(page.locator('a.row').first()).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.locator('svg.fx-row')).toHaveCount(0);
  await expect(page.locator('svg.fx-bg')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await anims(page)).toBe(0);
  await page.goto('./#/settings');
  await page.getByText('Medium', { exact: true }).click();
  await page.goto('./#/menu/druid/5');
  await expect(page.locator('svg.fx-row').first()).toBeAttached();
  await expect(page.locator('svg.fx-bg')).toBeVisible();
});

test('no console errors across menu, spells, card, back', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/bg3\.wiki/.test(m.location().url + m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('./#/menu/sorcerer/5');
  await page.waitForTimeout(1500);
  await page.getByRole('link', { name: /Level 1 Spells/ }).click();
  await expect(page).toHaveURL(/#\/spells\//);
  await page.locator('.grid button, .rows a, .grid a').first().click();
  await page.waitForTimeout(500);
  await page.goBack();
  await page.goBack();
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});

test('320px: menu fits with motion layers', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./#/menu/bard/20');
  await expect(page.locator('a.row').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
