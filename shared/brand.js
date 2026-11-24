/**
 * URL einer Datei aus shared/brand, z. B. brandUrl('band/bass.svg').
 *
 * Die Datei wird nicht ins Artefakt gebündelt, sondern zur Laufzeit geladen:
 * im Dev-Server lokal, sonst von GitHub Pages (der Build kopiert shared/brand nach dist/brand).
 * So bleiben Snippets klein, auch wenn große Figuren (0,5–1 MB) verwendet werden.
 */
export const PAGES_URL = 'https://daimpad.github.io/jeff-dich';

export const brandUrl = (path) =>
  import.meta.env.DEV ? `/shared/brand/${path}` : `${PAGES_URL}/brand/${path}`;

/** Lädt ein SVG als Markup, um es inline einzusetzen und Teile davon zu animieren. */
export async function loadSvg(path) {
  const res = await fetch(brandUrl(path));
  if (!res.ok) throw new Error(`SVG nicht gefunden: ${path}`);
  return res.text();
}
