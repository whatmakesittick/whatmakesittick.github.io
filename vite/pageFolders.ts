import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const IGNORE_FILE = '.gitignore';
export const MARKER_FILE = '.explainer-page';
const IGNORE_EVERYTHING = '*\n';

export type PageFiles = Readonly<Record<string, string>>;

function writeIfChanged(file: string, content: string): void {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return;
  writeFileSync(file, content);
}

function isMarked(directory: string): boolean {
  return existsSync(join(directory, MARKER_FILE));
}

function holdsOnly(directory: string, names: readonly string[]): boolean {
  return readdirSync(directory).every((name) => names.includes(name));
}

function assertGenerated(directory: string, slug: string, files: PageFiles): void {
  if (!existsSync(directory) || isMarked(directory)) return;
  if (holdsOnly(directory, [IGNORE_FILE, ...Object.keys(files)])) return;
  throw new Error(`Cannot generate ${slug}/: the folder holds files the generator did not write`);
}

export function writePageFolder(root: string, slug: string, files: PageFiles): void {
  const directory = join(root, slug);
  assertGenerated(directory, slug, files);
  mkdirSync(directory, { recursive: true });
  writeIfChanged(join(directory, IGNORE_FILE), IGNORE_EVERYTHING);
  writeIfChanged(join(directory, MARKER_FILE), '');
  for (const [name, content] of Object.entries(files)) {
    writeIfChanged(join(directory, name), content);
  }
}

export function prunePageFolders(root: string, slugs: readonly string[]): void {
  const stale = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !slugs.includes(entry.name))
    .map((entry) => join(root, entry.name))
    .filter(isMarked);
  for (const directory of stale) rmSync(directory, { recursive: true });
}
