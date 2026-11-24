/** Hilfsfunktionen, die in fast jedem Artefakt gebraucht werden. */

/** true, wenn die Person im Betriebssystem reduzierte Bewegung eingestellt hat. */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Ruft `onChange(true|false)` auf, wenn `el` in den sichtbaren Bereich kommt oder ihn verlässt.
 * Nützlich, um Render-Loops (Three.js, Canvas) außerhalb des Viewports anzuhalten.
 * Gibt eine Aufräumfunktion zurück.
 */
export function onVisibilityChange(el, onChange, options = { rootMargin: '100px' }) {
  const io = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting), options);
  io.observe(el);
  return () => io.disconnect();
}
