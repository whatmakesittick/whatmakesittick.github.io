import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import { frameBox } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { Direction } from '@core/scene/cameraViews';
import { flashAt } from '../../../model/run';
import { CHASE, FIXED_VIEWS, chasePose } from '../../cameraViews';
import { regionBox } from '../../regions';
import { viewRegion } from '../../viewRegions';
import { TOOL_ROWS } from './dims';
import { crosses, hidesHero } from './rows';
import { rowFootprints, toolSpots } from './tools';

const BOX = { minX: 2, maxX: 4, minZ: -1, maxZ: 1 };
const DESKTOP: FramingSlopes = { vertical: 0.226, horizontal: 0.186 };
const PHONE: FramingSlopes = { vertical: 0.205, horizontal: 0.266 };
const CHASE_UNITS = [0, 300, 450, 750, 900];
const IDENTITY = new Matrix4();

function chapterCameras(slopes: FramingSlopes): Vector3[] {
  const fixed = Object.entries(FIXED_VIEWS).map(([, view]) => {
    const box = viewRegion(view.region, IDENTITY) ?? regionBox(view.region);
    const direction = new Vector3(...(view.direction as Direction));
    return frameBox(box, direction, slopes, view.margin).position;
  });
  const chase = CHASE_UNITS.map(
    (units) => chasePose(flashAt(units, 'nxe3600d'), CHASE, slopes).position,
  );
  return [...fixed, ...chase];
}

describe('tool rows', () => {
  it('finds a sight line through a footprint and misses one beside it', () => {
    expect(crosses(0, 0, 6, 0, BOX)).toBe(true);
    expect(crosses(0, 2, 6, 2, BOX)).toBe(false);
    expect(crosses(3, 5, 3, 0, BOX)).toBe(true);
    expect(crosses(0, 0, 1.9, 0, BOX)).toBe(false);
  });

  it('places tools in every row inside the hall and away from the machine', () => {
    const spots = toolSpots();
    TOOL_ROWS.forEach((_, row) => {
      expect(spots.filter((spot) => spot.row === row).length).toBeGreaterThan(3);
    });
    rowFootprints(spots).forEach((footprint) => {
      const clear = footprint.maxZ < -3 || footprint.minX > 8 || footprint.maxX < -9;
      expect(clear).toBe(true);
    });
  });

  it('never stands a row between a chapter camera and the machine', () => {
    const footprints = rowFootprints(toolSpots());
    [DESKTOP, PHONE].forEach((slopes) => {
      chapterCameras(slopes).forEach((camera) => {
        footprints.forEach((footprint) => expect(hidesHero(camera, footprint)).toBe(false));
      });
    });
  });
});
