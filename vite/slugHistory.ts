import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExplainerManifest } from '../src/core/manifest.ts';
import { EXPLAINERS_DIRECTORY, MANIFEST_FILE } from './manifestSchema.ts';

export const REMOVED_SLUGS_FILE = join('vite', 'removedSlugs.json');
export const MAIN_REF = 'origin/main';

export type Git = (args: readonly string[]) => string | undefined;

export interface SlugHistory {
  problems: string[];
  note?: string;
}

const MANIFEST_PATH = new RegExp(
  `^${EXPLAINERS_DIRECTORY}/([^/]+)/${MANIFEST_FILE.replace('.', '\\.')}$`,
);

export function gitIn(root: string): Git {
  return (args) => {
    try {
      return execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 64 * 1024 * 1024,
      }).trim();
    } catch {
      return undefined;
    }
  };
}

export function readRemovedSlugs(root: string): string[] {
  const file = join(root, REMOVED_SLUGS_FILE);
  if (!existsSync(file)) return [];
  const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(value) || !value.every((slug) => typeof slug === 'string'))
    throw new Error(`${REMOVED_SLUGS_FILE} must be a list of slugs`);
  return value;
}

export function slugsAt(git: Git, commit: string): string[] | undefined {
  const files = git(['ls-tree', '-r', '--name-only', commit, '--', EXPLAINERS_DIRECTORY]);
  if (files === undefined) return undefined;
  return files
    .split('\n')
    .map((file) => MANIFEST_PATH.exec(file)?.[1])
    .filter((slug): slug is string => slug !== undefined)
    .sort();
}

export function checkSlugHistory(
  git: Git,
  manifests: readonly Pick<ExplainerManifest, 'slug' | 'formerSlugs'>[],
  removed: readonly string[],
): SlugHistory {
  if (git(['rev-parse', '--verify', '--quiet', `${MAIN_REF}^{commit}`]) === undefined)
    return { problems: [], note: `no ${MAIN_REF} here, so renamed slugs were not checked` };
  const base = git(['merge-base', 'HEAD', MAIN_REF]);
  const before = base === undefined ? undefined : slugsAt(git, base);
  if (before === undefined)
    return {
      problems: [],
      note: `no history shared with ${MAIN_REF}, so renamed slugs were not checked`,
    };
  const kept = new Set([
    ...manifests.flatMap(({ slug, formerSlugs = [] }) => [slug, ...formerSlugs]),
    ...removed,
  ]);
  const problems = before
    .filter((slug) => !kept.has(slug))
    .map(
      (slug) =>
        `${EXPLAINERS_DIRECTORY}/${slug}/ is on ${MAIN_REF} but not here. If you renamed it, add "formerSlugs": ["${slug}"] to the new ${MANIFEST_FILE}. If you removed it, add "${slug}" to ${REMOVED_SLUGS_FILE}.`,
    );
  return { problems };
}
