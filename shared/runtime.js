/**
 * Laufzeit für alle Artefakte.
 *
 * Ein Artefakt exportiert in main.js eine Funktion `mount(root, ctx)`:
 *   - `root` ist das Container-Element (in einer Seite: #app, eingebettet: ein <div> im Shadow Root)
 *   - `ctx` = { id, mode: 'page' | 'element', host }
 *   - Rückgabewert (optional): Aufräumfunktion, die Listener, Animationen und WebGL freigibt.
 *
 * Diese Datei verbindet `mount` mit den zwei Auslieferungswegen.
 */

const hoistedRules = new Set();

/**
 * @property- und @font-face-Regeln wirken innerhalb eines Shadow Root nicht.
 * Tailwind v4 nutzt @property z. B. für Transforms und Schatten, deshalb
 * werden diese Regeln einmalig in das <head> der WordPress-Seite gehoben.
 */
function hoistGlobalRules(css) {
  const rules = css.match(/@(?:property|font-face)[^{]*\{[^}]*\}/g) ?? [];
  const fresh = rules.filter((rule) => !hoistedRules.has(rule));
  if (!fresh.length) return;
  fresh.forEach((rule) => hoistedRules.add(rule));
  const style = document.createElement('style');
  style.dataset.jdArtifacts = 'global';
  style.textContent = fresh.join('\n');
  document.head.append(style);
}

/**
 * Registriert das Artefakt als Custom Element <jd-{id}> mit Shadow DOM.
 * Styles des WordPress-Themes und des Artefakts beeinflussen sich so nicht gegenseitig.
 */
export function defineEmbed(id, mount, css) {
  const tag = `jd-${id}`;
  if (customElements.get(tag)) return;

  customElements.define(
    tag,
    class extends HTMLElement {
      connectedCallback() {
        if (this._cleanup !== undefined) return;
        const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
        hoistGlobalRules(css);
        const style = document.createElement('style');
        style.textContent = `:host{display:block}\n${css}`;
        const root = document.createElement('div');
        root.className = 'jd-root';
        shadow.replaceChildren(style, root);
        this._cleanup = mount(root, { id, mode: 'element', host: this }) ?? null;
      }

      disconnectedCallback() {
        this._cleanup?.();
        this._cleanup = undefined;
        this.shadowRoot?.replaceChildren();
      }
    },
  );
}

/**
 * Startet ein Artefakt als eigenständige Seite (Dev-Server, GitHub Pages, iframe-Modus).
 * Läuft die Seite in einem iframe, meldet sie ihre Höhe an die Elternseite,
 * damit das WordPress-Plugin den iframe automatisch anpassen kann.
 */
export function runPage(mount, id) {
  const root = document.getElementById('app');
  root.classList.add('jd-root');
  const cleanup = mount(root, { id, mode: 'page', host: root });

  if (window.parent !== window) {
    const report = () =>
      window.parent.postMessage(
        // Höhe des Inhalts, nicht scrollHeight (die ist nie kleiner als der iframe selbst)
        {
          type: 'jd-artifact:resize',
          id,
          height: Math.ceil(document.body.getBoundingClientRect().height),
        },
        '*',
      );
    new ResizeObserver(report).observe(document.body);
    report();
  }

  if (import.meta.hot) import.meta.hot.dispose(() => cleanup?.());
}
