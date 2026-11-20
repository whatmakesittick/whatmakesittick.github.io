import { describe, expect, it } from 'vitest';
import { CYCLE_UNITS, MOMENTS } from '../model';
import { LEVER_RANGE, createEngineStore, snapLever } from './store';

const FRAME = 1 / 60;

function run(store: ReturnType<typeof createEngineStore>, seconds: number): void {
  const frames = Math.round(seconds / FRAME);
  for (let frame = 0; frame < frames; frame += 1) store.getState().tick(FRAME);
}

describe('engine store', () => {
  it('opens on the fan at the intake lip', () => {
    expect(createEngineStore().getState()).toMatchObject({
      preset: 'fan',
      phase: MOMENTS.intake,
      playing: true,
      speed: 1,
      thrust: LEVER_RANGE.default,
      cutaway: 'closed',
      streams: 'both',
      view: { labels: true, person: true, reverser: false },
    });
  });

  it('loops eighty units a second', () => {
    const store = createEngineStore();
    run(store, 2);
    expect(store.getState().phase).toBeCloseTo(160, 0);
    run(store, 11);
    expect(store.getState().phase).toBeCloseTo((13 * 80) % CYCLE_UNITS, 0);
    expect(store.getState().playing).toBe(true);
  });

  it('snaps and clamps the thrust lever', () => {
    const store = createEngineStore();
    store.getState().setThrust(0.456);
    expect(store.getState().thrust).toBe(0.46);
    store.getState().setThrust(1.4);
    expect(store.getState().thrust).toBe(1);
    store.getState().setThrust(-1);
    expect(store.getState().thrust).toBe(0);
    expect(snapLever(0.1 + 0.2)).toBe(0.3);
  });

  it('resets the chapter choices on a chapter change and moves the lever only where asked', () => {
    const store = createEngineStore();
    store.getState().setStreams('cold');
    store.getState().applyPreset('compressor');
    expect(store.getState()).toMatchObject({
      cutaway: 'cutaway',
      streams: 'hot',
      phase: MOMENTS.behindFan,
      thrust: LEVER_RANGE.default,
    });
    store.getState().applyPreset('thrust');
    expect(store.getState()).toMatchObject({ streams: 'both', thrust: 0.85 });
    store.getState().setThrust(0.3);
    store.getState().applyPreset('reverse');
    expect(store.getState()).toMatchObject({ cutaway: 'closed', thrust: 0.4 });
    expect(store.getState().view.reverser).toBe(true);
    store.getState().applyPreset('fan');
    expect(store.getState().view.reverser).toBe(false);
    expect(store.getState().thrust).toBe(0.4);
  });

  it('keeps the person and label toggles across chapters', () => {
    const store = createEngineStore();
    store.getState().setView({ person: false, labels: false });
    store.getState().applyPreset('turbines');
    expect(store.getState().view).toMatchObject({ person: false, labels: false });
  });

  it('opens the starter view with the cutaway and the reverser stowed, and restores the chapter', () => {
    const store = createEngineStore();
    store.getState().applyPreset('reverse');
    expect(store.getState()).toMatchObject({ look: 'reverser', cutaway: 'closed' });
    expect(store.getState().view.reverser).toBe(true);
    store.getState().setLook('starter');
    expect(store.getState()).toMatchObject({ look: 'starter', cutaway: 'cutaway' });
    expect(store.getState().view.reverser).toBe(false);
    store.getState().setLook('reverser');
    expect(store.getState()).toMatchObject({ look: 'reverser', cutaway: 'closed' });
    expect(store.getState().view.reverser).toBe(true);
  });

  it('resets the look when the chapter changes', () => {
    const store = createEngineStore();
    store.getState().applyPreset('reverse');
    store.getState().setLook('starter');
    store.getState().applyPreset('thrust');
    expect(store.getState().look).toBe('reverser');
    store.getState().applyPreset('reverse');
    expect(store.getState().look).toBe('reverser');
    expect(store.getState().view.reverser).toBe(true);
  });
});
