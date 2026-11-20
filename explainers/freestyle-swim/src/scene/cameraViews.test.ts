import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, REGION_IDS } from '../ids';
import { BOUNDS_REGIONS, CAMERA_VIEWS } from './cameraViews';

describe('camera views', () => {
  it('frames every view on a known region without following', () => {
    CAMERA_VIEW_IDS.forEach((view) => {
      const spec = CAMERA_VIEWS[view];
      expect(REGION_IDS).toContain(spec.region);
      expect(spec.follow).toBeUndefined();
      expect(spec.margin).toBeGreaterThan(1);
    });
  });

  it('looks at the swimmer from above for the whole view and from below for the catch', () => {
    expect(CAMERA_VIEWS.whole.direction).toEqual([-1.2, 0.8, 0.7]);
    const [, catchY] = CAMERA_VIEWS.catch.direction as readonly number[];
    expect(catchY).toBeLessThan(0);
  });

  it('bounds the camera by known regions', () => {
    BOUNDS_REGIONS.forEach((id) => expect(REGION_IDS).toContain(id));
  });
});
