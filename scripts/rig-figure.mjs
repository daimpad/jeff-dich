// Zerlegt eine Figur aus shared/brand/band in animierbare Teile:  npm run rig -- gitarre
//
// Eingabe:  shared/brand/band/<name>.svg  +  <name>.rig.json (Regionen, Drehpunkte, Hierarchie)
// Ausgabe:  dieselbe SVG-Datei, ergänzt um
//   - data-part="…" an jedem Pfad, dessen Mittelpunkt (und ggf. Farbe) zu einem Teil passt
//   - <use>-Kopien großer, übergreifender Pfade, auf jede Teil-Region zugeschnitten. Die unterste
//     (Silhouette) bleibt zusätzlich vollständig stehen und wirkt bei Bewegung als Schatten; andere große
//     Pfade (Farbschichten über mehrere Teile) werden außerhalb der Teil-Regionen maskiert, damit nichts doppelt erscheint
//   - einen Ebenen-Plan (data-layer an jedem Element, <metadata data-rig="">) für shared/rig.js:
//     Flächen werden in Zeichenreihenfolge zu Ebenen gruppiert, sodass sich überlappende Flächen
//     ihre Reihenfolge behalten; jede Ebene kann dann als ein Bild gerastert und per GPU bewegt werden
//   - einen <style data-rig="">, der jedem Teil eine Transformation aus CSS-Variablen gibt:
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
  .replace(/<style data-rig(="")?>[\s\S]*?<\/style>/g, '')
  .replace(/<defs data-rig(="")?>[\s\S]*?<\/defs>/g, '')
  .replace(/<metadata data-rig="">[\s\S]*?<\/metadata>/g, '')
  .replace(/ data-layer="\d+"/g, '')
  .replace(/<use data-rig[^>]*\/>/g, '')
  .replace(/ data-part="[^"]*"/g, '')
  .replace(/ data-rig-root(="")?/g, '')
  .replace(/ id="[^"]*__rig-base-\d+"/g, '')
  .replace(/<g data-rig-base="" mask="[^"]*">(<path[^>]*\/>)<\/g>/g, '$1')
  .replace(/ mask="url\(#[^"]*__rig-mask-root\)"/g, '')
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
  if (h < 160) return 'gruen';
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
const baseBox = {};
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
    baseBox[id] = [x0, y0, x1, y1];
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
const mask = `<mask id="${prefix}-mask-root" maskUnits="userSpaceOnUse" x="${viewBox[0]}" y="${viewBox[1]}" width="${viewBox[2]}" height="${viewBox[3]}"><rect x="${viewBox[0]}" y="${viewBox[1]}" width="${viewBox[2]}" height="${viewBox[3]}" fill="#fff"/>${rig.parts
  .flatMap((p) => p.rules.map((r) => `<path d="${polyPath(r.region)}" fill="#000"/>`))
  .join('')}</mask>`;
const clips = rig.parts
  .map((p) => {
    const d = p.rules
      .map((r) => polyPath(r.region) + (r.exclude ?? []).map(polyPath).join(''))
      .join('');
    return `<clipPath id="${prefix}-clip-${p.name}" clipPathUnits="userSpaceOnUse"><path d="${d}" clip-rule="evenodd"/></clipPath>`;
  })
  .join('');
bases.forEach((id, i) => {
  // erste große Fläche = Silhouette (bleibt als Schatten); weitere werden im Ruhebereich maskiert.
  // Die Maske sitzt an einer Hülle, nicht am Pfad – sonst erbten die <use>-Kopien sie.
  const uses = rig.parts
    .map(
      (p) =>
        `<use data-rig="" data-part="${p.name}" href="#${id}" clip-path="url(#${prefix}-clip-${p.name})"/>`,
    )
    .join('');
  svg = svg.replace(new RegExp(`(<path id="${id}"[^>]*/>)`), (base) =>
    i > 0
      ? `<g data-rig-base="" mask="url(#${prefix}-mask-root)">${base}</g>${uses}`
      : `${base}${uses}`,
  );
});

// ---------- Ebenen-Plan ----------
// Greedy in Zeichenreihenfolge: ein Element kommt in die oberste Ebene seines Teils, wenn keine
// darüberliegende Ebene es überlappt (Bounding-Box); sonst beginnt eine neue Ebene.
const boxOf = (polys) => {
  const pts = polys.flat();
  return [
    Math.min(...pts.map((p) => p[0])),
    Math.min(...pts.map((p) => p[1])),
    Math.max(...pts.map((p) => p[0])),
    Math.max(...pts.map((p) => p[1])),
  ];
};
const regionBox = Object.fromEntries(
  rig.parts.map((p) => [p.name, boxOf(p.rules.map((r) => r.region))]),
);
const overlaps = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const union = (a, b) => [
  Math.min(a[0], b[0]),
  Math.min(a[1], b[1]),
  Math.max(a[2], b[2]),
  Math.max(a[3], b[3]),
];
const intersect = (a, b) => [
  Math.max(a[0], b[0]),
  Math.max(a[1], b[1]),
  Math.min(a[2], b[2]),
  Math.min(a[3], b[3]),
];
// Überlappung zählt erst ab einer Schnittfläche, die über reine Kantenberührung hinausgeht
// (Toleranz relativ zur kleineren Fläche, einstellbar per "layerTolerance" in der rig.json).
const tolerance = rig.layerTolerance ?? 0.01;
const area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
const conflicts = (a, b) => {
  if (!overlaps(a, b)) return false;
  return area(intersect(a, b)) > Math.max(4, tolerance * Math.min(area(a), area(b)));
};
const layers = [];
svg = svg.replace(/<(path|use)\b[^>]*\/>/g, (tag, kind) => {
  const part = tag.match(/data-part="([^"]*)"/)?.[1] ?? '';
  const box =
    kind === 'use'
      ? intersect(baseBox[tag.match(/href="#([^"]*)"/)[1]], regionBox[part])
      : svgPathBbox(tag.match(/\sd="([^"]*)"/)[1]);
  let i = layers.findLastIndex((l) => l.part === part);
  const blocked =
    i < 0 ||
    layers.slice(i + 1).some((l) => overlaps(l.box, box) && l.boxes.some((b) => conflicts(b, box)));
  if (blocked) {
    layers.push({ part, box, boxes: [box] });
    i = layers.length - 1;
  } else {
    layers[i].box = union(layers[i].box, box);
    layers[i].boxes.push(box);
  }
  return tag.replace(`<${kind}`, `<${kind} data-layer="${i}"`);
});
const meta = JSON.stringify({
  layers: layers.map((l) => ({ part: l.part, box: l.box.map((v) => Math.round(v * 10) / 10) })),
});

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
    `<svg$1 class="rig rig-${name}"><style data-rig="">${css}</style><metadata data-rig="">${meta}</metadata><defs data-rig="">${mask}${clips}</defs>`,
  )
  .replace(
    /(<svg[^>]*><style data-rig="">[\s\S]*?<\/style><metadata data-rig="">[\s\S]*?<\/metadata><defs data-rig="">[\s\S]*?<\/defs>)<g\b/,
    '$1<g data-rig-root=""',
  );
if (!svg.includes('data-rig-root=""'))
  throw new Error('Keine Wurzelgruppe <g> direkt im <svg> gefunden.');

writeFileSync(svgFile, svg);
console.log(
  `✓ ${name}: ${Object.entries(counts)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ')}, große Pfade ${bases.length}, Ebenen ${layers.length}`,
);
