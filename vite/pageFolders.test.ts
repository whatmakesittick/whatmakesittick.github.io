import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IGNORE_FILE, MARKER_FILE, prunePageFolders, writePageFolder } from './pageFolders.ts';

const files = { 'index.html': '<html></html>', 'main.ts': 'export {};\n' };

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'page-folders-'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function createFolder(name: string, entries: Record<string, string>): string {
  const directory = join(root, name);
  mkdirSync(directory);
  for (const [file, content] of Object.entries(entries))
    writeFileSync(join(directory, file), content);
  return directory;
}

describe('writePageFolder', () => {
  it('writes the page files next to an ignore file and a marker', () => {
    writePageFolder(root, 'engine', files);
    expect(readFileSync(join(root, 'engine', 'main.ts'), 'utf8')).toBe(files['main.ts']);
    expect(readFileSync(join(root, 'engine', IGNORE_FILE), 'utf8')).toBe('*\n');
    expect(existsSync(join(root, 'engine', MARKER_FILE))).toBe(true);
  });

  it('marks an unmarked folder that holds only generated files', () => {
    createFolder('engine', { [IGNORE_FILE]: '*\n', 'index.html': 'old' });
    writePageFolder(root, 'engine', files);
    expect(existsSync(join(root, 'engine', MARKER_FILE))).toBe(true);
  });

  it('refuses a folder it did not create', () => {
    const directory = createFolder('docs', { 'guide.md': '# Guide' });
    expect(() => writePageFolder(root, 'docs', files)).toThrow('Cannot generate docs/');
    expect(existsSync(join(directory, MARKER_FILE))).toBe(false);
  });
});

describe('prunePageFolders', () => {
  it('removes generated folders whose explainer is gone', () => {
    writePageFolder(root, 'engine', files);
    writePageFolder(root, 'gearbox', files);
    prunePageFolders(root, ['engine']);
    expect(existsSync(join(root, 'engine'))).toBe(true);
    expect(existsSync(join(root, 'gearbox'))).toBe(false);
  });

  it('keeps folders without a marker', () => {
    createFolder('src', { 'index.html': '<html></html>', 'main.ts': '' });
    prunePageFolders(root, []);
    expect(existsSync(join(root, 'src', 'main.ts'))).toBe(true);
  });
});
