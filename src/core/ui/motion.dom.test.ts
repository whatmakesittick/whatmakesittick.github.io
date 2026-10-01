import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Preset, Timeline } from '../explainer';
import { createExplainerStore } from '../store';
import { respectReducedMotion } from './motion';

const timeline: Timeline = {
  cycle: 100,
  step: 1,
  nudge: { fine: 1, coarse: 10 },
  labelKey: 'test.phase',
  phasesLabelKey: 'test.phases',
  formatPhase: String,
  describePhase: String,
  rate: (speed) => speed,
  phases: [{ id: 'only', start: 0, end: 100, labelKey: 'a', jumpLabelKey: 'a', tone: 'red' }],
  speed: { min: 1, max: 20, step: 1, labelKey: 's', format: String, describe: String },
};

const presets: Record<string, Preset> = {
  intro: { startAt: 0 },
  hold: { pauseAt: 25 },
  seek: { startAt: 60 },
};

function createStore() {
  return createExplainerStore<object, Preset>({
    timeline,
    presets,
    defaults: { preset: 'intro', speed: 1, view: {} },
    extend: () => ({}),
  });
}

function prefersReducedMotion(reduced: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduced, media: query }));
}

describe('reduced motion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts paused and no chapter starts playback', () => {
    prefersReducedMotion(true);
    const store = createStore();
    respectReducedMotion(store);
    ['intro', 'hold', 'seek', 'intro'].forEach((id) => {
      store.getState().applyPreset(id);
      expect(store.getState().playing, id).toBe(false);
    });
  });

  it('leaves playback alone without the preference', () => {
    prefersReducedMotion(false);
    const store = createStore();
    respectReducedMotion(store);
    store.getState().applyPreset('hold');
    store.getState().applyPreset('seek');
    expect(store.getState().playing).toBe(true);
  });
});
