import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS } from '../ids';
import { CHASE_VIEW, COMPASS_VIEWS, FIXED_VIEWS, cameraViews, compass } from './cameraViews';

const DIGITS = 9;
const NO_CHASE = () => null;

describe('euv camera views', () => {
  it('has a spec for every camera view', () => {
    expect(Object.keys(cameraViews(NO_CHASE)).sort()).toEqual([...CAMERA_VIEW_IDS].sort());
  });

  it('frames every fixed view from a unit direction', () => {
    Object.entries(FIXED_VIEWS).forEach(([id, view]) => {
      expect(new Vector3(...(view.direction as readonly number[])).length(), id).toBeCloseTo(
        1,
        DIGITS,
      );
      expect(COMPASS_VIEWS[id as keyof typeof COMPASS_VIEWS].region).toBe(view.region);
    });
  });

  it('puts the camera on the plus z side at bearing 180 and above at a positive elevation', () => {
    const [x, y, z] = compass(180, 0) as readonly number[];
    expect(x).toBeCloseTo(0, DIGITS);
    expect(y).toBeCloseTo(0, DIGITS);
    expect(z).toBeCloseTo(1, DIGITS);
    expect((compass(180, 30) as readonly number[])[1]).toBeGreaterThan(0);
    expect((compass(180, -30) as readonly number[])[1]).toBeLessThan(0);
  });

  it('looks at the chase target only while there is one', () => {
    const spec = cameraViews(NO_CHASE)[CHASE_VIEW];
    expect(spec).toHaveProperty('pose');
  });
});
