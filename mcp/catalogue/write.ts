import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATHS } from '../shared/config.ts';
import { buildCatalogue } from '../../vite/catalogue.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const catalogue = buildCatalogue(root);
const file = resolve(root, PATHS.catalogue);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, `${JSON.stringify(catalogue)}\n`);
const counts = catalogue.explainers.map((e) => `${e.slug}:${e.chapters.length}`).join(' ');
console.log(`${PATHS.catalogue}: ${catalogue.explainers.length} explainers (${counts})`);
