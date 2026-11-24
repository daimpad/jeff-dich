// Packt wordpress/jd-artifacts nach dist/jd-artifacts.zip (zum Hochladen unter Plugins → Installieren).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './artifacts.mjs';

const out = resolve(ROOT, 'dist/jd-artifacts.zip');
mkdirSync(resolve(ROOT, 'dist'), { recursive: true });
rmSync(out, { force: true });
execFileSync('zip', ['-rq', out, 'jd-artifacts'], {
  cwd: resolve(ROOT, 'wordpress'),
  stdio: 'inherit',
});
console.log('✓ dist/jd-artifacts.zip');
