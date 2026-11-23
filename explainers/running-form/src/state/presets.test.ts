import { beforeAll, describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, PACE_IDS, PART_IDS, PRESET_IDS } from '../ids';
import { MOMENTS } from '../model';
import { RUN_READOUTS } from '../ui/readouts';
import { initTestLocale } from '../ui/testing';
import { PRESETS, RUN_CONTROL_DEFAULTS } from './presets';
import { createRunStore } from './store';

const ZERO_OR_HALF = [0, 500];

function gaugeText(store: ReturnType<typeof createRunStore>): string {
  const state = store.getState();
  return RUN_READOUTS.map((row) => row.value(state)).join('|');
}

describe('presets', () => {
  beforeAll(() => initTestLocale());

  it('has one preset per chapter with valid parts and a speed on the scale', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual([
      'hero',
      'foot',
      'leg',
      'behind',
      'front',
      'wide',
    ]);
    PRESET_IDS.forEach((id) => {
      const preset = PRESETS[id];
      expect(CAMERA_VIEW_IDS).toContain(preset.camera);
      expect(preset.view.labels).toBe(true);
      expect(preset.speed).toBeGreaterThanOrEqual(1);
      expect(preset.start).toEqual({});
      [...preset.labels, ...preset.highlight].forEach((part) => expect(PART_IDS).toContain(part));
      preset.highlight.forEach((part) => expect(preset.labels).toContain(part));
    });
  });

  it('follows the runner except in the push-off chapter', () => {
    PRESET_IDS.forEach((id) => expect(PRESETS[id].view.follow).toBe(id !== 'liftoff'));
  });

  it('pauses once at touchdown and seeks the others', () => {
    expect(PRESETS.touchdown.pauseAt).toBe(MOMENTS.touchdown);
    expect(PRESETS.stride.startAt).toBe(MOMENTS.midFloat);
    PRESET_IDS.filter((id) => id !== 'touchdown').forEach((id) => {
      expect(PRESETS[id].pauseAt).toBeUndefined();
      expect(ZERO_OR_HALF).not.toContain(PRESETS[id].startAt);
    });
  });

  it('keeps the control defaults of a fresh visit', () => {
    expect(RUN_CONTROL_DEFAULTS).toEqual({ stepRate: 0, arms: 'swing', lookFrom: 'front' });
  });

  it.each(PACE_IDS)('shows different gauge text in consecutive chapters at the %s pace', (pace) => {
    const store = createRunStore();
    store.getState().setPace(pace);
    const texts = PRESET_IDS.map((id) => {
      store.getState().applyPreset(id);
      return gaugeText(store);
    });
    texts.slice(1).forEach((text, index) => expect(text).not.toBe(texts[index]));
  });
});
