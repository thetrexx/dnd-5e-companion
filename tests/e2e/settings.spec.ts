import { test, expect } from '@playwright/test';

test('settings persist across reload; About shows the Fan Content notice', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByText('Faint').click();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Faint' })).toBeChecked();
  await expect(page.getByText('Unofficial Fan Content permitted under the Fan Content Policy.', { exact: false })).toBeVisible();
});

test('gear opens settings and back returns to start', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await page.getByText('‹ Back').click();
  await expect(page.getByRole('heading', { name: 'D&D 5E Cheat Sheet' })).toBeVisible();
});

test('back from directly opened settings goes to start, not out of the app', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByText('‹ Back').click();
  await expect(page.getByRole('heading', { name: 'D&D 5E Cheat Sheet' })).toBeVisible();
});

test('back from settings returns to the screen it was opened from', async ({ page }) => {
  await page.goto('./#/menu/wizard/3');
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByText('‹ Back').click();
  await expect(page).toHaveURL(/#\/menu\/wizard\/3$/);
});
