import { describe, expect, it } from 'vitest';
import { framingSlopes } from '@core/scene/lens';
import type { ViewportSize } from '@core/scene/lens';
import { regionFromSpec } from '@core/scene/regions';
import { CAMERA_VIEW_IDS, REGION_IDS } from '../ids';
import { BOUNDS_REGIONS, CAMERA_VIEWS, RUN_SHOTS, cameraFor, shotPose } from './cameraViews';

const DEVICES: Record<string, ViewportSize> = {
  desktop: { width: 590, height: 740, safe: { top: 0, right: 200, bottom: 140, left: 0 } },
  phone: { width: 390, height: 421, safe: { top: 0, right: 0, bottom: 95, left: 0 } },
};
const ROAD_CLEARANCE_M = 0.15;
const HIP_HEIGHT_M = { min: 0.8, max: 1.35 } as const;

describe('camera views', () => {
  it('follows the runner with the shared zoom limits on every view', () => {
    CAMERA_VIEW_IDS.forEach((view) => {
      expect(CAMERA_VIEWS[view].follow).toBe('position');
      expect(CAMERA_VIEWS[view].distance).toEqual({ min: 0.5, max: 14 });
      expect(RUN_SHOTS[view].margin).toBeGreaterThan(1);
    });
  });

  it('looks from the front for the hero, from behind for the push-off, from above for the posture', () => {
    expect(RUN_SHOTS.hero.direction[0]).toBeGreaterThan(0);
    expect(RUN_SHOTS.hero.direction[2]).toBeGreaterThan(0);
    expect(RUN_SHOTS.behind.direction[0]).toBeLessThan(0);
    expect(RUN_SHOTS.above.direction[1]).toBeGreaterThan(0.9);
  });

  it('keeps the camera above the road and the hero camera near hip height on every device', () => {
    Object.entries(DEVICES).forEach(([device, size]) =>
      CAMERA_VIEW_IDS.forEach((view) => {
        const { position, target } = shotPose(RUN_SHOTS[view], framingSlopes(size));
        expect(position.y, `${device} ${view}`).toBeGreaterThan(ROAD_CLEARANCE_M);
        expect(regionFromSpec(RUN_SHOTS[view].box).containsPoint(target)).toBe(true);
        if (view === 'hero') {
          expect(position.y, device).toBeGreaterThan(HIP_HEIGHT_M.min);
          expect(position.y, device).toBeLessThan(HIP_HEIGHT_M.max);
        }
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
