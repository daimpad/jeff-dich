/**
 * Animierte Vulkan-Landschaft als Hintergrund (z. B. Hero hinter der Band).
 *
 *   const scene = await mountVulkanLandschaft(container);
 *   scene.stage   // Bühne in Szenen-Koordinaten (für eigene, mitlaufende Ebenen)
 *   scene.destroy()
 *
 * Ebenen von hinten nach vorn:
 *   Himmel (Verlauf, Kraterglühen, Funken) · ferne Hügel (neu gezeichnet) · Nebel ·
 *   Vulkan-Szene aus der CI (gerigt: Rauch quillt, Lava glüht, Vordergrund) · Herz-Partikel · Schleier
 * Parallaxe über Scrollen und Zeiger. Bei reduzierter Bewegung: Originalszene mit festen Herzen, ruhig.
 *
 * Der Container braucht eine Höhe (z. B. aspect-ratio oder min-height); die Szene füllt ihn
 * wie object-fit: cover, um den Hauptvulkan zentriert (vertikal bei 40 %).
 */
import gsap from 'gsap';
import hillsSvg from './huegel.svg?raw';
import { brandUrl } from '../brand.js';
import { mountRig } from '../rig.js';
import { onVisibilityChange, prefersReducedMotion } from '../motion.js';

const W = 3936.8;
const H = 2054.2;
const CRATER = [2000 / W, 660 / H]; // relativ zur Bühne
// Zuschnitt bei breiten Formaten wie object-position: 50% 40% (Wolke oben bleibt sichtbar)
const FOCUS_Y = 0.4;

const css = `
.vl{position:absolute;inset:0;overflow:hidden;container-type:size;background:#002808}
.vl-sky{position:absolute;inset:0;background:linear-gradient(#00140a 0%,#002808 45%,#053d16 78%,#0a4a1b 100%)}
.vl-glow{position:absolute;left:50%;top:0;width:120cqw;height:120cqh;transform:translateX(-50%);
  background:radial-gradient(closest-side at 50% 42%,rgba(233,182,40,.35),rgba(228,36,65,.12) 45%,transparent 70%);opacity:.6}
.vl-stage{--sw:max(100cqw,calc(100cqh * ${W / H}));position:absolute;left:50%;width:var(--sw);aspect-ratio:${W}/${H};
  top:calc((100cqh - var(--sw) * ${H / W}) * ${FOCUS_Y});translate:-50% 0}
.vl-layer{position:absolute;inset:0;will-change:transform;
  transform:translate3d(calc(var(--mx,0) * var(--d) * -30px),calc(var(--sy,0) * var(--d) * 90px + var(--my,0) * var(--d) * -14px),0)}
.vl-layer>svg{display:block;width:100%;height:100%}
.vl-mist{position:absolute;left:-20%;width:140%;height:14%;border-radius:50%;
  background:radial-gradient(closest-side,rgba(233,235,220,.16),transparent)}
.vl-spark{position:absolute;width:.35%;aspect-ratio:1;border-radius:50%;background:#e9b628;box-shadow:0 0 6px #e9b628;opacity:0}
.vl-heart{position:absolute;left:0;top:0;will-change:transform,opacity;opacity:0;pointer-events:none}
.vl-veil{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(rgba(0,40,8,.55) 0%,rgba(0,40,8,.22) 35%,rgba(0,40,8,.28) 70%,rgba(0,40,8,.85) 100%)}
`;

