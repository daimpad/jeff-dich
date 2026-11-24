/**
 * Gerigte Figuren (npm run rig) performant darstellen.
 *
 * Die SVG wird beim Laden anhand des Ebenen-Plans aus dem Rig in wenige Bildebenen zerlegt
 * (je Ebene ein <img>, auf ihren Inhalt zugeschnitten). Jede Ebene rastert der Browser einmal;
 * Bewegungen sind danach reine GPU-Transformationen – auch mit mehreren Figuren flüssig.
 * Gesteuert wird wie bei der Inline-SVG über CSS-Variablen am Container:
 *
 *   const rig = await mountRig(holder, 'band/gitarre.svg');
 *   gsap.to(rig.el, { '--kopf-r': 8 });   // --<teil>-r / -x / -y / -s / -o (Deckkraft) / -b (Helligkeit*)
 *   * nur für Teile mit "glow": true in der rig.json
 *   rig.parts      // Namen der Teile
 *   rig.destroy()
 *
 * Optionen (für Szenen mit vielen unbewegten Flächen):
 *   animated: ['rauch', 'lava']  – nur diese Teile werden bewegt; direkt aufeinanderfolgende Ebenen
 *                                 aller übrigen werden zu einem Bild zusammengefasst (weniger Ebenen)
 *   hidden:   ['himmel']          – diese Teile werden gar nicht dargestellt
 * Glühende Teile ("glow": true) erhalten je Ebene eine einmalig aufgehellte Kopie; --<teil>-b
 * (1 … 1.4) blendet sie ein. So kostet das Glühen nur Deckkraft statt eines Filters pro Bild.
 */
import { loadSvg } from './brand.js';

const PAD = 3; // Rand je Ebene in viewBox-Einheiten (Kantenglättung)
const GLOW = 1.4; // Helligkeit der Glüh-Kopie

