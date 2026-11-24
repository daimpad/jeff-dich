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
ordnet jede Fläche anhand von `<figur>.rig.json` (Region, Mittelpunkt, Farbklasse) einem Teil zu und schreibt
das Ergebnis in die SVG. In Ruhe sieht die Figur identisch aus.

- `data-part="…"` an jedem Pfad; die Zeichenreihenfolge bleibt unverändert.
- Große Flächen über mehrere Teile erhalten je Teil eine zugeschnittene `<use>`-Kopie. Die Silhouette bleibt
  zusätzlich stehen und wirkt bei Bewegung als Schatten (auf dem dunkelgrünen CI-Grund kaum sichtbar).
- Ein Ebenen-Plan (`data-layer`, `<metadata data-rig>`) für die performante Darstellung.
- Ein `<style data-rig>` mit Transformationen aus CSS-Variablen, mit Drehpunkt und Hierarchie
  (z. B. Haare folgen dem Kopf, Arme dem Oberkörper):

| Variable                   | Wirkung                           |
| -------------------------- | --------------------------------- |
| `--<teil>-r`               | Drehung in Grad um den Drehpunkt  |
| `--<teil>-x`, `--<teil>-y` | Verschiebung in viewBox-Einheiten |
| `--<teil>-s`               | Skalierung (Ruhewert 1)           |

### Darstellen

```js
import { mountRig } from '../../shared/rig.js';

const rig = await mountRig(holder, 'band/drums.svg'); // lädt von GitHub Pages
gsap.to(rig.el, { '--arm-links-r': -14, duration: 0.2 });
```

`mountRig` zerlegt die Figur beim Laden in wenige Bildebenen (je auf ihren Inhalt zugeschnitten und auf
Geräte-Pixel ausgerichtet). Bewegungen sind dann reine GPU-Transformationen: vier Figuren gleichzeitig laufen
flüssig (gemessen ohne GPU: ~58 statt ~4 Bilder/s gegenüber Inline-SVG). Inline-SVG (`loadSvg`) funktioniert mit
denselben Variablen weiterhin, ist aber nur für eine einzelne, ruhige Figur geeignet.

### Figuren und empfohlene Ausschläge

| Figur     | Teile (Root: `koerper`)                                                                                                       | Empfohlen                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `gitarre` | `kopf`, `haare` (folgt Kopf), `arm-schlag`, `gitarre` (inkl. Griffhand)                                                       | Kopf ±10°, Haare ±6°, Arm ±6°, Gitarre ±2°                    |
| `bass`    | `kopf`, `haare` (folgt Kopf), `arm-zupf`, `bass` (inkl. Griffhand)                                                            | Kopf ±8°, Haare ±6°, Arm ±6°, Bass ±2°                        |
| `drums`   | `oberkoerper` → `kopf` → `haare`, `arm-links`, `arm-rechts`; `becken-links/-mitte/-klein/-rechts`, `hihat`, `tom`, `bassdrum` | Kopf ±5°, Haare ±2°, Arme ±14°, Becken ±4°, Trommeln s 1–1,03 |
| `voice`   | `kopf`, `haare` (folgt Kopf), `arm-mikro` (Arm, Mikrofon, Kabel), `arm-schlag`, `gitarre`                                     | Kopf ±8°, Haare ±4°, Mikro-Arm ±8°, Arm ±6°, Gitarre ±2°      |

Körper bzw. Oberkörper federn mit `-y` um 4–12 Einheiten. Größere Werte machen Schnittkanten sichtbar,
weil unter den Teilen nichts gezeichnet ist. Beispiele: `artifacts/band-gitarre`, `artifacts/band-ensemble`.

### Regionen anpassen

Regionen in `<figur>.rig.json` ändern, dann `npm run rig -- <figur>` (nie die SVG von Hand bearbeiten).
Farbklassen: `dunkel`, `grau`, `rot`, `orange`, `gelb`, `gruen`, `blau`, `lila`, `pink`.

## Neue Dateien

Original hier ablegen, dann **nur diese Datei** optimieren (erneutes Optimieren würde die IDs doppelt präfixen):

```bash
npm run svg -- shared/brand/band/neu.svg
```
