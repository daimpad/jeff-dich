import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { ARTIFACTS_DIR, ROOT, listArtifacts } from './scripts/artifacts.mjs';

// Seiten-Build: Galerie + jedes Artefakt als eigene Seite unter /artifacts/<id>/
// (dient der Vorschau auf GitHub Pages und dem iframe-Modus des WP-Plugins).
// Die Einbettungs-Builds (Shadow-DOM-Element, Snippet) erzeugt scripts/build-embeds.mjs.
export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  server: { open: true },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(ROOT, 'index.html'),
        ...Object.fromEntries(
          listArtifacts().map((id) => [id, resolve(ARTIFACTS_DIR, id, 'index.html')]),
        ),
      },
    },
  },
});
