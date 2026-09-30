import { describe, expect, it } from 'vitest';
import { CENTRE_TIME, HORIZON_TIME, tauAtRadius } from '../model';
import { PRESETS } from './presets';
import type { PresetId } from './presets';
import { DEFAULT_VIEW, createBlackHoleStore } from './store';

const CHAPTERS = Object.keys(PRESETS) as PresetId[];

describe('black hole store', () => {
  it('starts on the overview at the release with the disc on', () => {
    expect(createBlackHoleStore().getState()).toMatchObject({
      phase: 0,
      speed: 3,
      preset: 'overview',
      comparison: 'sgrA',
      view: { disc: true, sheet: false, labels: false },
    });
  });

  it('opens with the view the overview chapter asks for', () => {
    expect(DEFAULT_VIEW).toMatchObject(PRESETS.overview.view ?? {});
  });

  it('plays eight probe seconds per real second by default and stops at the centre', () => {
    const store = createBlackHoleStore({ phase: 10, playing: true });
    store.getState().tick(1);
    expect(store.getState().phase).toBeCloseTo(18);
    store.getState().setPhase(CENTRE_TIME - 1);
    store.getState().tick(1);
    expect(store.getState()).toMatchObject({ phase: CENTRE_TIME, playing: false });
  });

  it('pauses the fall at the moment the probe reaches a radius', () => {
    const store = createBlackHoleStore({ playing: true });
    store.getState().seekRadius(2);
    expect(store.getState().playing).toBe(false);
    expect(store.getState().phase).toBeCloseTo(tauAtRadius(2));
    expect(store.getState().phase).toBeCloseTo(651.2, 0);
  });

  it('keeps the comparison in its chapter and resets it elsewhere', () => {
    const store = createBlackHoleStore();
    store.getState().applyPreset('others');
    store.getState().setComparison('m87');
    store.getState().applyPreset('others');
    expect(store.getState().comparison).toBe('m87');
    CHAPTERS.filter((id) => id !== 'others').forEach((other) => {
      store.getState().applyPreset('others');
      store.getState().setComparison('stellar');
      store.getState().applyPreset(other);
      expect(store.getState().comparison, other).toBe('sgrA');
    });
  });

  it('seeks each chapter to its moment and keeps playing', () => {
    const store = createBlackHoleStore({ phase: 100, playing: true });
    store.getState().applyPreset('inside');
    expect(store.getState()).toMatchObject({ phase: HORIZON_TIME - 8, playing: true, speed: 0 });
    store.getState().applyPreset('others');
    expect(store.getState()).toMatchObject({ phase: 0, speed: 3 });
    expect(store.getState().view).toMatchObject({ disc: false, sheet: true });
  });

  it('keeps the labels through the chapters', () => {
    const store = createBlackHoleStore();
    store.getState().setView({ labels: true });
    CHAPTERS.forEach((id) => store.getState().applyPreset(id));
    expect(store.getState().view.labels).toBe(true);
  });
});
