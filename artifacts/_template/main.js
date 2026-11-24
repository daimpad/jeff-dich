import gsap from 'gsap';
import { prefersReducedMotion } from '../../shared/motion.js';

/**
 * @param {HTMLElement} root Container des Artefakts (nie `document` direkt abfragen)
 * @param {{ id: string, mode: 'page' | 'element', host: HTMLElement }} _ctx
 * @returns {() => void} Aufräumfunktion
 */
export default function mount(root, _ctx) {
  root.innerHTML = `
    <section class="grid min-h-80 place-items-center bg-primary p-10 font-sans text-white">
      <h2 class="headline text-4xl text-secondary">__TITLE__</h2>
    </section>
  `;

  const ctx = gsap.context(() => {
    if (prefersReducedMotion()) return;
    gsap.from('.headline', { y: 24, autoAlpha: 0, duration: 0.9, ease: 'power3.out' });
  }, root);

  return () => ctx.revert();
}
