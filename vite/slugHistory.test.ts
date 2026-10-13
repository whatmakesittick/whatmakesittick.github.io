import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkSlugHistory, readRemovedSlugs, slugsAt } from './slugHistory.ts';
import type { Git } from './slugHistory.ts';

const BASE = 'abc123';
const LISTING = [
  'explainers/engine/chapters.html',
  'explainers/engine/explainer.json',
  'explainers/engine/locales/en.json',
  'explainers/glider/explainer.json',
  'explainers/heart/explainer.json',
  'explainers/heart/src/index.ts',
  'explainers/notes.md',
  'explainers/draft/src/index.ts',
].join('\n');

function fakeGit(answers: Record<string, string | undefined>): Git {
  return (args) => answers[args.join(' ')];
}

const withMain = fakeGit({
  'rev-parse --verify --quiet origin/main^{commit}': 'f00d',
  'merge-base HEAD origin/main': BASE,
  [`ls-tree -r --name-only ${BASE} -- explainers`]: LISTING,
});

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('slugsAt', () => {
  it('lists the folders that hold an explainer.json', () => {
    expect(slugsAt(withMain, BASE)).toEqual(['engine', 'glider', 'heart']);
  });

  it('gives nothing when git cannot list the commit', () => {
    expect(slugsAt(fakeGit({}), BASE)).toBeUndefined();
  });
});

describe('checkSlugHistory', () => {
  it('accepts a tree that keeps every slug of main', () => {
    const current = [{ slug: 'engine' }, { slug: 'glider' }, { slug: 'heart' }, { slug: 'new' }];
    expect(checkSlugHistory(withMain, current, [])).toEqual({ problems: [] });
  });

  it('accepts a rename listed in formerSlugs and a removal listed on its own', () => {
    const current = [{ slug: 'motor', formerSlugs: ['engine'] }, { slug: 'heart' }];
    expect(checkSlugHistory(withMain, current, ['glider'])).toEqual({ problems: [] });
  });

  it('tells what to add for a slug that went missing', () => {
    const current = [{ slug: 'motor' }, { slug: 'glider' }, { slug: 'heart' }];
    const { problems } = checkSlugHistory(withMain, current, []);
    expect(problems).toEqual([
      'explainers/engine/ is on origin/main but not here. If you renamed it, add "formerSlugs": ["engine"] to the new explainer.json. If you removed it, add "engine" to vite/removedSlugs.json.',
    ]);
  });

  it('skips with a note without origin/main', () => {
    const result = checkSlugHistory(fakeGit({}), [], []);
    expect(result.problems).toEqual([]);
    expect(result.note).toContain('no origin/main');
  });

  it('skips with a note when the history is too shallow to find the fork point', () => {
    const shallow = fakeGit({ 'rev-parse --verify --quiet origin/main^{commit}': 'f00d' });
    const result = checkSlugHistory(shallow, [], []);
    expect(result.problems).toEqual([]);
    expect(result.note).toContain('no history shared with origin/main');
  });
});

describe('readRemovedSlugs', () => {
  function rootWith(content?: string): string {
    const root = mkdtempSync(join(tmpdir(), 'removed-'));
    roots.push(root);
    mkdirSync(join(root, 'vite'));
    if (content !== undefined) writeFileSync(join(root, 'vite', 'removedSlugs.json'), content);
    return root;
  }

  it('reads the list and treats a missing file as empty', () => {
    expect(readRemovedSlugs(rootWith('["glider"]'))).toEqual(['glider']);
    expect(readRemovedSlugs(rootWith())).toEqual([]);
  });

  it('rejects anything but a list of slugs', () => {
    expect(() => readRemovedSlugs(rootWith('{"glider": true}'))).toThrow('must be a list');
  });
});
