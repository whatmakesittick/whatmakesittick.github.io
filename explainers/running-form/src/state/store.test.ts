import { describe, expect, it, vi } from 'vitest';
import { createRunTimeline } from '../timeline';
import { PRESETS } from './presets';
import { createRunStore, snapToRange } from './store';

describe('run store', () => {
  it('does not notify when a setter receives the value it already holds', () => {
    const store = createRunStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const { pace, stepRate, arms, lookFrom } = store.getState();
    store.getState().setPace(pace);
    store.getState().setStepRate(stepRate);
    store.getState().setArms(arms);
    store.getState().setLookFrom(lookFrom);
    expect(listener).not.toHaveBeenCalled();
    store.getState().setPace('fast');
    store.getState().setArms('held');
    store.getState().setLookFrom('above');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('opens on the stride chapter at the steady pace', () => {
    expect(createRunStore().getState()).toMatchObject({
      preset: 'stride',
      phase: PRESETS.stride.startAt,
      playing: true,
      speed: 2,
      pace: 'steady',
      stepRate: 0,
      arms: 'swing',
      lookFrom: 'front',
      view: { labels: true, forces: false, formLines: false, footPath: false, follow: true },
    });
  });

  it('loops past the end of the cycle', () => {
    const store = createRunStore({ phase: 990 });
    store.getState().setPhase(1010);
    expect(store.getState().phase).toBe(10);
  });

  it('snaps the step rate to its step and range', () => {
    const store = createRunStore();
    store.getState().setStepRate(4.4);
    expect(store.getState().stepRate).toBe(4);
    store.getState().setStepRate(40);
    expect(store.getState().stepRate).toBe(10);
    store.getState().setStepRate(-40);
    expect(store.getState().stepRate).toBe(-10);
    expect(snapToRange(0.4, { min: 0, max: 5, step: 1 })).toBe(0);
  });

  it('resets the chapter controls on a chapter change but keeps the pace', () => {
    const store = createRunStore();
    store.getState().setPace('fast');
    store.getState().setStepRate(6);
    store.getState().setArms('held');
    store.getState().setLookFrom('above');
    store.getState().applyPreset('stride');
    expect(store.getState()).toMatchObject({ stepRate: 6, arms: 'held', lookFrom: 'above' });
    store.getState().applyPreset('touchdown');
    expect(store.getState()).toMatchObject({
      pace: 'fast',
      stepRate: 0,
      arms: 'swing',
      lookFrom: 'front',
    });
  });

  it('sets the follow toggle per chapter', () => {
    const store = createRunStore();
    store.getState().applyPreset('liftoff');
    expect(store.getState().view).toMatchObject({ follow: false, footPath: true });
    store.getState().applyPreset('posture');
    expect(store.getState().view).toMatchObject({ follow: true, footPath: false, formLines: true });
  });

  it('pauses at touchdown once and resumes on the next chapter', () => {
    const store = createRunStore();
    store.getState().applyPreset('touchdown');
    expect(store.getState()).toMatchObject({ phase: 0, playing: false, speed: 1 });
    store.getState().applyPreset('spring');
    expect(store.getState()).toMatchObject({ phase: PRESETS.spring.startAt, playing: true });
  });

  it('plays at the real stride time of its pace and step rate', () => {
    let stepRate = 0;
    const store = createRunStore(
      { phase: 0, speed: 4 },
      createRunTimeline(
        () => 'steady',
        () => stepRate,
      ),
    );
    store.getState().tick(0.1);
    const slow = store.getState().phase;
    stepRate = 10;
    store.getState().setPhase(0);
    store.getState().tick(0.1);
    expect(store.getState().phase).toBeGreaterThan(slow);
  });
});
