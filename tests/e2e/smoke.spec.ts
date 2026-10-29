import { test, expect } from '@playwright/test';

test('home loads on a phone', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('D&D 5E Cheat Sheet');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
