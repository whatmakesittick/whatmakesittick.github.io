import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, PART_IDS, PRESET_IDS } from '../ids';
import { MOMENTS } from '../model';
import { PRESETS, STARTER_LOOK, lookPreset } from './presets';

describe('presets', () => {
  it('gives every chapter its own camera and a moment on the timeline', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual(
      CAMERA_VIEW_IDS.filter((view) => view !== STARTER_LOOK.camera),
    );
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

  it('swaps only the camera, labels and highlight for the starter look', () => {
    const starter = lookPreset(PRESETS.reverse, 'starter');
    expect(starter).toMatchObject({
      camera: 'starter',
      labels: ['gearbox', 'starter', 'outerShaft'],
    });
    expect(starter.highlight).toEqual(STARTER_LOOK.highlight);
    expect(starter.view).toBe(PRESETS.reverse.view);
    expect(lookPreset(PRESETS.reverse, 'reverser')).toBe(PRESETS.reverse);
    [...STARTER_LOOK.labels, ...STARTER_LOOK.highlight].forEach((part) =>
      expect(PART_IDS).toContain(part),
    );
  });

  it('keeps the person out of the rear view labels', () => {
    expect(PRESETS.reverse.labels).not.toContain('person');
  });
});
