/**
 * Gerigte Figuren (npm run rig) performant darstellen.
 *
 * Die SVG wird beim Laden anhand des Ebenen-Plans aus dem Rig in wenige Bildebenen zerlegt
 * (je Ebene ein <img>, auf ihren Inhalt zugeschnitten). Jede Ebene rastert der Browser einmal;
 * Bewegungen sind danach reine GPU-Transformationen – auch mit mehreren Figuren flüssig.
 * Gesteuert wird wie bei der Inline-SVG über CSS-Variablen am Container:
 *
 *   const rig = await mountRig(holder, 'band/gitarre.svg');
 *   gsap.to(rig.el, { '--kopf-r': 8 });   // --<teil>-r / -x / -y / -s
 *   rig.parts      // Namen der Teile
 *   rig.destroy()
 */
import { loadSvg } from './brand.js';

const PAD = 3; // Rand je Ebene in viewBox-Einheiten (Kantenglättung)

export async function mountRig(holder, path, { crop = true } = {}) {
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
  const partT = Object.fromEntries(
    [...css.matchAll(/\[data-part="([^"]+)"\]\{transform:([^}]*)\}/g)].map((m) => [
      m[1],
      toUnits(m[2]),
    ]),
  );

  // Elemente je Ebene als Markup sammeln
  const ser = new XMLSerializer();
  const defsXml = ser.serializeToString(svg.querySelector('defs[data-rig]'));
  const content = layers.map(() => []);
  const needs = layers.map(() => new Set());
  const bases = {};
  for (const e of svg.querySelectorAll('[data-layer]')) {
    const i = Number(e.getAttribute('data-layer'));
    let xml = ser.serializeToString(e);
    const wrap =
      e.parentNode.getAttribute?.('data-rig-base') !== null && e.parentNode.localName === 'g';
    if (wrap) xml = `<g mask="${e.parentNode.getAttribute('mask')}">${xml}</g>`;
    content[i].push(xml);
    if (e.id?.includes('__rig-base-')) bases[e.id] = xml.replace(/<g mask="[^"]*">|<\/g>$/g, '');
    if (e.localName === 'use') needs[i].add(e.getAttribute('href').slice(1));
  }

  const el = document.createElement('div');
  el.className = 'jd-rig';
  el.style.cssText = `position:relative;width:100%;aspect-ratio:${vw}/${vh};contain:layout paint`;
  const imgs = layers.map((layer) => {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.dataset.layer = layer.part || 'root';
    img.style.cssText = `position:absolute;max-width:none;will-change:transform;transform:${rootT} ${layer.part ? partT[layer.part] : ''}`;
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
    urls = layers.map((layer, i) => {
      const b = crop ? layer.box : [vx, vy, vx + vw, vy + vh];
      const left = snap(Math.max(0, b[0] - PAD - vx), Math.floor);
      const top = snap(Math.max(0, b[1] - PAD - vy), Math.floor);
      const right = snap(Math.min(vw, b[2] + PAD - vx), Math.ceil);
      const bottom = snap(Math.min(vh, b[3] + PAD - vy), Math.ceil);
      const [x0, y0, w, h] = [vx + left / u, vy + top / u, (right - left) / u, (bottom - top) / u];
      const refs = [...needs[i]].map((id) => bases[id]).join('');
      const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}">${defsXml.replace('</defs>', `${refs}</defs>`)}${content[i].join('')}</svg>`;
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
    parts: Object.keys(partT),
    destroy() {
      ro.disconnect();
      urls.forEach((url) => URL.revokeObjectURL(url));
      el.remove();
    },
  };
}
