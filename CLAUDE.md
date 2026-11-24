# Hinweise für die Arbeit in diesem Repo

Design-Artefakte (Animationen, interaktive Elemente) für jeff-dich.de (WordPress, Divi 5).
Antworten und Kommentare auf Deutsch.

## Aufbau eines Artefakts

- `artifacts/<id>/` – id: `^[a-z][a-z0-9-]*$`; Ordner mit `_` am Anfang werden nicht gebaut.
- Neu immer per `npm run new -- <id> "Titel"`.
- `main.js` exportiert `default function mount(root, ctx)` und gibt eine Aufräumfunktion zurück.
- `index.html` nur für die Seitenvorschau; Logik gehört in `main.js`.

## Regeln (wegen Shadow DOM und Mehrfacheinbindung)

- DOM nur über `root` abfragen, nie `document.querySelector`; kein globaler Zustand.
- GSAP: `gsap.context(fn, root)` oder `gsap.matchMedia(root)`; Aufräumen mit `.revert()`.
- Styles in `style.css` auf `.jd-root` oder Tailwind-Klassen beziehen, nie auf `html`/`body`.
- `@import 'tailwindcss' source('./')` beibehalten (begrenzt Tailwind auf das Artefakt).
- Keine `vh`-Höhen für die Gesamthöhe (stört die automatische iframe-Höhe).
- `prefers-reduced-motion` respektieren (`shared/motion.js`); Render-Loops außerhalb des Viewports pausieren.
- Three.js mit benannten Imports (`import { Scene } from 'three'`), damit Tree-Shaking greift.
- Lottie über `lottie-web/build/player/lottie_light` (kein eval).
- Keine externen CDNs oder Google Fonts (DSGVO); alles über npm bündeln.
- Große Medien (Video) nicht importieren, sondern aus der WordPress-Mediathek per URL laden.

## CI (Quelle: https://jeff-dich.de/design/, Tokens in shared/theme.css)

- Farben: primary `#002808` Dunkelgrün, secondary `#E9B628` Gold, accent `#8300E9` Lila,
  signal `#E42441` Rot. Nur diese plus Weiß/Schwarz; Abstufungen über Opazität.
  Gute Kontraste: Gold oder Weiß auf Dunkelgrün. Lila und Rot nicht als Text auf Dunkelgrün.
- Schrift: Alata Regular (`font-sans`) für alles; Blaka (`font-display`) nur für die Hauptüberschrift,
  dann `@import '../../shared/fonts/blaka.css'` in `style.css` ergänzen.
- Schreibweise: „Jeff Dich Festival“ – kein Bindestrich, keine durchgehenden Versalien.

## Marke (shared/brand, siehe shared/brand/README.md)

- Logos (Wortmarke, Monogramm; weiß/grün), Band-Figuren (bass, drums, gitarre, voice), Szenen (vulkan).
- Logos per `?raw` inline; große Figuren/Szenen per `brandUrl()`/`loadSvg()` aus `shared/brand.js`
  zur Laufzeit laden statt bündeln.
- Logos nicht verzerren, umfärben nur in CI-Farben.

## Prüfen

`npm run check` (Lint, Prettier, Build). Snippets > 150 KB per Shortcode statt Code-Modul einbinden.