export async function mountVulkanLandschaft(container, { hearts = 14, sparks = 18 } = {}) {
  const still = prefersReducedMotion();
  const root = document.createElement('div');
  root.className = 'vl';
  root.innerHTML = `
    <style>${css}</style>
    <div class="vl-sky"></div>
    <div class="vl-glow"></div>
    <div class="vl-stage">
      <div class="vl-layer vl-sparks" style="--d:.15"></div>
      <div class="vl-layer vl-hills" style="--d:.3">${hillsSvg}</div>
      <div class="vl-layer vl-mists" style="--d:.45">
        <div class="vl-mist" style="top:62%"></div><div class="vl-mist" style="top:70%;left:-35%"></div>
      </div>
      <div class="vl-layer vl-scene" style="--d:.6"></div>
      <div class="vl-layer vl-hearts" style="--d:.75"></div>
    </div>
    <div class="vl-veil"></div>
  `;
  container.append(root);
  const stage = root.querySelector('.vl-stage');
  const ctx = gsap.context(() => {}, root);

  // eigener Himmel statt des Szenen-Himmels; feste Herzen werden zu Partikeln (bei reduzierter
  // Bewegung bleiben sie stehen). Nur bewegte Teile bekommen eigene Bildebenen.
  const rig = await mountRig(root.querySelector('.vl-scene'), 'szenen/vulkan.svg', {
    hidden: still ? ['himmel'] : ['himmel', 'herzen'],
    animated: still ? [] : ['rauch-mitte', 'rauch-links', 'rauch-rechts'],
  });
  const s = rig.el;

  const destroyers = [() => rig.destroy(), () => root.remove()];
  if (still) return { el: root, stage, destroy: () => destroyers.forEach((d) => d()) };

  ctx.add(() => {
    // Lava glüht, Kraterglühen im Himmel atmet mit
    gsap.to(s, { '--lava-b': 1.3, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true });
    gsap.to('.vl-glow', { opacity: 1, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true });
    // Rauch quillt und driftet (unterschiedliche Perioden → kein erkennbares Muster)
    gsap.to(s, {
      '--rauch-mitte-s': 1.03,
      '--rauch-mitte-y': -10,
      duration: 4.5,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
    gsap.to(s, {
      '--rauch-links-x': 30,
      '--rauch-links-s': 1.02,
      duration: 9,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
    gsap.to(s, {
      '--rauch-rechts-x': -28,
      '--rauch-rechts-s': 1.02,
      duration: 10.5,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
    // Nebel zieht
    root.querySelectorAll('.vl-mist').forEach((m, i) =>
      gsap.to(m, {
        xPercent: i ? 12 : -10,
        duration: 14 + i * 5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      }),
    );
  });

  // Funken am Himmel (Gold, sehr dezent)
  const sparkLayer = root.querySelector('.vl-sparks');
  for (let i = 0; i < sparks; i++) {
    const el = document.createElement('i');
    el.className = 'vl-spark';
    el.style.left = `${gsap.utils.random(5, 95)}%`;
    el.style.top = `${gsap.utils.random(3, 55)}%`;
    sparkLayer.append(el);
    ctx.add(() =>
      gsap.to(el, {
        opacity: gsap.utils.random(0.3, 0.8),
        duration: gsap.utils.random(1.5, 3.5),
        repeat: -1,
        yoyo: true,
        delay: gsap.utils.random(0, 4),
        ease: 'sine.inOut',
      }),
    );
  }

  // Herz-Partikel: steigen aus dem Krater, fächern sich auf, drehen leicht und verblassen
  const index = await fetch(brandUrl('szenen/herzen/index.json')).then((r) => r.json());
  const heartLayer = root.querySelector('.vl-hearts');
  const spawn = (el, initial) =>
    ctx.add(() => {
      const sprite = gsap.utils.random(index);
      const size = gsap.utils.random(0.6, 1.15);
      el.src = brandUrl(`szenen/herzen/${sprite.file}`);
      el.style.width = `${((sprite.w * size) / W) * 100}%`;
      // Positionen in Pixeln der Bühne (Transformationen statt left/top → nur GPU)
      const { width: sw, height: sh } = heartLayer.getBoundingClientRect();
      const dir = gsap.utils.random([-1, 1]);
      const spread = gsap.utils.random(0.08, 0.42);
      const duration = gsap.utils.random(8, 13);
      const tl = gsap.timeline({ onComplete: () => spawn(el, false) });
      tl.fromTo(
        el,
        {
          x: (CRATER[0] + gsap.utils.random(-0.02, 0.02)) * sw,
          y: CRATER[1] * sh,
          xPercent: -50,
          yPercent: -50,
          scale: 0.2,
          rotation: gsap.utils.random(-15, 15),
        },
        {
          x: (CRATER[0] + dir * spread) * sw,
          y: (gsap.utils.random(-12, 25) / 100) * sh,
          scale: 1,
          rotation: gsap.utils.random(-25, 25),
          duration,
          ease: 'power1.out',
        },
      )
        .to(el, { opacity: 1, duration: duration * 0.2, ease: 'sine.out' }, 0)
        .to(el, { opacity: 0, duration: duration * 0.35, ease: 'sine.in' }, duration * 0.65);
      // Beim Start schon verteilt, statt alle zugleich aus dem Krater
      if (initial) tl.progress(gsap.utils.random(0, 0.85));
    });
  for (let i = 0; i < hearts; i++) {
    const el = document.createElement('img');
    el.className = 'vl-heart';
    el.alt = '';
    heartLayer.append(el);
    spawn(el, true);
  }

  // Parallaxe: Scrollposition des Containers und Zeiger, weich nachgeführt
  const setMx = gsap.quickTo(root, '--mx', { duration: 1.2, ease: 'power3.out' });
  const setMy = gsap.quickTo(root, '--my', { duration: 1.2, ease: 'power3.out' });
  const setSy = gsap.quickTo(root, '--sy', { duration: 0.6, ease: 'power2.out' });
  const onPointer = (e) => {
    const r = root.getBoundingClientRect();
    setMx(((e.clientX - r.left) / r.width) * 2 - 1);
    setMy(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onScroll = () => {
    const r = root.getBoundingClientRect();
    setSy(
      gsap.utils.clamp(-1, 1, (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight),
    );
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // außerhalb des Viewports alles anhalten
  const stopObserving = onVisibilityChange(root, (visible) =>
    ctx.getTweens().forEach((t) => (visible ? t.resume() : t.pause())),
  );

  destroyers.unshift(() => {
    stopObserving();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('scroll', onScroll);
    ctx.revert();
  });
  return { el: root, stage, destroy: () => destroyers.forEach((d) => d()) };
}
