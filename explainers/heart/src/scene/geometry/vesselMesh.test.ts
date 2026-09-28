import { CatmullRomCurve3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { hollowTube } from './tube';
import { vesselHalves } from './vesselMesh';

describe('vessel halves', () => {
  it('splits a vessel at the cut plane and closes its cut walls', () => {
    const geometry = hollowTube({
      curve: new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0, 40, 0)]),
      fromMm: 0,
      outer: () => 8,
      inner: () => 6,
      segmentMm: 4,
      radialSegments: 20,
      wallColour: '#ff0000',
      lumenColour: '#330000',
      plugInsetMm: 0.4,
      plugs: { start: true, end: true },
    });
    const { front, back } = vesselHalves(geometry, '#aa0000');
    const zs = (mesh: typeof front.wall) => {
      const positions = mesh.getAttribute('position').array;
      const values: number[] = [];
      for (let offset = 2; offset < positions.length; offset += 3) values.push(positions[offset]);
      return values;
    };
    expect(Math.min(...zs(front.wall))).toBeGreaterThanOrEqual(-1e-3);
    expect(Math.max(...zs(back.lumen))).toBeLessThanOrEqual(1e-3);
    const rimVertices = zs(back.wall).filter((z) => Math.abs(z + 0.05) < 1e-4).length;
    expect(rimVertices).toBeGreaterThan(8);
    expect(front.lumen.getAttribute('position').count).toBeGreaterThan(0);
  });
});
