import { describe, expect, it } from 'vitest';
import { createSwimTimeline } from '../timeline';
import { createSwimStore, snapToRange } from './store';

describe('swim store', () => {
  it('opens on the whole stroke at the middle pace', () => {
    expect(createSwimStore().getState()).toMatchObject({
      preset: 'stroke',
      phase: 0,
      playing: true,
      speed: 2,
      pace: 'middle',
      kickOverride: null,
      breathing: 'none',
      headUp: false,
      whatIfSpeed: 1.5,
      view: { labels: true, forces: false, underwater: true, handPath: false },
    });
  });

  it('loops past the end of the cycle', () => {
    const store = createSwimStore({ phase: 990 });
    store.getState().setPhase(1010);
    expect(store.getState().phase).toBe(10);
  });

  it('snaps the what-if speed to its step', () => {
    const store = createSwimStore();
    store.getState().setWhatIfSpeed(2.04);
    expect(store.getState().whatIfSpeed).toBe(2);
    store.getState().setWhatIfSpeed(9);
    expect(store.getState().whatIfSpeed).toBe(2.4);
    expect(snapToRange(0, { min: 1, max: 2, step: 0.5 })).toBe(1);
  });

  it('resets the chapter controls on a chapter change but keeps the pace', () => {
    const store = createSwimStore();
    store.getState().setPace('sprint');
    store.getState().setKick('two');
    store.getState().setBreathing('right');
    store.getState().setHeadUp(true);
    store.getState().applyPreset('stroke');
    expect(store.getState()).toMatchObject({ kickOverride: 'two', headUp: true });
    store.getState().applyPreset('drag');
    expect(store.getState()).toMatchObject({
      pace: 'sprint',
      kickOverride: null,
      breathing: 'none',
      headUp: false,
      whatIfSpeed: 1.5,
    });
    expect(store.getState().view).toMatchObject({ forces: true, labels: true });
  });

  it('pauses once on the catch and resumes on the next chapter', () => {
    const store = createSwimStore();
    store.getState().applyPreset('catch');
    expect(store.getState()).toMatchObject({ phase: 286, playing: false, speed: 1 });
    store.getState().applyPreset('pull');
    expect(store.getState()).toMatchObject({ phase: 286, playing: true });
  });

  it('plays at the real cycle time of its pace', () => {
    let pace: 'easy' | 'sprint' = 'easy';
    const store = createSwimStore(
      { phase: 0, speed: 3 },
      createSwimTimeline(() => pace),
    );
    store.getState().tick(0.5);
    expect(store.getState().phase).toBeCloseTo(300, 0);
    pace = 'sprint';
    store.getState().tick(0.5);
    expect(store.getState().phase).toBeCloseTo(800, 0);
  });
});
