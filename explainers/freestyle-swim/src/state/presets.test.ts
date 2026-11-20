import { describe, expect, it } from 'vitest';
import { PACE_IDS, PART_IDS, PRESET_IDS } from '../ids';
import { ELBOW_DEG, MOMENTS, armAt } from '../model';
import { CHAPTER_CONTROL_DEFAULTS, PRESETS, catchPauseUnits } from './presets';
import { createSwimStore } from './store';

describe('presets', () => {
  it('has one preset per chapter with valid parts and a speed on the scale', () => {
    PRESET_IDS.forEach((id) => {
      const preset = PRESETS[id];
      expect(preset.camera).toBe(id === 'stroke' ? 'whole' : id);
      expect(preset.view.labels).toBe(true);
      expect(preset.speed).toBeGreaterThanOrEqual(1);
      [...preset.labels, ...preset.highlight].forEach((part) => expect(PART_IDS).toContain(part));
      preset.highlight.forEach((part) => expect(preset.labels).toContain(part));
    });
  });

  it('pauses once on the catch and seeks the others', () => {
    expect(PRESETS.catch.pauseAt).toBeGreaterThan(MOMENTS.catch);
    expect(PRESETS.pull.startAt).toBe(MOMENTS.catch);
    expect(PRESETS.stroke.startAt).toBe(0);
    PRESET_IDS.filter((id) => id !== 'catch').forEach((id) =>
      expect(PRESETS[id].pauseAt).toBeUndefined(),
    );
  });

  it('pauses at the catch elbow of each pace', () => {
    const elbowTolerance = 2;
    PACE_IDS.forEach((pace) => {
      const store = createSwimStore();
      store.getState().setPace(pace);
      store.getState().applyPreset('catch');
      const { phase, playing } = store.getState();
      expect(playing).toBe(false);
      expect(phase).toBe(catchPauseUnits(pace));
      const elbow = armAt(phase, pace).elbowDeg ?? 0;
      expect(Math.abs(elbow - ELBOW_DEG.catch)).toBeLessThan(elbowTolerance);
    });
  });

  it('keeps the catch pause on the catch when the pace changes', () => {
    const elbowTolerance = 2;
    const store = createSwimStore();
    store.getState().applyPreset('catch');
    (['easy', 'sprint'] as const).forEach((pace) => {
      store.getState().setPace(pace);
      const { phase, playing } = store.getState();
      expect(playing).toBe(false);
      expect(phase).toBe(catchPauseUnits(pace));
      expect(Math.abs((armAt(phase, pace).elbowDeg ?? 0) - ELBOW_DEG.catch)).toBeLessThan(
        elbowTolerance,
      );
    });
  });

  it('leaves the position alone when the visitor moved away from the pause', () => {
    const scrubbed = 600;
    const store = createSwimStore();
    store.getState().applyPreset('catch');
    store.getState().setPhase(scrubbed);
    store.getState().setPace('easy');
    expect(store.getState().phase).toBe(scrubbed);
  });

  it('sets the view flags of the spec', () => {
    expect(PRESETS.pull.view).toEqual({
      labels: true,
      underwater: true,
      forces: true,
      handPath: true,
    });
    expect(PRESETS.roll.view.underwater).toBe(true);
    expect(PRESETS.drag.view.forces).toBe(true);
  });

  it('starts every chapter from the defaults', () => {
    PRESET_IDS.forEach((id) => expect(PRESETS[id].start).toEqual({}));
    expect(CHAPTER_CONTROL_DEFAULTS).toEqual({
      kickOverride: null,
      breathing: 'none',
      headUp: false,
      whatIfSpeed: 1.5,
    });
  });
});
