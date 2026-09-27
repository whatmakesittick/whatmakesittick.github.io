import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readPageDates } from './dates.ts';

const BUILD_DATE = new Date('2026-09-27T12:00:00.000Z');
const COMMIT_CONFIG = [
  '-c',
  'user.name=Test',
  '-c',
  'user.email=test@example.com',
  '-c',
  'commit.gpgsign=false',
];

let root = '';

function commit(file: string, date: string): void {
  writeFileSync(join(root, file), date);
  const env = { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, env, stdio: 'ignore' });
  git('add', '.');
  git(...COMMIT_CONFIG, 'commit', '--quiet', '-m', file);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'page-dates-'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('readPageDates', () => {
  it('reads the first and the last commit that touched the folder', () => {
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    mkdirSync(join(root, 'glider'));
    commit('glider/a.txt', '2026-01-10T09:00:00+02:00');
    commit('other.txt', '2026-02-10T09:00:00+02:00');
    commit('glider/b.txt', '2026-03-10T09:00:00+02:00');
    commit('other.txt', '2026-04-10T09:00:00+02:00');
    expect(readPageDates(join(root, 'glider'), BUILD_DATE)).toEqual({
      published: '2026-01-10T09:00:00+02:00',
      modified: '2026-03-10T09:00:00+02:00',
    });
  });

  it('falls back to the build date without git history', () => {
    expect(readPageDates(root, BUILD_DATE)).toEqual({
      published: BUILD_DATE.toISOString(),
      modified: BUILD_DATE.toISOString(),
    });
  });
});
