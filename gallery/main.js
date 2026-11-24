import '../shared/fonts/page.css';
import './style.css';

const metas = import.meta.glob(['../artifacts/*/artifact.json', '!../artifacts/_*/**'], {
  eager: true,
  import: 'default',
});

const list = document.getElementById('list');
const isDev = import.meta.env.DEV;
const manifest = isDev ? {} : await fetch('./manifest.json').then((r) => (r.ok ? r.json() : {}));

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

for (const [path, meta] of Object.entries(metas)) {
  const id = path.split('/').at(-2);
  const size = manifest[id]?.snippetBytes;
  const li = document.createElement('li');
  li.className = 'flex flex-col gap-3 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10';
  li.innerHTML = `
    <a href="./artifacts/${id}/" class="group">
      <h2 class="text-lg font-semibold group-hover:text-secondary">${meta.title}</h2>
      <p class="text-sm text-white/75">${meta.description ?? ''}</p>
    </a>
    <p class="font-mono text-xs text-white/50">${id}${size ? ` · Snippet ${kb(size)}` : ''} · ${(meta.libs ?? []).join(', ')}</p>
    ${
      isDev
        ? ''
        : `<div class="flex flex-wrap gap-2 text-sm">
            <button data-copy="shortcode" class="rounded-full bg-secondary px-3 py-1 text-primary">Shortcode kopieren</button>
            <button data-copy="snippet" class="rounded-full bg-accent px-3 py-1 text-white">HTML-Snippet kopieren</button>
            <a href="./standalone/${id}.html" class="rounded-full px-3 py-1 ring-1 ring-white/30">Standalone</a>
          </div>`
    }
  `;
  li.addEventListener('click', async (e) => {
    const kind = e.target.dataset?.copy;
    if (!kind) return;
    const text =
      kind === 'shortcode'
        ? `[jd_artifact id="${id}"]`
        : await fetch(`./snippets/${id}.html`).then((r) => r.text());
    await navigator.clipboard.writeText(text);
    const label = e.target.textContent;
    e.target.textContent = 'Kopiert';
    setTimeout(() => (e.target.textContent = label), 1500);
  });
  list.append(li);
}
