import { describe, expect, it } from 'vitest';
import { CYCLE_UNITS, PHASE_RANGES } from '../model';
import { createClockStore, snapToRange } from './store';

const FRAME = 1 / 60;

function run(store: ReturnType<typeof createClockStore>, seconds: number): void {
  const frames = Math.round(seconds / FRAME);
  for (let frame = 0; frame < frames; frame += 1) store.getState().tick(FRAME);
}

describe('clock store', () => {
  it('opens on the pour at the start of the run', () => {
    const state = createClockStore().getState();
    expect(state).toMatchObject({
      preset: 'pour',
      phase: 0,
      playing: true,
      speed: 2,
      scale: 'beaker',
      iodateMm: 25,
      temperatureC: 20,
      view: { water: true, labels: true },
    });
  });

  it('plays the pour in one real second and the induction in eight', () => {
    const store = createClockStore();
    run(store, 1);
    expect(store.getState().phase).toBeCloseTo(PHASE_RANGES.pour.end, 0);
    run(store, 8);
    expect(store.getState().phase).toBeCloseTo(PHASE_RANGES.exhaustion.start, 0);
  });

  it('stretches the switch, then pauses at the end of the one-shot run', () => {
    const store = createClockStore({ phase: PHASE_RANGES.iodine.start });
    run(store, 0.75);
    expect(store.getState().phase).toBeCloseTo(730, 0);
    run(store, 10);
    expect(store.getState()).toMatchObject({ phase: CYCLE_UNITS, playing: false });
    store.getState().play();
    expect(store.getState()).toMatchObject({ phase: 0, playing: true });
  });

  it('plays twice as fast at the top speed and holds still while paused', () => {
    const store = createClockStore({ speed: 3 });
    run(store, 0.5);
    expect(store.getState().phase).toBeCloseTo(PHASE_RANGES.pour.end, 0);
    store.getState().pause();
    run(store, 1);
    expect(store.getState().phase).toBeCloseTo(PHASE_RANGES.pour.end, 0);
  });

  it('snaps and clamps a recipe change and keeps the stage of the reaction', () => {
    const store = createClockStore({ phase: 500, playing: false });
    store.getState().setIodate(31.2);
    expect(store.getState()).toMatchObject({ iodateMm: 30, phase: 500, playing: false });
    store.getState().setTemperature(99);
    expect(store.getState()).toMatchObject({ temperatureC: 40, phase: 500, playing: false });
    store.getState().mixAgain();
    expect(store.getState()).toMatchObject({ phase: 0, playing: true });
  });

  it('snaps to the slider step inside its range', () => {
    const range = { min: 10, max: 50, step: 2.5 };
    expect(snapToRange(11.2, range)).toBe(10);
    expect(snapToRange(11.4, range)).toBe(12.5);
    expect(snapToRange(-5, range)).toBe(10);
    expect(snapToRange(80, range)).toBe(50);
  });

  it('resets the chapter controls on a chapter change and keeps them on the same chapter', () => {
    const store = createClockStore();
    store.getState().setIodate(40);
    store.getState().setScale('molecules');
    store.getState().applyPreset('pour');
    expect(store.getState()).toMatchObject({ iodateMm: 40, scale: 'molecules' });
    store.getState().applyPreset('slowStep');
    expect(store.getState()).toMatchObject({ iodateMm: 25, temperatureC: 20, scale: 'molecules' });
    store.getState().applyPreset('tuning');
    expect(store.getState()).toMatchObject({ scale: 'beaker', phase: 0 });
  });

  it('keeps the view toggles across chapters and takes each chapter speed', () => {
    const store = createClockStore();
    store.getState().toggleView('water');
    store.getState().applyPreset('starch');
    expect(store.getState()).toMatchObject({ speed: 1, view: { water: false } });
  });
});
