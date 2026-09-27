import { describe, expect, it } from 'vitest';
import type { Playback, Preset, Timeline } from './explainer';
import { createExplainerStore } from './store';

const CYCLE = 100;

const timeline: Timeline = {
  cycle: CYCLE,
  step: 1,
  nudge: { fine: 1, coarse: 10 },
  labelKey: 'test.phase',
  phasesLabelKey: 'test.phases',
  formatPhase: (phase) => String(phase),
  describePhase: (phase) => String(phase),
  rate: (speed) => speed * 2,
  phases: [
    { id: 'first', start: 0, end: 50, labelKey: 'a', jumpLabelKey: 'a', tone: 'red' },
    { id: 'second', start: 50, end: 100, labelKey: 'b', jumpLabelKey: 'b', tone: 'blue' },
  ],
  speed: { min: 1, max: 20, step: 1, labelKey: 's', format: String, describe: String },
};

interface TestPreset extends Preset {
  colour?: string;
}

const presets: Record<string, TestPreset> = {
  intro: { view: { grid: true, labels: false }, speed: 5 },
  hold: { pauseAt: 25 },
  paint: { colour: 'green' },
  seek: { startAt: 60 },
  holdPastEnd: { pauseAt: 125 },
  seekBehindStart: { startAt: -10 },
};

interface Extension {
  colour: string;
  paint(colour: string): void;
}

function createTestStore(overrides: Partial<Playback & Extension> = {}) {
  return createExplainerStore<Extension, TestPreset>(
    {
      timeline,
      presets,
      defaults: { preset: 'intro', speed: 10, view: { grid: false, labels: true } },
      extend: (set) => ({ colour: 'white', paint: (colour) => set({ colour }) }),
      presetState: (preset, state) => ({ colour: preset.colour ?? state.colour }),
    },
    overrides,
  );
}

describe('createExplainerStore', () => {
  it('advances the phase at the timeline rate and wraps around the cycle', () => {
    const store = createTestStore({ phase: 90 });
    store.getState().tick(1);
    expect(store.getState().phase).toBe(10);
  });

  it('holds still when paused', () => {
    const store = createTestStore({ playing: false, phase: 40 });
    store.getState().tick(1);
    expect(store.getState().phase).toBe(40);
  });

  it('pauses when stepping or jumping to a phase', () => {
    const store = createTestStore();
    store.getState().step(-5);
    expect(store.getState()).toMatchObject({ phase: 95, playing: false });
    store.getState().play();
    store.getState().jumpToPhase('second');
    expect(store.getState()).toMatchObject({ phase: 50, playing: false });
  });

  it('keeps the speed within the timeline range', () => {
    const store = createTestStore();
    store.getState().setSpeed(100);
    expect(store.getState().speed).toBe(20);
    store.getState().setSpeed(0);
    expect(store.getState().speed).toBe(1);
  });

  it('merges and toggles view flags', () => {
    const store = createTestStore();
    store.getState().setView({ grid: true });
    store.getState().toggleView('labels');
    expect(store.getState().view).toEqual({ grid: true, labels: false });
  });

  it('applies preset playback, view and extension fields together', () => {
    const store = createTestStore();
    store.getState().setView({ extra: true });
    store.getState().applyPreset('paint');
    store.getState().applyPreset('intro');
    expect(store.getState()).toMatchObject({
      preset: 'intro',
      speed: 5,
      colour: 'green',
      view: { grid: true, labels: false, extra: true },
    });
  });

  it('resumes after a preset pause but keeps a pause made by hand', () => {
    const store = createTestStore();
    store.getState().applyPreset('hold');
    expect(store.getState()).toMatchObject({ phase: 25, playing: false, pausedByPreset: true });
    store.getState().applyPreset('intro');
    expect(store.getState().playing).toBe(true);
    store.getState().pause();
    store.getState().applyPreset('paint');
    expect(store.getState().playing).toBe(false);
  });

  it('seeks to a preset start and keeps playing', () => {
    const store = createTestStore({ phase: 10 });
    store.getState().applyPreset('seek');
    expect(store.getState()).toMatchObject({ phase: 60, playing: true, pausedByPreset: false });
  });

  it('seeks to a preset start and keeps a pause made by hand', () => {
    const store = createTestStore();
    store.getState().pause();
    store.getState().applyPreset('seek');
    expect(store.getState()).toMatchObject({ phase: 60, playing: false });
  });

  it('resumes after a preset pause when the next preset only seeks', () => {
    const store = createTestStore();
    store.getState().applyPreset('hold');
    store.getState().applyPreset('seek');
    expect(store.getState()).toMatchObject({ phase: 60, playing: true, pausedByPreset: false });
  });

  it('wraps preset phases into the cycle', () => {
    const store = createTestStore();
    store.getState().applyPreset('holdPastEnd');
    expect(store.getState().phase).toBe(25);
    store.getState().applyPreset('seekBehindStart');
    expect(store.getState().phase).toBe(90);
  });

  it('exposes the extension actions and counts camera resets', () => {
    const store = createTestStore();
    store.getState().paint('black');
    store.getState().resetCamera();
    expect(store.getState()).toMatchObject({ colour: 'black', cameraResetToken: 1 });
  });

  it('rejects unknown presets and phases', () => {
    const store = createTestStore();
    expect(() => store.getState().applyPreset('missing')).toThrow('Unknown preset');
    expect(() => store.getState().jumpToPhase('missing')).toThrow('Unknown phase');
  });
});
