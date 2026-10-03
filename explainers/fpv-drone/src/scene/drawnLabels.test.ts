import { describe, expect, it, vi } from 'vitest';
import type { PartId } from '../ids';
import { flightAt } from '../model';
import { DEFAULT_VIEW } from '../state';
import { DrawnLabels } from './drawnLabels';
import type { DrawnSource } from './drawnLabels';

const WANTED: ReadonlySet<PartId> = new Set(['controlLink', 'videoLink', 'spinArrows', 'camera']);

function stateAt(seconds: number, view: Partial<DrawnSource['view']> = {}): DrawnSource {
  return { flight: flightAt(seconds), view: { ...DEFAULT_VIEW, ...view } };
}

function shownAt(state: DrawnSource): string[] {
  const setWanted = vi.fn();
  const labels = new DrawnLabels({ setWanted });
  labels.follow(state);
  labels.setWanted(WANTED, WANTED);
  const [, pinned] = setWanted.mock.lastCall as [ReadonlySet<string>, ReadonlySet<string>];
  return [...pinned].sort();
}

describe('labels of drawn parts', () => {
  it('labels the links while they show and the drone is armed', () => {
    expect(shownAt(stateAt(20))).toEqual(['camera', 'controlLink', 'videoLink']);
    expect(shownAt(stateAt(20, { links: false }))).toEqual(['camera']);
    expect(shownAt(stateAt(80))).toEqual(['camera']);
  });

  it('labels the spin arrows only while they show', () => {
    expect(shownAt(stateAt(20, { arrows: true }))).toContain('spinArrows');
    expect(shownAt(stateAt(20, { arrows: false }))).not.toContain('spinArrows');
  });

  it('asks again only when a part appears or disappears', () => {
    const setWanted = vi.fn();
    const labels = new DrawnLabels({ setWanted });
    labels.setWanted(WANTED, WANTED);
    labels.follow(stateAt(20));
    const calls = setWanted.mock.calls.length;
    labels.follow(stateAt(21));
    expect(setWanted).toHaveBeenCalledTimes(calls);
    labels.follow(stateAt(21, { arrows: true }));
    expect(setWanted).toHaveBeenCalledTimes(calls + 1);
  });
});
