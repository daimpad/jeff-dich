// Einbettungs-Builds pro Artefakt:
//   dist/embed/<id>.js         IIFE, registriert <jd-<id>> (Shadow DOM) – wird vom Shortcode geladen
//   dist/snippets/<id>.html    Element + Inline-Script zum Einfügen in ein Divi-Code-Modul / HTML-Block
//   dist/standalone/<id>.html  vollständiges HTML-Dokument (z. B. für leere Seitenvorlagen)
//   dist/manifest.json         Übersicht mit Größen
//   dist/brand/                Logos und Figuren aus shared/brand (für brandUrl())
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { ARTIFACTS_DIR, ROOT, listArtifacts } from './artifacts.mjs';

const DIST = resolve(ROOT, 'dist');
const CACHE = resolve(ROOT, '.cache/embed');
const WARN_BYTES = 150 * 1024;

for (const dir of ['embed', 'snippets', 'standalone'])
  mkdirSync(resolve(DIST, dir), { recursive: true });
mkdirSync(CACHE, { recursive: true });

const manifest = {};
const builtAt = new Date().toISOString().slice(0, 10);

for (const id of listArtifacts()) {
  const dir = resolve(ARTIFACTS_DIR, id);
  const meta = JSON.parse(readFileSync(resolve(dir, 'artifact.json'), 'utf8'));
  const entry = resolve(CACHE, `${id}.js`);
  writeFileSync(
    entry,
    [
      `import mount from ${JSON.stringify(resolve(dir, 'main.js'))};`,
      `import css from ${JSON.stringify(resolve(dir, 'style.css') + '?inline')};`,
      `import { defineEmbed } from ${JSON.stringify(resolve(ROOT, 'shared/runtime.js'))};`,
      `defineEmbed(${JSON.stringify(id)}, mount, css);`,
    ].join('\n'),
  );

  await build({
    configFile: false,
    root: ROOT,
    logLevel: 'warn',
    plugins: [tailwindcss()],
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      outDir: resolve(DIST, 'embed'),
      emptyOutDir: false,
      copyPublicDir: false,
      lib: {
        entry,
        formats: ['iife'],
        name: `JD_${id.replace(/-/g, '_')}`,
        fileName: () => `${id}.js`,
      },
    },
  });

  const js = readFileSync(resolve(DIST, 'embed', `${id}.js`), 'utf8');
  // "</script" im Code würde das Inline-Script vorzeitig beenden
  const inlineJs = js.replace(/<\/script/gi, '<\\/script');
  const tag = `jd-${id}`;
  const snippet = [
    `<!-- jd-artifact: ${id} · ${meta.title} · daimpad/jeff-dich · ${builtAt} -->`,
    `<${tag} style="display:block"></${tag}>`,
    `<script>${inlineJs}</script>`,
    '',
  ].join('\n');
  writeFileSync(resolve(DIST, 'snippets', `${id}.html`), snippet);
  writeFileSync(
    resolve(DIST, 'standalone', `${id}.html`),
    `<!doctype html>\n<html lang="de">\n<head>\n<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n<title>${meta.title}</title>\n<style>body{margin:0}</style>\n</head>\n<body>\n${snippet}</body>\n</html>\n`,
  );

  const snippetBytes = Buffer.byteLength(snippet);
  manifest[id] = { title: meta.title, embedBytes: Buffer.byteLength(js), snippetBytes };
  const note = snippetBytes > WARN_BYTES ? '  ⚠ groß – besser per Shortcode einbinden' : '';
  console.log(
    `✓ ${id.padEnd(28)} ${String(Math.round(snippetBytes / 1024)).padStart(5)} KB${note}`,
  );
}

writeFileSync(resolve(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));
cpSync(resolve(ROOT, 'shared/brand'), resolve(DIST, 'brand'), { recursive: true });
