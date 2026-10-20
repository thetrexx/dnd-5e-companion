import { test, expect } from '@playwright/test';

test('home loads on a phone', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Spellbook & Steel');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
