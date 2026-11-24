import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../../shared/motion.js';

gsap.registerPlugin(ScrollTrigger);

// Platzhaltertexte – durch echte Inhalte ersetzen
const cards = [
  ['Ankommen', 'Kurzer Beschreibungstext für die erste Karte.'],
  ['Zuhören', 'Kurzer Beschreibungstext für die zweite Karte.'],
  ['Mitmachen', 'Kurzer Beschreibungstext für die dritte Karte.'],
];

export default function mount(root) {
  root.innerHTML = `
    <section class="bg-primary px-6 py-24 font-sans text-white md:px-12">
      <div class="mx-auto max-w-4xl">
        <p class="eyebrow mb-3 text-sm tracking-widest text-secondary">Jeff Dich Festival</p>
        <h2 class="headline text-4xl leading-tight md:text-6xl">Vom Material zur Form</h2>
        <div class="progress mt-8 h-0.5 origin-left bg-secondary"></div>
        <ul class="mt-12 grid gap-6 md:grid-cols-3">
          ${cards
            .map(
              ([title, text]) => `
            <li class="card rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
              <h3 class="mb-2 text-lg text-secondary">${title}</h3>
              <p class="text-white/75">${text}</p>
            </li>`,
            )
            .join('')}
        </ul>
      </div>
    </section>
  `;

  const mm = gsap.matchMedia(root);

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const section = root.querySelector('section');

    gsap
      .timeline({ scrollTrigger: { trigger: section, start: 'top 75%' } })
      .from('.eyebrow', { y: 12, autoAlpha: 0, duration: 0.5, ease: 'power2.out' })
      .from('.headline', { y: 32, autoAlpha: 0, duration: 0.9, ease: 'power3.out' }, '<0.1')
      .from(
        '.card',
        { y: 40, autoAlpha: 0, stagger: 0.12, duration: 0.7, ease: 'power3.out' },
        '<0.3',
      );

    gsap.fromTo(
      '.progress',
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top 60%', end: 'bottom 40%', scrub: 0.6 },
      },
    );
  });

  // Fallback ohne Bewegung: Linie sofort voll sichtbar
  if (prefersReducedMotion()) gsap.set(root.querySelector('.progress'), { scaleX: 1 });

  return () => mm.revert();
}
