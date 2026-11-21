import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Direction } from '@core/scene/cameraViews';
import { frameBox } from '@core/scene/frameBox';
import { framingSlopes } from '@core/scene/lens';
import type { ViewportSize } from '@core/scene/lens';
import { regionFromSpec } from '@core/scene/regions';
import { CAMERA_VIEW_IDS, REGION_IDS } from '../ids';
import { ROPE_Z_M, WATER_DEPTH_M } from '../model/layout';
import { BOUNDS_REGIONS, CAMERA_VIEWS, VIEW_FRAMES } from './cameraViews';

const DEVICES: Record<string, ViewportSize> = {
  desktop: { width: 834, height: 900, safe: { top: 0, right: 286, bottom: 145, left: 0 } },
  phone: { width: 390, height: 421, safe: { top: 0, right: 10, bottom: 95, left: 0 } },
};
const ROPE_CLEARANCE_M = 0.1;
const ABOVE_ROPES_M = 1;
const SURFACE_CLEARANCE_M = 0.05;
const FLOOR_CLEARANCE_M = 0.2;

function cameraPosition(view: (typeof CAMERA_VIEW_IDS)[number], size: ViewportSize): Vector3 {
  const spec = CAMERA_VIEWS[view];
  const direction = new Vector3(...(spec.direction as Direction)).normalize();
  const box = regionFromSpec(VIEW_FRAMES[spec.region]);
  return frameBox(box, direction, framingSlopes(size), spec.margin).position;
}

describe('camera views', () => {
  it('frames every view on its own box without following', () => {
    CAMERA_VIEW_IDS.forEach((view) => {
      const spec = CAMERA_VIEWS[view];
      expect(spec.region).toBe(view);
      expect(regionFromSpec(VIEW_FRAMES[view]).isEmpty()).toBe(false);
      expect(spec.follow).toBeUndefined();
      expect(spec.margin).toBeGreaterThan(0);
    });
  });

  it('looks down the lane for the whole view and up at the arm for the catch', () => {
    const [wholeX, wholeY] = CAMERA_VIEWS.whole.direction as Direction;
    const [, catchY] = CAMERA_VIEWS.catch.direction as Direction;
    expect(wholeX).toBeLessThan(0);
    expect(wholeY).toBeGreaterThan(0);
    expect(catchY).toBeLessThan(0);
  });

  it('keeps the camera inside the lane or above it, off the surface and above the floor', () => {
    Object.values(DEVICES).forEach((size) =>
      CAMERA_VIEW_IDS.forEach((view) => {
        const { y, z } = cameraPosition(view, size);
        const insideLane = Math.abs(z) < ROPE_Z_M - ROPE_CLEARANCE_M;
        expect(insideLane || y > ABOVE_ROPES_M, view).toBe(true);
        expect(Math.abs(y), view).toBeGreaterThan(SURFACE_CLEARANCE_M);
        expect(y, view).toBeGreaterThan(FLOOR_CLEARANCE_M - WATER_DEPTH_M);
      }),
    );
  });

  it('bounds the camera by known regions', () => {
    BOUNDS_REGIONS.forEach((id) => expect(REGION_IDS).toContain(id));
  });
});
