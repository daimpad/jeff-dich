// lottie_light: SVG-Renderer ohne Expressions (kein eval), deutlich kleiner als das Vollpaket.
import lottie from 'lottie-web/build/player/lottie_light';
import animationData from './pulse.json';
import { onVisibilityChange, prefersReducedMotion } from '../../shared/motion.js';

export default function mount(root) {
  root.innerHTML = `
    <section class="flex flex-col items-center gap-4 bg-primary p-10 font-sans text-white">
      <div class="player size-48" role="img" aria-label="Pulsierender Kreis"></div>
      <p class="text-sm text-white/70">Animation aus <code>pulse.json</code> · Hover beschleunigt</p>
    </section>
  `;

  const container = root.querySelector('.player');
  const still = prefersReducedMotion();
  const anim = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: true,
    autoplay: false,
    animationData,
  });

  if (still) anim.goToAndStop(15, true);

  const faster = () => anim.setSpeed(2);
  const normal = () => anim.setSpeed(1);
  container.addEventListener('pointerenter', faster);
  container.addEventListener('pointerleave', normal);

  const stopObserving = onVisibilityChange(container, (visible) => {
    if (still) return;
    if (visible) anim.play();
    else anim.pause();
  });

  return () => {
    stopObserving();
    container.removeEventListener('pointerenter', faster);
    container.removeEventListener('pointerleave', normal);
    anim.destroy();
  };
}
