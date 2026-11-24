// Gemeinsame Hilfen für Build-Skripte: findet alle Artefakte (Ordner mit "_" am Anfang sind ausgenommen).
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ARTIFACTS_DIR = resolve(ROOT, 'artifacts');
export const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

export function listArtifacts() {
  return readdirSync(ARTIFACTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .filter((id) => existsSync(resolve(ARTIFACTS_DIR, id, 'index.html')))
    .sort();
}
