import { execFileSync } from 'node:child_process';

export interface PageDates {
  published: string;
  modified: string;
}

const GIT = 'git';
const COMMIT_DATES = ['log', '--format=%cI', '--', '.'];
const SHALLOW_CHECK = ['rev-parse', '--is-shallow-repository'];
const SHALLOW = 'true';

function git(directory: string, args: readonly string[]): string | undefined {
  try {
    return execFileSync(GIT, args, {
      cwd: directory,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

function isShallow(directory: string): boolean {
  return git(directory, SHALLOW_CHECK) === SHALLOW;
}

function commitDates(directory: string): string[] {
  if (isShallow(directory)) return [];
  return (git(directory, COMMIT_DATES) ?? '').split('\n').filter(Boolean);
}

export function readPageDates(directory: string, buildDate = new Date()): PageDates {
  const dates = commitDates(directory);
  const fallback = buildDate.toISOString();
  return { published: dates.at(-1) ?? fallback, modified: dates.at(0) ?? fallback };
}
