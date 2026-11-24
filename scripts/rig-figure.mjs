// Zerlegt eine Figur aus shared/brand/band in animierbare Teile:  npm run rig -- gitarre
//
// Eingabe:  shared/brand/band/<name>.svg  +  <name>.rig.json (Regionen, Drehpunkte, Hierarchie)
// Ausgabe:  dieselbe SVG-Datei, ergänzt um
//   - data-part="…" an jedem Pfad, dessen Mittelpunkt (und ggf. Farbe) zu einem Teil passt
//   - <use>-Kopien großer, übergreifender Pfade (z. B. Silhouette), auf jede Teil-Region zugeschnitten
//   - einen <style data-rig>, der jedem Teil eine Transformation aus CSS-Variablen gibt:
//       --<teil>-r (Grad), --<teil>-x / --<teil>-y (viewBox-Einheiten), --<teil>-s (Skalierung)
// Die Zeichenreihenfolge der Pfade bleibt unverändert, das Aussehen in Ruhe also identisch.
// Das Skript ist idempotent: vorhandene Rig-Daten werden vorher entfernt.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { svgPathBbox } from 'svg-path-bbox';
import { ROOT } from './artifacts.mjs';

const name = process.argv[2];
if (!name) {
  console.error('Aufruf: npm run rig -- <figur>   (z. B. gitarre)');
  process.exit(1);
}
const svgFile = resolve(ROOT, 'shared/brand/band', `${name}.svg`);
const rig = JSON.parse(
  readFileSync(resolve(ROOT, 'shared/brand/band', `${name}.rig.json`), 'utf8'),
);
const prefix = `${name}_svg__rig`;

// ---------- vorhandenes Rig entfernen ----------
let svg = readFileSync(svgFile, 'utf8')
  .replace(/<style data-rig>[\s\S]*?<\/style>/g, '')
  .replace(/<defs data-rig>[\s\S]*?<\/defs>/g, '')
  .replace(/<use data-rig[^>]*\/>/g, '')
  .replace(/ data-part="[^"]*"/g, '')
  .replace(/ data-rig-root/g, '')
  .replace(/ id="[^"]*__rig-base-\d+"/g, '')
  .replace(/(<svg[^>]*?) class="rig[^"]*"/, '$1');

// ---------- Geometrie ----------
const inPoly = ([x, y], poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const colorClass = (hex) => {
  if (!hex?.startsWith('#')) return 'dunkel';
  const v =
    hex.length === 4
      ? [...hex.slice(1)].map((c) => c + c)
      : [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)];
  const [r, g, b] = v.map((c) => parseInt(c, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (l < 0.2) return 'dunkel';
  if (s < 0.2) return 'grau';
  if (h >= 250 && h < 320) return 'lila';
  if (h < 25 || h >= 340) return 'rot';
  if (h < 45) return 'orange';
  if (h < 70) return 'gelb';
  if (h < 250) return 'blau';
  return 'pink';
};

const viewBox = svg
  .match(/viewBox="([^"]*)"/)[1]
  .split(/[\s,]+/)
  .map(Number);
const matches = (rule, center, color) =>
  inPoly(center, rule.region) &&
  !(rule.exclude ?? []).some((poly) => inPoly(center, poly)) &&
  (!rule.colors || rule.colors.includes(color));

// ---------- Pfade zuordnen ----------
const counts = Object.fromEntries(rig.parts.map((p) => [p.name, 0]));
const bases = [];
let index = 0;
svg = svg.replace(/<path\b[^>]*\/>/g, (tag) => {
  const d = tag.match(/\sd="([^"]*)"/)?.[1];
  if (!d) return tag;
  const [x0, y0, x1, y1] = svgPathBbox(d);
  const spanning = x1 - x0 > viewBox[2] * 0.4 || y1 - y0 > viewBox[3] * 0.4;
  if (spanning) {
    // große Fläche (Silhouette): bleibt beim Root, Teile bekommen zugeschnittene Kopien
    const id = `${prefix}-base-${index++}`;
    bases.push(id);
    return tag.replace('<path', `<path id="${id}"`);
  }
  const center = [(x0 + x1) / 2, (y0 + y1) / 2];
  const color = colorClass(tag.match(/fill="([^"]*)"/)?.[1]);
  const part = rig.parts.find((p) => p.rules.some((rule) => matches(rule, center, color)));
  if (!part) return tag;
  counts[part.name]++;
  return tag.replace('<path', `<path data-part="${part.name}"`);
});

// ---------- Clip-Regionen und Kopien der großen Pfade ----------
const polyPath = (poly) => `M${poly.map((p) => p.join(',')).join('L')}Z`;
const clips = rig.parts
  .map((p) => {
    const d = p.rules
      .map((r) => polyPath(r.region) + (r.exclude ?? []).map(polyPath).join(''))
      .join('');
    return `<clipPath id="${prefix}-clip-${p.name}" clipPathUnits="userSpaceOnUse"><path d="${d}" clip-rule="evenodd"/></clipPath>`;
  })
  .join('');
for (const id of bases) {
  const uses = rig.parts
    .map(
      (p) =>
        `<use data-rig data-part="${p.name}" href="#${id}" clip-path="url(#${prefix}-clip-${p.name})"/>`,
    )
    .join('');
  svg = svg.replace(new RegExp(`(<path id="${id}"[^>]*/>)`), `$1${uses}`);
}

// ---------- CSS-Transformationen ----------
const byName = Object.fromEntries(rig.parts.map((p) => [p.name, p]));
const step = (n, [px, py]) =>
  `translate(calc(var(--${n}-x,0)*1px),calc(var(--${n}-y,0)*1px)) translate(${px}px,${py}px) rotate(calc(var(--${n}-r,0)*1deg)) scale(var(--${n}-s,1)) translate(${-px}px,${-py}px)`;
const chain = (part) => {
  const list = [];
  for (let p = part; p && p.name !== rig.root.name; p = byName[p.parent]) list.unshift(p);
  return list.map((p) => step(p.name, p.pivot)).join(' ');
};
const scope = `.rig-${name}`;
const css = [
  `${scope} [data-rig-root],${scope} [data-part]{transform-box:view-box;transform-origin:0 0}`,
  `${scope} [data-rig-root]{transform:${step(rig.root.name, rig.root.pivot)}}`,
  ...rig.parts.map((p) => `${scope} [data-part="${p.name}"]{transform:${chain(p)}}`),
].join('');

svg = svg
  .replace(
    /<svg\b([^>]*)>/,
    `<svg$1 class="rig rig-${name}"><style data-rig>${css}</style><defs data-rig>${clips}</defs>`,
  )
  .replace(
    /(<svg[^>]*>(?:<style data-rig>[\s\S]*?<\/style><defs data-rig>[\s\S]*?<\/defs>)?)<g\b/,
    '$1<g data-rig-root',
  );

writeFileSync(svgFile, svg);
console.log(
  `✓ ${name}: ${Object.entries(counts)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ')}, große Pfade ${bases.length}`,
);
