// Legt ein neues Artefakt aus artifacts/_template an:  npm run new -- mein-artefakt "Mein Titel"
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ARTIFACTS_DIR, ID_PATTERN } from './artifacts.mjs';

const [id, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(' ') || id;

if (!id || !ID_PATTERN.test(id)) {
  console.error(
    'Aufruf: npm run new -- <id> ["Titel"]   (id: Kleinbuchstaben, Ziffern, Bindestriche)',
  );
  process.exit(1);
}
const target = resolve(ARTIFACTS_DIR, id);
if (existsSync(target)) {
  console.error(`artifacts/${id} existiert bereits.`);
  process.exit(1);
}

cpSync(resolve(ARTIFACTS_DIR, '_template'), target, { recursive: true });
for (const file of readdirSync(target)) {
  const path = resolve(target, file);
  const text = readFileSync(path, 'utf8');
  writeFileSync(path, text.replaceAll('__ID__', id).replaceAll('__TITLE__', title));
}
console.log(`Angelegt: artifacts/${id}/  →  npm run dev, dann /artifacts/${id}/ öffnen`);
