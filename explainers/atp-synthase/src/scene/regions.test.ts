import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { BLADE_COUNTS, HUMAN_BLADE_COUNT } from '../model/rotor';
import { HEAD, OSCP, PUMPS, UNITS_PER_NM, rowOffsetZ } from '../model/scale';
import { regionBox, regionSpec } from './regions';

const REGIONS: readonly RegionId[] = ['scene', 'motor', 'rotor', 'head', 'pumps', 'row'];
const HUMAN = { bladeCount: HUMAN_BLADE_COUNT, motorCount: 1 };

function box(id: RegionId, bladeCount = HUMAN_BLADE_COUNT, motorCount = 1) {
  return regionFromSpec(regionSpec(id, { bladeCount, motorCount }));
}

describe('regions', () => {
  it('gives every region a box with room in it for every ring and row', () => {
    Object.values(BLADE_COUNTS).forEach((bladeCount) => {
      [1, 4, 10].forEach((motorCount) => {
        REGIONS.forEach((id) => {
          const size = box(id, bladeCount, motorCount).getSize(new Vector3());
          expect(Math.min(size.x, size.y, size.z), id).toBeGreaterThan(0);
        });
      });
    });
  });

  it('keeps the head and its cap inside the motor', () => {
    expect(box('motor').containsBox(box('head'))).toBe(true);
    expect(box('head').containsPoint(new Vector3(0, OSCP.span[1], 0))).toBe(true);
    expect(box('head').containsPoint(new Vector3(HEAD.radius, HEAD.span[0], 0))).toBe(true);
  });

  it('widens the rotor for a ring with more blades', () => {
    const human = box('rotor').getSize(new Vector3());
    const spinach = box('rotor', BLADE_COUNTS.chloroplast).getSize(new Vector3());
    expect(spinach.x).toBeGreaterThan(human.x);
  });

  it('frames the pumps beside the motor and every motor of the row', () => {
    const pumps = box('pumps');
    expect(pumps.containsPoint(new Vector3(PUMPS.complexOne.x, 0, 0))).toBe(true);
    expect(pumps.containsBox(box('motor'))).toBe(true);
    const row = box('row', HUMAN_BLADE_COUNT, 10);
    expect(row.containsPoint(new Vector3(0, 0, rowOffsetZ(9)))).toBe(true);
    expect(box('row').equals(box('motor'))).toBe(true);
  });

  it('moves a region into world units through the frame', () => {
    const frame = new Matrix4().makeScale(UNITS_PER_NM, UNITS_PER_NM, UNITS_PER_NM);
    const world = regionBox('head', HUMAN, frame);
    expect(world.max.y).toBeCloseTo(OSCP.span[1] * UNITS_PER_NM);
  });
});