export async function mountRig(holder, path, { crop = true, animated, hidden = [] } = {}) {
  const markup = await loadSvg(path);
  const svg = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
  const rigStyle = svg.querySelector('style[data-rig]');
  const metaEl = svg.querySelector('metadata[data-rig]');
  if (!rigStyle || !metaEl) throw new Error(`${path} ist nicht gerigt (npm run rig).`);
  const [vx, vy, vw, vh] = svg
    .getAttribute('viewBox')
    .split(/[\s,]+/)
    .map(Number);
  const { layers } = JSON.parse(metaEl.textContent);

  // Transformationen aus dem Rig-CSS lesen und von viewBox-Einheiten auf --rig-u umrechnen
  const toUnits = (t) =>
    t.replace(/\*1px/g, '*var(--rig-u)').replace(/(-?\d+(?:\.\d+)?)px/g, 'calc($1*var(--rig-u))');
  const css = rigStyle.textContent;
  const rootT = toUnits(css.match(/\[data-rig-root\]\{transform:([^}]*)\}/)[1]);
  // je Teil: transform, opacity und ggf. filter (Deklarationen durch ";" getrennt)
  const partCss = Object.fromEntries(
    [...css.matchAll(/\[data-part="([^"]+)"\]\{([^}]*)\}/g)].map((m) => [
      m[1],
      Object.fromEntries(
        m[2].split(';').map((d) => [d.slice(0, d.indexOf(':')), d.slice(d.indexOf(':') + 1)]),
      ),
    ]),
  );
  const rootName = rootT.match(/var\(--([a-z0-9-]+?)-x/)[1];
  const glowParts = new Set(Object.keys(partCss).filter((p) => partCss[p].filter));
  const partStyle = (part, glow) => {
    if (!part) return `transform:${rootT}`;
    const { transform = '', opacity } = partCss[part];
    return [
      `transform:${rootT} ${toUnits(transform)}`,
      glow
        ? `opacity:clamp(0,calc((var(--${part}-b,1) - 1) / ${GLOW - 1}),1)`
        : opacity && `opacity:${opacity}`,
    ]
      .filter(Boolean)
      .join(';');
  };

  // Elemente je Ebene als Markup sammeln
  const ser = new XMLSerializer();
  const defsXml = ser.serializeToString(svg.querySelector('defs[data-rig]'));
  const content = layers.map(() => []);
  const pathsOnly = layers.map(() => []);
  const needs = layers.map(() => new Set());
  const bases = {};
  for (const e of svg.querySelectorAll('[data-layer]')) {
    const i = Number(e.getAttribute('data-layer'));
    let xml = ser.serializeToString(e);
    const wrap =
      e.parentNode.getAttribute?.('data-rig-base') !== null && e.parentNode.localName === 'g';
    if (wrap) xml = `<g mask="${e.parentNode.getAttribute('mask')}">${xml}</g>`;
    content[i].push(xml);
    if (e.localName === 'path') pathsOnly[i].push(xml);
    if (e.id?.includes('__rig-base-')) bases[e.id] = xml.replace(/<g mask="[^"]*">|<\/g>$/g, '');
    if (e.localName === 'use') needs[i].add(e.getAttribute('href').slice(1));
  }

  const el = document.createElement('div');
  el.className = 'jd-rig';
  el.style.cssText = `position:relative;width:100%;aspect-ratio:${vw}/${vh};contain:layout paint`;
  // Ruhewerte explizit setzen: GSAP liest nicht gesetzte Variablen als 0 (Skalierung 0 = unsichtbar)
  for (const part of Object.keys(partCss)) {
    for (const [k, v] of [
      ['r', 0],
      ['x', 0],
      ['y', 0],
      ['s', 1],
      ['o', 1],
      ['b', 1],
    ])
      el.style.setProperty(`--${part}-${k}`, v);
  }
  // Ebenen zu Bildgruppen zusammenfassen (siehe Optionen oben)
  const moves = (part) => !animated || animated.includes(part || rootName);
  const unionBox = (boxes) =>
    boxes.reduce((a, b) => [
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.max(a[2], b[2]),
      Math.max(a[3], b[3]),
    ]);
  const groups = [];
  layers.forEach((layer, i) => {
    if (hidden.includes(layer.part)) return;
    const last = groups.at(-1);
    if (!moves(layer.part) && last && !last.moving) {
      last.layers.push(i);
      return;
    }
    const moving = moves(layer.part);
    groups.push({ part: moving ? layer.part : '', moving, layers: [i] });
    // bewegte, glühende Teile: aufgehellte Kopie direkt über jeder Ebene
    if (moving && glowParts.has(layer.part))
      groups.push({ part: layer.part, moving: true, glow: 'layer', layers: [i] });
  });
  for (const g of groups) {
    g.box = unionBox(g.layers.map((i) => layers[i].box));
    g.content = g.layers.flatMap((i) => content[i]).join('');
    if (g.glow) g.content = `<g filter="url(#rig-glow)">${g.content}</g>`;
    g.needs = new Set(g.layers.flatMap((i) => [...needs[i]]));
  }
  // unbewegte, glühende Teile: eine Überlagerung ganz oben – die aufgehellte statische Szene,
  // maskiert auf die Flächen des Teils (Konturen darüber bleiben so erhalten)
  const extraDefs = [];
  for (const part of glowParts) {
    if (moves(part) || hidden.includes(part)) continue;
    const own = layers.map((l, i) => i).filter((i) => layers[i].part === part);
    if (!own.length) continue;
    const statics = groups.filter((g) => !g.moving);
    const id = `rig-glowmask-${part}`;
    extraDefs.push(
      `<mask id="${id}" maskUnits="userSpaceOnUse" x="${vx}" y="${vy}" width="${vw}" height="${vh}" style="mask-type:alpha">${own.flatMap((i) => pathsOnly[i]).join('')}</mask>`,
    );
    groups.push({
      part,
      moving: true,
      glow: 'overlay',
      layers: own,
      box: unionBox(own.map((i) => layers[i].box)),
      content: `<g mask="url(#${id})" filter="url(#rig-glow)">${statics.map((g) => g.content).join('')}</g>`,
      needs: new Set(statics.flatMap((g) => [...g.needs])),
      maskDef: extraDefs.at(-1),
    });
  }
  const glowFilter = `<filter id="rig-glow" color-interpolation-filters="sRGB"><feComponentTransfer>${[
    'R',
    'G',
    'B',
  ]
    .map((c) => `<feFunc${c} type="linear" slope="${GLOW}"/>`)
    .join('')}</feComponentTransfer></filter>`;

  const imgs = groups.map((g) => {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.dataset.layer = (g.part || 'root') + (g.glow ? ':glow' : '');
    img.style.cssText = `position:absolute;max-width:none;${g.moving ? 'will-change:transform,opacity;' : ''}${partStyle(g.part, g.glow)}`;
    el.append(img);
    return img;
  });
  let urls = [];

  // Ebenen auf ganze Geräte-Pixel zuschneiden und platzieren (sonst entstehen beim Zusammensetzen
  // Subpixel-Versätze). Wird bei jeder Größenänderung neu berechnet.
  let lastWidth = 0;
  const layout = () => {
    const width = el.getBoundingClientRect().width;
    if (!width || width === lastWidth) return;
    lastWidth = width;
    const u = width / vw; // CSS-Pixel pro viewBox-Einheit
    const dpr = window.devicePixelRatio || 1;
    const snap = (v, f) => f(v * u * dpr) / dpr; // CSS-Pixel, auf Geräte-Pixel gerundet
    el.style.setProperty('--rig-u', `${u}px`);
    const old = urls;
    urls = groups.map((g, i) => {
      const b = crop ? g.box : [vx, vy, vx + vw, vy + vh];
      const left = snap(Math.max(0, b[0] - PAD - vx), Math.floor);
      const top = snap(Math.max(0, b[1] - PAD - vy), Math.floor);
      const right = snap(Math.min(vw, b[2] + PAD - vx), Math.ceil);
      const bottom = snap(Math.min(vh, b[3] + PAD - vy), Math.ceil);
      const [x0, y0, w, h] = [vx + left / u, vy + top / u, (right - left) / u, (bottom - top) / u];
      const refs =
        [...g.needs].map((id) => bases[id]).join('') +
        (g.glow ? glowFilter : '') +
        (g.maskDef ?? '');
      const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}">${defsXml.replace('</defs>', `${refs}</defs>`)}${g.content}</svg>`;
      const url = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' }));
      Object.assign(imgs[i].style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${right - left}px`,
        height: `${bottom - top}px`,
        transformOrigin: `${-left}px ${-top}px`, // Ursprung der Figur
      });
      imgs[i].src = url;
      return url;
    });
    setTimeout(() => old.forEach((u) => URL.revokeObjectURL(u)), 1000);
  };
  const ro = new ResizeObserver(() => requestAnimationFrame(layout));
  ro.observe(el);
  holder.replaceChildren(el);
  layout();
  await Promise.all(imgs.map((img) => img.decode().catch(() => {})));

  return {
    el,
    parts: Object.keys(partCss),
    destroy() {
      ro.disconnect();
      urls.forEach((url) => URL.revokeObjectURL(url));
      el.remove();
    },
  };
}
