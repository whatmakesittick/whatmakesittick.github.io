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

const RECORDED_POSES: Readonly<Record<string, readonly number[]>> = {
  'desktop.hero': [
    3.503150747454253, 1.035760017350784, 4.445706086479811, 0.05500000000000002, 0.66,
    0.024999999999999994,
  ],
  'desktop.foot': [
    1.015212370385662, 0.7260849481542648, 3.985849481542648, 0.05000000000000002, 0.34, 0.125,
  ],
  'desktop.leg': [
    -0.4053360344733778, 0.8642688275787022, 4.4533603447337775, 0.024999999999999967, 0.52, 0.15,
  ],
  'desktop.behind': [
    -4.870067971831496, 2.3110203915494485, 0.5370067971831496, 0, 0.85, 0.05000000000000002,
  ],
  'desktop.front': [
    3.446481998475341, 2.0292963996950686, 0.16982409992376707, 0.05000000000000002, 1.35, 0,
  ],
  'desktop.above': [0.4339107007072569, 5.464107007072569, 1.0097767517681422, 0.03, 1.425, 0],
  'desktop.wide': [7.14673418752594, 1.6670285241690879, 9.528978916701254, 0, 1, 0],
  'phone.hero': [
    3.6482529803301107, 1.0515724401641786, 4.631734590166808, 0.05500000000000002, 0.66,
    0.024999999999999994,
  ],
  'phone.foot': [
    0.6083722075316073, 0.563348883012643, 2.358488830126429, 0.05000000000000002, 0.34, 0.125,
  ],
  'phone.leg': [
    -0.2594516914943961, 0.7475613531955169, 2.9945169149439606, 0.024999999999999967, 0.52, 0.15,
  ],
  'phone.behind': [
    -5.113312607034485, 2.3839937821103456, 0.5613312607034485, 0, 0.85, 0.05000000000000002,
  ],
  'phone.front': [
    3.084141833607634, 1.956828366721527, 0.1517070916803817, 0.05000000000000002, 1.35, 0,
  ],
  'phone.above': [0.31786493350518596, 4.30364933505186, 0.719662333762965, 0.03, 1.425, 0],
  'phone.wide': [4.204114561114597, 1.3923840257040292, 5.60548608148613, 0, 1, 0],
};

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

  it('keeps the recorded camera pose of every view on every device', () => {
    Object.entries(DEVICES).forEach(([device, size]) =>
      CAMERA_VIEW_IDS.forEach((view) => {
        const { position, target } = shotPose(RUN_SHOTS[view], framingSlopes(size));
        expect([...position.toArray(), ...target.toArray()], `${device} ${view}`).toEqual(
          RECORDED_POSES[`${device}.${view}`],
        );
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
