/**
 * Die Jeff-Dich-Band: vier gerigte Figuren mit gemeinsamem Takt.
 *
 *   const band = await mountBand(container);   // Figuren nebeneinander, unten bündig
 *   band.play(); band.pause(); band.destroy();
 *
 * Die Animationen setzen CSS-Variablen an den Rig-Containern (siehe shared/rig.js);
 * jede Figur-Schleife ist exakt zwei Takte lang, damit alle synchron bleiben.
 */
import gsap from 'gsap';
import { mountRig } from './rig.js';
import { prefersReducedMotion } from './motion.js';

// Gemeinsamer Takt: 120 BPM, ein Takt = 4 Schläge, Schleife = 2 Takte
const BEAT = 0.5;
const BAR = BEAT * 4;

// Je Figur: Datei, Seitenverhältnis, Animation (setzt CSS-Variablen am Rig-Container, siehe npm run rig)
export const FIGURES = [
  { id: 'voice', label: 'Voice', ratio: '1321/1789', animate: animateVoice },
  { id: 'gitarre', label: 'Gitarre', ratio: '1143/1676', animate: animateGitarre },
  { id: 'drums', label: 'Drums', ratio: '1617/1510', animate: animateDrums },
  { id: 'bass', label: 'Bass', ratio: '859/1714', animate: animateBass },
];

/**
 * Setzt die Band in `container`: Figuren nebeneinander, unten bündig, umbrechend.
 * `height` ist die Figurenhöhe als CSS-Länge (Inline-Styles, da Tailwind nur Artefakt-Ordner scannt).
 */
export async function mountBand(
  container,
  { height = 'clamp(14rem, 24vw, 20rem)', gap = '0.5rem', wrap = true } = {},
) {
  container.innerHTML = `
    <div style="display:flex;flex-wrap:${wrap ? 'wrap' : 'nowrap'};align-items:flex-end;justify-content:center;gap:1.5rem ${gap}">
      ${FIGURES.map(
        (f) =>
          `<figure class="band-${f.id}" style="margin:0;height:${height};aspect-ratio:${f.ratio}" role="img" aria-label="${f.label} der Jeff-Dich-Band"></figure>`,
      ).join('')}
    </div>`;
  const master = gsap.timeline({ repeat: -1, paused: true });
  const rigs = await Promise.all(
    FIGURES.map((f) => mountRig(container.querySelector(`.band-${f.id}`), `band/${f.id}.svg`)),
  );
  if (!prefersReducedMotion()) FIGURES.forEach((f, i) => master.add(f.animate(rigs[i].el), 0));
  return {
    master,
    play: () => !prefersReducedMotion() && master.play(),
    pause: () => master.pause(),
    destroy: () => {
      master.kill();
      rigs.forEach((r) => r.destroy());
    },
  };
}

// ---------- Animationen je Figur (Länge jeweils 2 Takte) ----------

/** Ruhewert einer Rig-Variable: Skalierung 1, sonst 0 */
const rest = (prop) => (prop.endsWith('-s') ? 1 : 0);

/** Kurzer Akzent: schnell hin, weich zurück */
const hit = (tl, svg, prop, value, at, back = BEAT * 0.6) =>
  tl
    .to(svg, { [prop]: value, duration: 0.07, ease: 'power2.out' }, at)
    .to(svg, { [prop]: rest(prop), duration: back, ease: 'power2.inOut' }, at + 0.07);

/** Nicken auf jeden zweiten Schlag mit nachschwingenden Haaren */
function nod(tl, svg, amount, hair, every = 2) {
  for (let t = 0; t < BAR * 2; t += BEAT * every) {
    tl.to(svg, { '--kopf-r': amount, duration: BEAT * 0.35, ease: 'power3.in' }, t)
      .to(svg, { '--kopf-r': 0, duration: BEAT * every - BEAT * 0.35, ease: 'power2.out' })
      .to(svg, { '--haare-r': -hair, duration: BEAT * 0.4, ease: 'power2.out' }, t + 0.08)
      .to(svg, { '--haare-r': 0, duration: BEAT * every - BEAT * 0.4 - 0.08, ease: 'sine.inOut' });
  }
}

function bounce(tl, svg, prop, amount) {
  for (let i = 0; i < 8; i++) {
    tl.to(svg, { [prop]: amount, duration: BEAT * 0.4, ease: 'power2.out' }, i * BEAT).to(svg, {
      [prop]: 0,
      duration: BEAT * 0.5,
      ease: 'power2.in',
    });
  }
}

