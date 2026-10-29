import { test, expect } from '@playwright/test';

type Page = import('@playwright/test').Page;
const noSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
// the first class button's two strand strips are painted (some pixel is not see-through)
const painted = (page: Page) => page.locator('.strands').first().evaluate((el) => [...el.querySelectorAll('canvas')]
  .map((c) => c.width > 0 && c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0)));
const running = (page: Page, sel: string) =>
  page.evaluate((s) => [...document.querySelectorAll(s)].reduce((n, el) => n + el.getAnimations({ subtree: true }).length, 0), sel);

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
    const widths = [...document.querySelectorAll('.strands')].map((s) => s.getBoundingClientRect().width);
    return { col, widths, win: innerWidth };
  });
  expect(r.widths).toHaveLength(13);
  const need = Math.min(r.col + 480, r.win);
  for (const w of r.widths) expect(w).toBeGreaterThanOrEqual(need - 1);
  expect(await noSideways(page)).toBe(true);
  // the fade is a mask on the frame: gone 240px past the column on both sides, well inside the window
  const m = await page.locator('.strands').first().evaluate((el) => {
    const cs = getComputedStyle(el), mask = cs.maskImage || cs.webkitMaskImage;
    return { w: el.getBoundingClientRect().width, px: [...mask.matchAll(/(-?[\d.]+)px/g)].map((x) => +x[1]!) };
  });
  expect(m.px.length).toBeGreaterThan(2);
  expect(Math.min(...m.px)).toBeGreaterThan(0);
  expect(Math.max(...m.px)).toBeLessThan(m.w);
});

test('reduced motion: strands painted and still, no shine animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect.poll(() => painted(page)).toEqual([true, true]);
  expect(await running(page, '.strands')).toBe(0);
  expect(await page.locator('button.start-me').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});

test('Off then Medium: class art and shine go and come back, strands stay and slide again', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByText('Off', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Off' })).toBeChecked();
  await page.goto('./');
  await expect(page.locator('button.start-cls').first()).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.locator('svg.fx-row')).toHaveCount(0);
  await expect(page.locator('button.start-me.shine')).toHaveCount(0);
  await expect(page.locator('.strands')).toHaveCount(13);
  await expect(page.locator('.strands').first().locator('canvas')).toHaveCount(2);
  await expect.poll(() => painted(page)).toEqual([true, true]);
  expect(await running(page, '.strands')).toBe(0);
  expect(await page.locator('button.start-me').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.goto('./#/settings');
  await page.getByText('Medium', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Medium' })).toBeChecked();
  await page.goto('./');
  await expect(page.locator('svg.fx-row').first()).toBeAttached();
  await expect(page.locator('button.start-me.shine')).toHaveCount(1);
  await expect.poll(() => page.locator('button.start-me').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
  await expect(page.locator('.strands')).toHaveCount(13);
  expect(await running(page, '.strands')).toBe(26);
});

// thirteen animated class rows were too slow on phones: on the start menu the strands slide and the art holds still
test('animated start menu: strands slide, class art holds still', async ({ page }) => {
  await page.goto('./');
  await expect.poll(() => painted(page)).toEqual([true, true]);
  const cv = page.locator('.strands').first().locator('canvas').first();
  const x0 = await cv.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(500);
  expect(await cv.evaluate((el) => getComputedStyle(el).transform)).not.toBe(x0);
  await page.waitForTimeout(3600); // past the longest start delay an animated row would wait
  await expect(page.locator('svg.fx-row')).toHaveCount(13);
  expect(await running(page, 'svg.fx-row')).toBe(0);
  expect(await noSideways(page)).toBe(true);
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
