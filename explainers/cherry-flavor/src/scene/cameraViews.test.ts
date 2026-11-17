import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, REGION_SCALE, SCALE_IDS, VIEW_SCALE } from '../ids';
import { BOUNDS_REGIONS, CAMERA_VIEWS, cameraFor } from './cameraViews';

describe('camera views', () => {
  it('frames each view on a region of its own scale', () => {
    CAMERA_VIEW_IDS.forEach((view) => {
      expect(REGION_SCALE[CAMERA_VIEWS[view].region]).toBe(VIEW_SCALE[view]);
    });
  });

  it('keeps the view when the scale matches and swaps it otherwise', () => {
    expect(cameraFor('profile', 'head')).toBe('profile');
    expect(cameraFor('profile', 'molecules')).toBe('receptors');
    expect(cameraFor('molecules', 'tongue')).toBe('scoop');
    CAMERA_VIEW_IDS.forEach((view) =>
      SCALE_IDS.forEach((scale) => expect(VIEW_SCALE[cameraFor(view, scale)]).toBe(scale)),
    );
  });

  it('bounds each scale by its own regions', () => {
    SCALE_IDS.forEach((scale) =>
      BOUNDS_REGIONS[scale].forEach((id) => expect(REGION_SCALE[id]).toBe(scale)),
    );
  });
});
