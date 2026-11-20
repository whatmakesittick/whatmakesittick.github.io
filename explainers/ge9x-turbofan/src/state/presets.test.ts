import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, PART_IDS, PRESET_IDS } from '../ids';
import { MOMENTS } from '../model';
import { PRESETS } from './presets';

describe('presets', () => {
  it('gives every chapter its own camera and a moment on the timeline', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual([...CAMERA_VIEW_IDS]);
    PRESET_IDS.forEach((id) => {
      expect(Object.values(MOMENTS)).toContain(PRESETS[id].startAt);
      expect(PRESETS[id].pauseAt).toBeUndefined();
    });
  });

  it('labels and highlights known parts, and deploys the reverser only in the last chapter', () => {
    PRESET_IDS.forEach((id) => {
      [...PRESETS[id].labels, ...PRESETS[id].highlight].forEach((part) =>
        expect(PART_IDS).toContain(part),
      );
      expect(PRESETS[id].view.reverser).toBe(id === 'reverse');
    });
  });
});