function animateGitarre(svg) {
  const tl = gsap.timeline();
  bounce(tl, svg, '--koerper-y', -10);
  nod(tl, svg, 9, 5);
  tl.fromTo(
    svg,
    { '--arm-schlag-r': -5 },
    { '--arm-schlag-r': 5, duration: BEAT / 2, ease: 'sine.inOut', repeat: 15, yoyo: true },
    0,
  );
  tl.to(svg, { '--gitarre-r': -1.5, duration: BAR, ease: 'sine.inOut', repeat: 1, yoyo: true }, 0);
  return tl;
}

function animateBass(svg) {
  const tl = gsap.timeline();
  bounce(tl, svg, '--koerper-y', -6);
  // ruhigeres Wiegen statt Nicken
  tl.to(svg, { '--kopf-r': -6, duration: BAR / 2, ease: 'sine.inOut', repeat: 3, yoyo: true }, 0);
  // Haare: gleiche Periode, aber trägere Kurve → wirken nachschwingend, ohne die Schleife zu verlängern
  tl.to(svg, { '--haare-r': 4, duration: BAR / 2, ease: 'power2.inOut', repeat: 3, yoyo: true }, 0);
  tl.fromTo(
    svg,
    { '--arm-zupf-r': -4 },
    { '--arm-zupf-r': 4, duration: BEAT, ease: 'sine.inOut', repeat: 7, yoyo: true },
    0,
  );
  tl.to(svg, { '--bass-r': 1.5, duration: BAR, ease: 'sine.inOut', repeat: 1, yoyo: true }, 0);
  return tl;
}

function animateVoice(svg) {
  const tl = gsap.timeline();
  bounce(tl, svg, '--koerper-y', -8);
  tl.to(svg, { '--kopf-r': -6, duration: BEAT * 2, ease: 'sine.inOut', repeat: 3, yoyo: true }, 0);
  tl.to(
    svg,
    { '--haare-r': 4, duration: BEAT * 2, ease: 'power2.inOut', repeat: 3, yoyo: true },
    0,
  );
  // Mikrofon folgt dem Mund
  tl.to(
    svg,
    { '--arm-mikro-r': -5, duration: BEAT * 2, ease: 'sine.inOut', repeat: 3, yoyo: true },
    0,
  );
  tl.fromTo(
    svg,
    { '--arm-schlag-r': -5 },
    { '--arm-schlag-r': 5, duration: BEAT, ease: 'sine.inOut', repeat: 7, yoyo: true },
    0,
  );
  tl.to(svg, { '--gitarre-r': 1.5, duration: BAR, ease: 'sine.inOut', repeat: 1, yoyo: true }, 0);
  return tl;
}

function animateDrums(svg) {
  const tl = gsap.timeline();
  nod(tl, svg, 5, 2, 1);
  bounce(tl, svg, '--oberkoerper-y', 4);
  for (let i = 0; i < 8; i++) {
    const t = i * BEAT;
    // linker Stock: Tom auf 1 und 3, Snare-Gefühl auf 2 und 4 über Ausholen
    tl.to(svg, { '--arm-links-r': -14, duration: BEAT * 0.4, ease: 'power2.out' }, t).to(
      svg,
      { '--arm-links-r': 0, duration: BEAT * 0.1, ease: 'power3.in' },
      t + BEAT * 0.9,
    );
    // Stock trifft am Ende des Schlags → Tom reagiert zu Beginn des nächsten (in der Schleife umlaufend)
    if (i % 2 === 1) hit(tl, svg, '--tom-s', 1.03, (t + BEAT) % (BAR * 2), BEAT * 0.4);
    if (i % 2 === 0) hit(tl, svg, '--bassdrum-s', 1.02, t, BEAT * 0.4);
    if (i % 2 === 1) hit(tl, svg, '--hihat-y', -6, t, BEAT * 0.3);
  }
  // rechter Stock auf der Ride in Achteln, Becken federt nach
  for (let i = 0; i < 16; i++) {
    const t = (i * BEAT) / 2;
    tl.fromTo(
      svg,
      { '--arm-rechts-r': 6 },
      { '--arm-rechts-r': 0, duration: BEAT / 2, ease: 'power2.in' },
      t,
    );
    tl.fromTo(
      svg,
      { '--becken-rechts-r': 2 },
      { '--becken-rechts-r': 0, duration: BEAT / 2, ease: 'elastic.out(1, 0.4)' },
      (t + BEAT / 2) % (BAR * 2),
    );
  }
  // Crash zu Beginn jedes Takts
  for (const t of [0, BAR]) {
    tl.fromTo(
      svg,
      { '--becken-links-r': 4 },
      { '--becken-links-r': 0, duration: BAR * 0.8, ease: 'elastic.out(1, 0.25)' },
      t,
    );
    tl.fromTo(
      svg,
      { '--becken-mitte-r': -3 },
      { '--becken-mitte-r': 0, duration: BEAT * 1.8, ease: 'elastic.out(1, 0.25)' },
      t + BEAT * 2,
    );
  }
  return tl;
}
