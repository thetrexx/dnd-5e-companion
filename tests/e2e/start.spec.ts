import { test, expect } from '@playwright/test';

const noSideways = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('320px: 13 classes A-Z, no sideways scroll, Artificer opens its level picker', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./');
  const cls = page.locator('button.start-cls');
  await expect(cls).toHaveCount(13);
  await expect(cls.first()).toContainText('Artificer');
  const names = (await page.locator('.start-cls-l').allTextContents()).map((s) => s.trim());
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  expect(await noSideways(page)).toBe(true);
  await cls.first().click();
  await expect(page).toHaveURL(/#\/level\/artificer/);
  await expect(page.getByRole('button', { name: '3', exact: true })).toBeVisible();
});

test('1280px: strands span past the column, no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  await expect(page.locator('button.start-cls').first()).toBeVisible();
  const r = await page.evaluate(() => {
    const col = document.querySelector('.start-list')!.getBoundingClientRect().width;
    const widths = [...document.querySelectorAll('svg.strands')].map((s) => s.getBoundingClientRect().width);
    return { col, widths, win: innerWidth };
  });
  expect(r.widths).toHaveLength(13);
  const need = Math.min(r.col + 480, r.win);
  for (const w of r.widths) expect(w).toBeGreaterThanOrEqual(need - 1);
  expect(await noSideways(page)).toBe(true);
});

test('reduced motion: strands still, no shine animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const path = page.locator('svg.strands').first().locator('path').first();
  await expect(path).toBeAttached();
  await expect.poll(async () => (await path.getAttribute('d')) ?? '').not.toBe('');
  const d0 = await path.getAttribute('d');
  await page.waitForTimeout(1000);
  expect(await path.getAttribute('d')).toBe(d0);
  expect(await page.locator('button.start-me').evaluate((el) => el.getAnimations().length)).toBe(0);
});

test('Off then Medium: class animations and shine go and come back, strands stay', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByText('Off', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Off' })).toBeChecked();
  await page.goto('./');
  await expect(page.locator('button.start-cls').first()).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.locator('svg.fx-row')).toHaveCount(0);
  await expect(page.locator('button.start-me.shine')).toHaveCount(0);
  await expect(page.locator('svg.strands')).toHaveCount(13);
  await expect(page.locator('svg.strands').first().locator('path')).toHaveCount(2);
  expect(await page.locator('button.start-me').evaluate((el) => el.getAnimations().length)).toBe(0);
  await page.goto('./#/settings');
  await page.getByText('Medium', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Medium' })).toBeChecked();
  await page.goto('./');
  await expect(page.locator('svg.fx-row').first()).toBeAttached();
  await expect(page.locator('button.start-me.shine')).toHaveCount(1);
  await expect(page.locator('svg.strands')).toHaveCount(13);
});

test('a 40-character name wraps inside My Character Sheet at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /My Character Sheet/ }).click();
  const name = 'Bartholomew Wigglesworth-Featherstone III'.slice(0, 40);
  expect(name).toHaveLength(40);
  await page.getByLabel('Name').fill(name);
  await page.getByLabel(/^Race/).selectOption({ label: 'Human' });
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByLabel('Add a class').selectOption({ label: 'Artificer' });
  await page.getByRole('button', { name: 'Add class' }).click();
  await page.goto('./');
  const small = page.locator('button.start-me small');
  await expect(small).toHaveText(name);
  expect(await small.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await noSideways(page)).toBe(true);
});
