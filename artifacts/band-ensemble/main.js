import { mountBand } from '../../shared/band.js';
import { onVisibilityChange } from '../../shared/motion.js';

export default function mount(root) {
  root.innerHTML = `
    <section class="bg-primary px-4 py-10 font-sans text-white">
      <div class="band mx-auto max-w-6xl"></div>
      <p class="mt-6 text-center text-sm text-white/70">Rig-Test · alle vier im selben Takt · Hover beschleunigt</p>
    </section>
  `;
  const section = root.querySelector('section');
  let band;
  let disposed = false;
  let visible = false;
  let stopObserving = () => {};

  mountBand(root.querySelector('.band')).then((b) => {
    band = b;
    if (disposed) return band.destroy();
    if (visible) band.play();
  });
  section.addEventListener('pointerenter', () => band?.master.timeScale(1.4));
  section.addEventListener('pointerleave', () => band?.master.timeScale(1));
  stopObserving = onVisibilityChange(section, (v) => {
    visible = v;
    if (band) v ? band.play() : band.pause();
  });

  return () => {
    disposed = true;
    stopObserving();
    band?.destroy();
  };
}
