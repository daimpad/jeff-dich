import gsap from 'gsap';
import { mountRig } from '../../shared/rig.js';
import { onVisibilityChange, prefersReducedMotion } from '../../shared/motion.js';

// Takt: 120 BPM → ein Schlag = 0,5 s
const BEAT = 0.5;

export default function mount(root) {
  root.innerHTML = `
    <section class="flex flex-col items-center gap-4 bg-primary px-4 py-10 font-sans text-white">
      <div class="figure aspect-[1143/1676] h-[32rem] max-w-full" role="img" aria-label="Gitarrist der Jeff-Dich-Band"></div>
      <p class="text-sm text-white/70">Rig-Test · Hover beschleunigt</p>
    </section>
  `;
  const holder = root.querySelector('.figure');
  let tl;
  let stopObserving = () => {};
  let disposed = false;

  let rig;
  mountRig(holder, 'band/gitarre.svg').then((loaded) => {
    rig = loaded;
    if (disposed) return rig.destroy();
    // Alle Teile werden über CSS-Variablen am Rig-Container bewegt (siehe npm run rig, shared/rig.js)
    const svg = rig.el;
    if (prefersReducedMotion()) return;

    const v = (name) => `--${name}`;
    tl = gsap.timeline({ repeat: -1, paused: true });

    // Körper federt auf jeden Schlag (8 Schläge = Schleifenlänge)
    for (let i = 0; i < 8; i++) {
      tl.to(svg, { [v('koerper-y')]: -10, duration: BEAT * 0.4, ease: 'power2.out' }, i * BEAT).to(
        svg,
        { [v('koerper-y')]: 0, duration: BEAT * 0.5, ease: 'power2.in' },
      );
    }

    // Kopf nickt auf den Schlag (schnell runter, weich hoch)
    for (let i = 0; i < 4; i++) {
      tl.to(svg, { [v('kopf-r')]: 9, duration: BEAT * 0.35, ease: 'power3.in' }, i * BEAT * 2)
        .to(svg, { [v('kopf-r')]: -2, duration: BEAT * 0.65, ease: 'power2.out' })
        .to(svg, { [v('kopf-r')]: 0, duration: BEAT, ease: 'sine.inOut' });
    }

    // Haare schwingen gegen die Kopfbewegung nach (Follow-through, leicht verzögert)
    for (let i = 0; i < 4; i++) {
      tl.to(
        svg,
        { [v('haare-r')]: -5, duration: BEAT * 0.4, ease: 'power2.out' },
        i * BEAT * 2 + 0.08,
      )
        .to(svg, { [v('haare-r')]: 3, duration: BEAT * 0.6, ease: 'sine.inOut' })
        .to(svg, { [v('haare-r')]: 0, duration: BEAT * 0.9 - 0.08, ease: 'sine.inOut' });
    }

    // Anschlag in Achteln
    tl.fromTo(
      svg,
      { [v('arm-schlag-r')]: -5 },
      { [v('arm-schlag-r')]: 5, duration: BEAT / 2, ease: 'sine.inOut', repeat: 15, yoyo: true },
      0,
    );

    // Gitarre wippt über zwei Takte
    tl.to(
      svg,
      { [v('gitarre-r')]: -1.5, duration: BEAT * 2, ease: 'sine.inOut', repeat: 1, yoyo: true },
      0,
    );
    tl.to(
      svg,
      { [v('gitarre-r')]: 1, duration: BEAT * 2, ease: 'sine.inOut', repeat: 1, yoyo: true },
      BEAT * 4,
    );

    holder.addEventListener('pointerenter', () => tl.timeScale(1.5));
    holder.addEventListener('pointerleave', () => tl.timeScale(1));
    stopObserving = onVisibilityChange(holder, (visible) => (visible ? tl.play() : tl.pause()));
  });

  return () => {
    disposed = true;
    stopObserving();
    tl?.kill();
    rig?.destroy();
  };
}
