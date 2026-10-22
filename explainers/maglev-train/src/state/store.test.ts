import { describe, expect, it } from 'vitest';
import { RUN_UNITS, rate } from '../model';
import { PRESETS } from './presets';
import {
  CHAPTER_CONTROL_DEFAULTS,
  DEFAULT_VIEW,
  START_PHASE,
  START_VIEW,
  createMaglevTrainStore,
} from './store';

describe('maglev train store', () => {
  it('starts on the ride chapter, playing from the platform at 430 km/h', () => {
    const state = createMaglevTrainStore().getState();
    expect(state.preset).toBe('ride');
    expect(START_PHASE).toBe(0);
    expect(state.phase).toBe(START_PHASE);
    expect(state.playing).toBe(true);
    expect(state.pausedByPreset).toBe(false);
    expect(state.speed).toBe(8);
    expect(state.topSpeed).toBe('kmh430');
    expect(state.nudgeToken).toBe(0);
    expect(state).toMatchObject(CHAPTER_CONTROL_DEFAULTS);
    expect(state.view).toEqual(START_VIEW);
    expect(START_VIEW).toEqual({ ...DEFAULT_VIEW, ...PRESETS.ride.view });
  });

  it('keeps a normal stop, no nudge and the Shanghai maglev as chapter defaults', () => {
    expect(CHAPTER_CONTROL_DEFAULTS).toEqual({
      brakeMode: 'regen',
      nudge: null,
      compare: 'transrapid',
    });
    expect(DEFAULT_VIEW.labels).toBe(true);
  });

  it('sets the top speed, the brake mode and the comparison', () => {
    const store = createMaglevTrainStore();
    store.getState().setTopSpeed('kmh300');
    store.getState().setBrakeMode('eddy');
    store.getState().setCompare('scmaglev');
    expect(store.getState()).toMatchObject({
      topSpeed: 'kmh300',
      brakeMode: 'eddy',
      compare: 'scmaglev',
    });
  });

  it('counts every nudge so the same push can restart', () => {
    const store = createMaglevTrainStore();
    store.getState().nudgeTrain('bump');
    expect(store.getState()).toMatchObject({ nudge: 'bump', nudgeToken: 1 });
    store.getState().nudgeTrain('bump');
    expect(store.getState()).toMatchObject({ nudge: 'bump', nudgeToken: 2 });
    store.getState().nudgeTrain('gust');
    expect(store.getState()).toMatchObject({ nudge: 'gust', nudgeToken: 3 });
  });

  it('resets the chapter controls on a chapter change and keeps the top speed', () => {
    const store = createMaglevTrainStore();
    const state = store.getState();
    state.setTopSpeed('kmh300');
    state.setBrakeMode('eddy');
    state.setCompare('wheelRail');
    state.nudgeTrain('gust');
    state.applyPreset('centre');
    expect(store.getState()).toMatchObject({
      ...CHAPTER_CONTROL_DEFAULTS,
      topSpeed: 'kmh300',
      nudgeToken: 1,
      preset: 'centre',
    });
  });

  it('applies the chapter start over the defaults', () => {
    const store = createMaglevTrainStore();
    store.getState().setBrakeMode('eddy');
    store.getState().applyPreset('stop');
    expect(store.getState().brakeMode).toBe('regen');
    store.getState().setCompare('scmaglev');
    store.getState().applyPreset('compare');
    expect(store.getState().compare).toBe('transrapid');
  });

  it('keeps the chapter controls when the same chapter is applied again', () => {
    const store = createMaglevTrainStore();
    store.getState().setBrakeMode('eddy');
    store.getState().applyPreset('ride');
    expect(store.getState().brakeMode).toBe('eddy');
  });

  it('applies each chapter view, speed and seek, and leaves the labels as the reader left them', () => {
    const store = createMaglevTrainStore();
    store.getState().toggleView('labels');
    store.getState().applyPreset('motor');
    expect(store.getState()).toMatchObject({ speed: 2, phase: 70, playing: true });
    expect(store.getState().view).toEqual({ ...PRESETS.motor.view, labels: false });
    store.getState().applyPreset('compare');
    expect(store.getState()).toMatchObject({ speed: 8, phase: 420, playing: false });
    expect(store.getState().view).toEqual({ ...PRESETS.compare.view, labels: false });
  });

  it('plays the ride once and stops at the airport', () => {
    const store = createMaglevTrainStore({ phase: 0, playing: true, speed: 8 });
    store.getState().tick(1);
    expect(store.getState().phase).toBeCloseTo(rate(8), 9);
    store.getState().tick(60);
    expect(store.getState()).toMatchObject({ phase: RUN_UNITS, playing: false });
    store.getState().play();
    expect(store.getState()).toMatchObject({ phase: 0, playing: true });
  });

  it('keeps the playback speed inside its range', () => {
    const store = createMaglevTrainStore();
    store.getState().setSpeed(100);
    expect(store.getState().speed).toBe(32);
    store.getState().setSpeed(0);
    expect(store.getState().speed).toBe(1);
  });
});
