import { describe, expect, it } from 'vitest';
import { PART_SCALE, PRESET_IDS, VIEW_SCALE } from '../ids';
import { PRESETS, SCALE_DEFAULT_LABELS } from './presets';

describe('presets', () => {
  it('labels only parts of the scale each chapter opens on', () => {
    PRESET_IDS.forEach((id) => {
      const preset = PRESETS[id];
      expect(preset.start.scale).toBe(VIEW_SCALE[preset.camera]);
      preset.labels.forEach((part) => expect(PART_SCALE[part]).toBe(preset.start.scale));
      expect(preset.view).toEqual({ pinched: false });
    });
  });

  it('gives every scale its own default labels', () => {
    Object.entries(SCALE_DEFAULT_LABELS).forEach(([scale, parts]) =>
      parts.forEach((part) => expect(PART_SCALE[part]).toBe(scale)),
    );
  });
});
