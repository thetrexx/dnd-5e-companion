// @vitest-environment node
import { readFileSync } from 'node:fs';

test('manifest carries the app name', () => {
  const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  expect(m.name).toBe('D&D 5E Cheat Sheet');
  expect(m.short_name).toBe('D&D 5E');
});

test('index.html title carries the app name', () => {
  expect(readFileSync('index.html', 'utf8')).toContain('<title>D&amp;D 5E Cheat Sheet</title>');
});
