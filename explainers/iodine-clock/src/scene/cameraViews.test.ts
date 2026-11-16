import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, REGION_SCALE, SCALE_IDS, VIEW_SCALE } from '../ids';
import { BOUNDS_REGION, CAMERA_VIEWS, cameraFor } from './cameraViews';

describe('camera views', () => {
  it('frames each view on a region of its own scale', () => {
    expect(Object.keys(CAMERA_VIEWS)).toEqual([...CAMERA_VIEW_IDS]);
    CAMERA_VIEW_IDS.forEach((view) =>
      expect(REGION_SCALE[CAMERA_VIEWS[view].region]).toBe(VIEW_SCALE[view]),
    );
  });

  it('keeps a view on its scale and swaps to its partner on the other', () => {
    expect(cameraFor('bench', 'beaker')).toBe('bench');
    expect(cameraFor('bench', 'molecules')).toBe('landolt');
    expect(cameraFor('helix', 'beaker')).toBe('beaker');
    expect(cameraFor('tuning', 'molecules')).toBe('iodine');
    CAMERA_VIEW_IDS.forEach((view) =>
      SCALE_IDS.forEach((scale) => expect(VIEW_SCALE[cameraFor(view, scale)]).toBe(scale)),
    );
  });

  it('bounds the camera by a region of each scale', () => {
    SCALE_IDS.forEach((scale) => expect(REGION_SCALE[BOUNDS_REGION[scale]]).toBe(scale));
  });
});
