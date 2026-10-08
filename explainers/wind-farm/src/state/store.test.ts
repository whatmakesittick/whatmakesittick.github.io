import { describe, expect, it } from 'vitest';
import { DEFAULT_SPACING_D, PHASE_RANGES } from '../model';
import {
  CHAPTER_CONTROL_DEFAULTS,
  DEFAULT_SITE_WIND,
  DEFAULT_VIEW,
  WIND_OVERRIDE_RANGE,
  createWindFarmStore,
  snapToRange,
} from './store';

describe('wind farm store', () => {
  it('starts on the farm chapter at noon on a typical site with every view shown', () => {
    const state = createWindFarmStore().getState();
    expect(state.preset).toBe('farm');
    expect(state.siteWind).toBe(DEFAULT_SITE_WIND);
    expect(state.spacing).toBe(DEFAULT_SPACING_D);
    expect(state.windOverride).toBeNull();
    expect(DEFAULT_VIEW).toEqual({
      streamlines: true,
      wakes: true,
      cables: true,
      labels: true,
      cutaway: false,
    });
  });

  it('snaps the wind override to half metres per second inside its range', () => {
    const store = createWindFarmStore();
    store.getState().setWindOverride(7.3);
    expect(store.getState().windOverride).toBe(7.5);
    store.getState().setWindOverride(40);
    expect(store.getState().windOverride).toBe(WIND_OVERRIDE_RANGE.max);
    store.getState().setWindOverride(-2);
    expect(store.getState().windOverride).toBe(WIND_OVERRIDE_RANGE.min);
    store.getState().setWindOverride(null);
    expect(store.getState().windOverride).toBeNull();
    expect(snapToRange(12.26, WIND_OVERRIDE_RANGE)).toBe(12.5);
  });

  it('resets the chapter controls on a chapter change and keeps them inside a chapter', () => {
    const store = createWindFarmStore();
    store.getState().applyPreset('wakes');
    store.getState().setSpacing(9);
    store.getState().setWindOverride(20);
    store.getState().applyPreset('wakes');
    expect(store.getState().spacing).toBe(9);
    expect(store.getState().windOverride).toBe(20);
    store.getState().applyPreset('grid');
    expect(store.getState().spacing).toBe(CHAPTER_CONTROL_DEFAULTS.spacing);
    expect(store.getState().windOverride).toBeNull();
  });

  it('keeps the site wind and the labels toggle across chapters', () => {
    const store = createWindFarmStore();
    store.getState().setSiteWind('windy');
    store.getState().setView({ labels: false });
    store.getState().applyPreset('curve');
    expect(store.getState().siteWind).toBe('windy');
    expect(store.getState().view.labels).toBe(false);
  });

  it('opens the nacelle in its chapter and closes it on leaving', () => {
    const store = createWindFarmStore();
    store.getState().applyPreset('nacelle');
    expect(store.getState().view.cutaway).toBe(true);
    store.getState().applyPreset('tower');
    expect(store.getState().view.cutaway).toBe(false);
  });

  it('pauses the wakes chapter in the morning breeze', () => {
    const store = createWindFarmStore();
    store.getState().applyPreset('wakes');
    const { phase, playing } = store.getState();
    expect(playing).toBe(false);
    expect(phase).toBeGreaterThanOrEqual(PHASE_RANGES.morning[0]);
    expect(phase).toBeLessThan(PHASE_RANGES.morning[1]);
  });
});
