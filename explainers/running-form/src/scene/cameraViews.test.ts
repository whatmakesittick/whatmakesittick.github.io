import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Direction } from '@core/scene/cameraViews';
import { frameBox } from '@core/scene/frameBox';
import { framingSlopes } from '@core/scene/lens';
import type { ViewportSize } from '@core/scene/lens';
import { CAMERA_VIEW_IDS, REGION_IDS } from '../ids';
import { regionBox } from './regions';
import { BOUNDS_REGIONS, CAMERA_VIEWS, cameraFor } from './cameraViews';

const DEVICES: Record<string, ViewportSize> = {
  desktop: { width: 834, height: 900, safe: { top: 0, right: 286, bottom: 145, left: 0 } },
  phone: { width: 390, height: 421, safe: { top: 0, right: 10, bottom: 95, left: 0 } },
};
const ROAD_CLEARANCE_M = 0.2;

describe('camera views', () => {
  it('frames every view on a known region and follows the runner', () => {
    CAMERA_VIEW_IDS.forEach((view) => {
      const spec = CAMERA_VIEWS[view];
      expect(REGION_IDS).toContain(spec.region);
      expect(regionBox(spec.region).isEmpty()).toBe(false);
      expect(spec.follow).toBe('position');
      expect(spec.distance).toEqual({ min: 0.5, max: 14 });
      expect(spec.margin).toBeGreaterThan(1);
    });
  });

  it('looks from the front for the hero, from behind for the push-off, from above for the posture', () => {
    expect((CAMERA_VIEWS.hero.direction as Direction)[0]).toBeGreaterThan(0);
    expect((CAMERA_VIEWS.behind.direction as Direction)[0]).toBeLessThan(0);
    expect((CAMERA_VIEWS.above.direction as Direction)[1]).toBeGreaterThan(0.9);
  });

  it('keeps the camera above the road on every device', () => {
    Object.values(DEVICES).forEach((size) =>
      CAMERA_VIEW_IDS.forEach((view) => {
        const spec = CAMERA_VIEWS[view];
        const direction = new Vector3(...(spec.direction as Direction)).normalize();
        const { position } = frameBox(
          regionBox(spec.region),
          direction,
          framingSlopes(size),
          spec.margin,
        );
        expect(position.y, view).toBeGreaterThan(ROAD_CLEARANCE_M);
      }),
    );
  });

  it('bounds the camera by known regions', () => {
    BOUNDS_REGIONS.forEach((id) => expect(REGION_IDS).toContain(id));
  });

  it('swaps the front view for the one from above on the look chip', () => {
    expect(cameraFor('front', 'above')).toBe('above');
    expect(cameraFor('front', 'front')).toBe('front');
    expect(cameraFor('hero', 'above')).toBe('hero');
  });
});
