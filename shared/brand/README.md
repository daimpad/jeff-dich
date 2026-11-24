# Marke: Logos, Band-Figuren, Szenen

Quelle: [jeff-dich.de/design](https://jeff-dich.de/design/) (Original-Vektoren aus den ZIP-Downloads).
Mit `svgo.config.js` verlustfrei optimiert: Illustrator-Klassen sind in Attribute umgewandelt,
IDs tragen den Dateinamen als Präfix (z. B. `vulkan_svg__Ebene_6`). Gruppen und Pfade sind erhalten.

| Datei                                                                   | Inhalt                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `logos/wortmarke-weiss.svg`, `logos/wortmarke-gruen.svg`                | Wortmarke „Jeff Dich Festival“ (weiß für dunkle, grün für helle Flächen) |
| `logos/monogramm-weiss.svg`, `logos/monogramm-gruen.svg`                | Monogramm „JD“                                                           |
| `band/bass.svg`, `band/drums.svg`, `band/gitarre.svg`, `band/voice.svg` | Band-Figuren, je eine Ebene (~0,5–1 MB)                                  |
| `szenen/vulkan.svg`, `szenen/vulkan-landschaft.svg`                     | Vulkan mit Herzen, ohne bzw. mit grüner Landschaft                       |

Nicht übernommen: PNG-Varianten der Logos (die SVGs sind gleichwertig), `Voice.png` (als `band/voice.svg`
vorhanden), `Band_Vulkan_Vektor` (PDF/AI-Druckdaten, je 10,7 MB).

## Verwenden

```js
// 1. Inline, animierbar (Logos – klein):
import logo from '../../shared/brand/logos/wortmarke-weiss.svg?raw';
root.querySelector('.logo').innerHTML = logo;

// 2. Als Bild, mitgebündelt (im Snippet als data-URI – nur für kleine Dateien):
import monogramm from '../../shared/brand/logos/monogramm-weiss.svg?url';

// 3. Zur Laufzeit von GitHub Pages (Figuren und Szenen – hält Snippets klein):
import { brandUrl, loadSvg } from '../../shared/brand.js';
img.src = brandUrl('band/drums.svg');
container.innerHTML = await loadSvg('szenen/vulkan.svg'); // inline, z. B. für GSAP
```

## Animierbare Figuren (Rig)

Die Figuren sind flach nachgezeichnet (eine Silhouette, darüber ~1.000–3.500 Farbflächen). `npm run rig -- <figur>`
ordnet jede Fläche anhand von `<figur>.rig.json` einem Teil zu und schreibt das Ergebnis in die SVG:

- `data-part="…"` an jedem Pfad; die Zeichenreihenfolge bleibt unverändert, die Figur sieht in Ruhe identisch aus.
- Die Silhouette erhält pro Teil eine zugeschnittene `<use>`-Kopie; bewegt sich ein Teil, wirkt die
  stehen gebliebene Silhouette wie ein Schatten.
- Ein `<style data-rig>` gibt jedem Teil eine Transformation aus CSS-Variablen, mit Drehpunkt und Hierarchie
  (z. B. Haare folgen dem Kopf):

| Variable                   | Wirkung                           |
| -------------------------- | --------------------------------- |
| `--<teil>-r`               | Drehung in Grad um den Drehpunkt  |
| `--<teil>-x`, `--<teil>-y` | Verschiebung in viewBox-Einheiten |
| `--<teil>-s`               | Skalierung                        |

```js
const svg = holder.querySelector('svg');
gsap.to(svg, { '--kopf-r': 9, duration: 0.2, ease: 'power3.in' });
```

| Figur     | Teile (Root: `koerper`)                                                              | Status                                   |
| --------- | ------------------------------------------------------------------------------------ | ---------------------------------------- |
| `gitarre` | `kopf`, `haare` (folgt Kopf), `arm-schlag` (Schlaghand), `gitarre` (inkl. Griffhand) | Pilot, Beispiel `artifacts/band-gitarre` |

Empfohlene Ausschläge: Kopf ±10°, Haare ±6°, Schlagarm ±6°, Gitarre ±2°, Körper ±12 Einheiten.
Größere Werte machen Schnittkanten sichtbar, weil unter den Teilen nichts gezeichnet ist.

## Neue Dateien

Original hier ablegen, dann **nur diese Datei** optimieren (erneutes Optimieren würde die IDs doppelt präfixen):

```bash
npm run svg -- shared/brand/band/neu.svg
```
