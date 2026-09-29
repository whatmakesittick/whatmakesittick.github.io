import { describe, expect, it } from 'vitest';
import type { Offset } from './contraction';
import { blend, ellipsoid, union } from './field';
import { cavityPieces, envelopeHalves, valvePlane } from './wallMesh';

const still = (_x: number, _y: number, _z: number, out: Offset) => {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  return out;
};
const MOTION = { squeeze: still, emptying: still };
const DETAIL = { resolution: 32, marginMm: 4 };

describe('wall meshes', () => {
  it('splits the envelope into front and back halves that meet at the cut', () => {
    const { front, back } = envelopeHalves(
      ellipsoid([0, 0, 0], [20, 30, 15]),
      { min: [-20, -30, -15], max: [20, 30, 15] },
      DETAIL,
      MOTION,
      () => [1, 0, 0],
      [],
    );
    const minZ = (positions: ArrayLike<number>) => {
      let min = Number.POSITIVE_INFINITY;
      for (let offset = 2; offset < positions.length; offset += 3)
        min = Math.min(min, positions[offset]);
      return min;
    };
    expect(minZ(front.getAttribute('position').array)).toBeGreaterThanOrEqual(-1e-3);
    expect(back.getAttribute('color').array[0]).toBe(1);
    expect(front.morphAttributes.position).toHaveLength(2);
  });

  it('describes a valve plane that faces the flow', () => {
    const plane = valvePlane('mitral');
    expect(plane.normal[1]).toBeCloseTo(-1, 5);
  });

  it('keeps the back of a cavity and gives each chamber its piece', () => {
    const atrium = ellipsoid([0, 20, 0], [12, 12, 12]);
    const ventricle = ellipsoid([0, -15, 0], [12, 18, 12]);
    const chambers = {
      rightAtrium: atrium,
      rightVentricle: ventricle,
      leftAtrium: atrium,
      leftVentricle: ventricle,
    };
    const pieces = cavityPieces(
      'right',
      union([blend([atrium], 0), ventricle]),
      chambers,
      { min: [-12, -33, -12], max: [12, 32, 12] },
      DETAIL,
      MOTION,
      [],
    );
    expect([...pieces.keys()]).toEqual(['rightAtrium', 'rightVentricle']);
    for (const geometry of pieces.values()) {
      const positions = geometry.getAttribute('position').array;
      for (let offset = 2; offset < positions.length; offset += 3)
        expect(positions[offset]).toBeLessThanOrEqual(1e-3);
    }
  });
});
