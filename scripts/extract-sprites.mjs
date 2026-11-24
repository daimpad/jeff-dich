// Löst einzelne Motive eines gerigten Teils als eigene SVG-Sprites heraus:
//   npm run sprites -- vulkan herzen
// Flächen, deren Begrenzungsrechtecke sich überlappen, bilden ein Motiv (z. B. ein Herz aus
// dunkler Grundform und Farbflächen). Ausgabe: shared/brand/szenen/<teil>/NN.svg + index.json
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { svgPathBbox } from 'svg-path-bbox';
import { ROOT } from './artifacts.mjs';

const [scene, part, minSize = '40'] = process.argv.slice(2);
if (!scene || !part) {
  console.error('Aufruf: npm run sprites -- <szene> <teil> [mindestgröße]');
  process.exit(1);
}
const svg = readFileSync(resolve(ROOT, 'shared/brand/szenen', `${scene}.svg`), 'utf8');
const paths = [...svg.matchAll(new RegExp(`<path\\b[^>]*data-part="${part}"[^>]*/>`, 'g'))].map(
  (m) => {
    const tag = m[0].replace(/ data-(part|layer)="[^"]*"/g, '').replace(/ id="[^"]*"/, '');
    return { tag, box: svgPathBbox(tag.match(/\sd="([^"]*)"/)[1]) };
  },
);

// Union-Find über überlappende Begrenzungsrechtecke
const parent = paths.map((_, i) => i);
const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
const touch = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
for (let i = 0; i < paths.length; i++)
  for (let j = i + 1; j < paths.length; j++)
    if (touch(paths[i].box, paths[j].box)) parent[find(i)] = find(j);

const groups = {};
paths.forEach((p, i) => (groups[find(i)] ??= []).push(p));
const sprites = Object.values(groups)
  .map((ps) => {
    const box = ps.reduce(
      (b, p) => [
        Math.min(b[0], p.box[0]),
        Math.min(b[1], p.box[1]),
        Math.max(b[2], p.box[2]),
        Math.max(b[3], p.box[3]),
      ],
      [Infinity, Infinity, -Infinity, -Infinity],
    );
    return { ps, box, w: box[2] - box[0], h: box[3] - box[1] };
  })
  .filter((s) => Math.max(s.w, s.h) >= Number(minSize))
  // nur Einzelmotive: eine Fläche (die Grundform) deckt nahezu das ganze Rechteck ab –
  // bei mehreren zusammenhängenden Motiven tut das keine einzelne
  .filter((s) =>
    s.ps.some((p) => (p.box[2] - p.box[0]) * (p.box[3] - p.box[1]) >= 0.85 * s.w * s.h),
  )
  .sort((a, b) => b.w * b.h - a.w * a.h);

const out = resolve(ROOT, 'shared/brand/szenen', part);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const index = sprites.map((s, n) => {
  const file = `${String(n + 1).padStart(2, '0')}.svg`;
  const pad = 2;
  const vb = [s.box[0] - pad, s.box[1] - pad, s.w + 2 * pad, s.h + 2 * pad].map(
    (v) => Math.round(v * 10) / 10,
  );
  writeFileSync(
    resolve(out, file),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">${s.ps.map((p) => p.tag).join('')}</svg>\n`,
  );
  return { file, w: vb[2], h: vb[3], x: vb[0], y: vb[1] };
});
writeFileSync(resolve(out, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`✓ ${index.length} Sprites → shared/brand/szenen/${part}/`);
