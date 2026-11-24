# jeff-dich · Design-Artefakte

Animationen und interaktive HTML/JS-Elemente für die WordPress-Seite (Divi 5) des Jeff Dich Festivals.
Gestaltung nach der CI auf [jeff-dich.de/design](https://jeff-dich.de/design/); die Tokens stehen in
[`shared/theme.css`](shared/theme.css).

**Galerie:** https://daimpad.github.io/jeff-dich/ (nach dem ersten Deploy)

## Arbeiten

```bash
npm install
npm run dev                          # Galerie mit Live-Reload
npm run new -- mein-artefakt "Titel" # neues Artefakt aus der Vorlage
npm run build                        # alles nach dist/
npm run check                        # Lint, Formatierung, Build
```

Ein Artefakt ist ein Ordner `artifacts/<id>/` mit `main.js` (exportiert `mount(root)`), `style.css`
(Tailwind) und `artifact.json`. Enthalten: GSAP + ScrollTrigger, Three.js, Lottie, Tailwind CSS 4,
Alata und Blaka (selbst gehostet). Logos, Band-Figuren und Vulkan liegen in
[`shared/brand`](shared/brand/README.md).

## Einbinden in Divi 5

| Weg              | Wie                                                                                                                                                                                      | Geeignet für                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Shortcode**    | Plugin [`jd-artifacts.zip`](https://github.com/daimpad/jeff-dich/releases/latest/download/jd-artifacts.zip) (Release) installieren, dann im Text- oder Code-Modul `[jd_artifact id="…"]` | Standard; auch große Artefakte (Three.js)        |
| **HTML-Snippet** | In der Galerie „HTML-Snippet kopieren“, in ein Divi-**Code-Modul** einfügen                                                                                                              | ohne Plugin, kleine Artefakte (< 150 KB)         |
| **iframe**       | `[jd_artifact id="…" mode="iframe"]`                                                                                                                                                     | vollständige Isolation; keine Scroll-Animationen |
| **Standalone**   | `dist/standalone/<id>.html`                                                                                                                                                              | ganze Seite, z. B. leere Seitenvorlage           |

Beispiel Hero: Divi-Abschnitt in voller Breite (Innenabstände 0), eine Zeile mit 100 % Breite und ohne
Spaltenabstand, darin ein Code-Modul mit `[jd_artifact id="hero-band" height="480"]`.

Neue Plugin-Version: `Version:` im Kopf von `wordpress/jd-artifacts/jd-artifacts.php` erhöhen – nach dem
Merge erstellt der Workflow `release-plugin.yml` das Release.

Shortcode und Snippet erzeugen ein Element `<jd-<id>>` mit Shadow DOM: Divi-Styles und Artefakt
beeinflussen sich nicht. Nach einem Deploy unter _Einstellungen → JD Artifacts_ die Cache-Version
erhöhen.

## Einmalige Einstellungen auf GitHub

- _Settings → Pages → Source:_ **GitHub Actions**
- _Settings → Branches:_ Schutzregel für `main` (Pull Request + Status-Check „CI“)
