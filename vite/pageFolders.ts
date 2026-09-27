import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { Dirent } from 'node:fs';
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

function isGeneratedEntry(directory: string, entry: Dirent, names: readonly string[]): boolean {
  return (
    names.includes(entry.name) || (entry.isDirectory() && isMarked(join(directory, entry.name)))
  );
}

function holdsOnlyGenerated(directory: string, names: readonly string[]): boolean {
  return readdirSync(directory, { withFileTypes: true }).every((entry) =>
    isGeneratedEntry(directory, entry, names),
  );
}

function assertGenerated(directory: string, path: string, files: PageFiles): void {
  if (!existsSync(directory) || isMarked(directory)) return;
  if (holdsOnlyGenerated(directory, [IGNORE_FILE, ...Object.keys(files)])) return;
  throw new Error(`Cannot generate ${path}/: the folder holds files the generator did not write`);
}

export function writePageFolder(root: string, path: string, files: PageFiles): void {
  const directory = join(root, path);
  assertGenerated(directory, path, files);
  mkdirSync(directory, { recursive: true });
  writeIfChanged(join(directory, IGNORE_FILE), IGNORE_EVERYTHING);
  writeIfChanged(join(directory, MARKER_FILE), '');
  for (const [name, content] of Object.entries(files)) {
    writeIfChanged(join(directory, name), content);
  }
}

function markedFolders(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name))
    .filter(isMarked)
    .flatMap((folder) => [folder, ...markedFolders(folder)]);
}

export function prunePageFolders(root: string, paths: readonly string[]): void {
  const kept = new Set(paths.map((path) => join(root, path)));
  for (const directory of markedFolders(root)) {
    if (!kept.has(directory) && existsSync(directory)) rmSync(directory, { recursive: true });
  }
}
