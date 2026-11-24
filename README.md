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
Alata und Blaka (selbst gehostet).

## Einbinden in Divi 5

| Weg              | Wie                                                                                                            | Geeignet für                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Shortcode**    | Plugin `jd-artifacts.zip` (aus der Galerie) installieren, dann im Text- oder Code-Modul `[jd_artifact id="…"]` | Standard; auch große Artefakte (Three.js)        |
| **HTML-Snippet** | In der Galerie „HTML-Snippet kopieren“, in ein Divi-**Code-Modul** einfügen                                    | ohne Plugin, kleine Artefakte (< 150 KB)         |
| **iframe**       | `[jd_artifact id="…" mode="iframe"]`                                                                           | vollständige Isolation; keine Scroll-Animationen |
| **Standalone**   | `dist/standalone/<id>.html`                                                                                    | ganze Seite, z. B. leere Seitenvorlage           |

Shortcode und Snippet erzeugen ein Element `<jd-<id>>` mit Shadow DOM: Divi-Styles und Artefakt
beeinflussen sich nicht. Nach einem Deploy unter _Einstellungen → JD Artifacts_ die Cache-Version
erhöhen.

## Einmalige Einstellungen auf GitHub

- _Settings → Pages → Source:_ **GitHub Actions**
- _Settings → Branches:_ Schutzregel für `main` (Pull Request + Status-Check „CI“)
