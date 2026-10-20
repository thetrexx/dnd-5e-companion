import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = join(process.cwd(), 'src');
const THEMES_DIR = join(SRC, 'styles', 'themes');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test('no colour literals outside theme files', () => {
  const patterns = [/#[0-9a-f]{3,8}\b/i, /\brgba?\(/, /\bhsla?\(/];
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
    if (!/\.(ts|tsx|css)$/.test(file) || file.startsWith(THEMES_DIR + sep)) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (patterns.some((re) => re.test(line))) offenders.push(`${relative(process.cwd(), file)}:${i + 1}`);
    });
  }
  expect(offenders, `stray colours at: ${offenders.join(', ')}`).toEqual([]);
});
