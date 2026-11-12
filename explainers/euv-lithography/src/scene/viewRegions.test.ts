import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MASK, WAFER, waypoint } from '../model/layout';
import { viewRegion } from './viewRegions';

const IDENTITY = new Matrix4();
const HALF = 0.5;

function holdsSquare(id: 'maskStage' | 'waferStage', centre: Vector3, half: number): boolean {
  const box = viewRegion(id, IDENTITY);
  return [-half, half].every((dx) =>
    [-half, half].every((dz) => box?.containsPoint(centre.clone().add(new Vector3(dx, 0, dz)))),
  );
}

describe('euv view regions', () => {
  it('frames the whole wafer in the wafer stage view', () => {
    const centre = new Vector3(...waypoint('wafer'));
    expect(holdsSquare('waferStage', centre, WAFER.diameterM * HALF)).toBe(true);
  });

  it('frames the whole mask plate in the mask stage view', () => {
    const centre = new Vector3(...waypoint('mask'));
    expect(holdsSquare('maskStage', centre, MASK.plateM * HALF)).toBe(true);
  });
});
