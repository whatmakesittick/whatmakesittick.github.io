import { describe, expect, it } from 'vitest';
import { PART_IDS, PRESET_IDS } from '../ids';
import { MOMENTS } from '../model';
import { CHAPTER_CONTROL_DEFAULTS, PRESETS } from './presets';

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

  it('sets the view flags of the spec', () => {
    expect(PRESETS.pull.view).toEqual({
      labels: true,
      underwater: true,
      forces: true,
      handPath: true,
    });
    expect(PRESETS.roll.view.underwater).toBe(false);
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
