import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import {
  BACK_HALF_ARC,
  outlineOf,
  profileCap,
  revolveShell,
  revolveStrand,
  signedArea,
} from './revolve';
import type { Strand } from './revolve';

const WALL: Strand = [
  [10, 0],
  [12, -10],
  [14, -20],
];

function faceNormal(geometry: BufferGeometry, face: number): Vector3 {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  if (!index) throw new Error('Expected an indexed geometry');
  const [a, b, c] = [0, 1, 2].map((corner) =>
    new Vector3().fromBufferAttribute(position, index.getX(face * 3 + corner)),
  );
  return b.sub(a).cross(c.sub(a)).normalize();
}

describe('revolve', () => {
  it('turns a strand into a ring of vertices with outward normals', () => {
    const geometry = revolveStrand(WALL, { segments: 16 });
    expect(geometry.getAttribute('position').count).toBe(WALL.length * 17);
    const normal = geometry.getAttribute('normal');
    const position = geometry.getAttribute('position');
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const radial = new Vector3(position.getX(vertex), 0, position.getZ(vertex));
      const outward = new Vector3(normal.getX(vertex), 0, normal.getZ(vertex));
      expect(radial.dot(outward)).toBeGreaterThan(0);
    }
    const facing = faceNormal(geometry, 0);
    const [x, , z] = [...position.array.slice(0, 3)];
    expect(facing.dot(new Vector3(x, 0, z))).toBeGreaterThan(0);
  });

  it('keeps the back half behind the cut plane', () => {
    const geometry = revolveStrand(WALL, { segments: 32, arc: BACK_HALF_ARC });
    const position = geometry.getAttribute('position');
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      expect(position.getZ(vertex)).toBeLessThanOrEqual(1e-9);
    }
  });

  it('caps the cut with faces toward the viewer on both sides', () => {
    const outline: Strand = [
      [1, 0],
      [1, -2],
      [0.5, -2],
      [0.5, 0],
    ];
    const cap = profileCap(outline);
    const faces = (cap.getIndex()?.count ?? 0) / 3;
    expect(faces).toBe(4);
    for (let face = 0; face < faces; face += 1) {
      expect(faceNormal(cap, face).z).toBeCloseTo(1);
    }
  });

  it('measures the winding of a triangle', () => {
    const points: Strand = [
      [0, 0],
      [1, 0],
      [0, 1],
    ];
    expect(signedArea(points, [0, 1, 2])).toBeGreaterThan(0);
    expect(signedArea(points, [0, 2, 1])).toBeLessThan(0);
  });

  it('drops repeated joints from an outline', () => {
    expect(outlineOf([WALL, [WALL[2], [0, -20]], [[0, -20], WALL[0]]])).toHaveLength(4);
  });

  it('builds a shell with a cavity only when it has an inner surface', () => {
    const solid = revolveShell({ outline: [{ strand: WALL }] }, { segments: 8 });
    expect(solid.cavity).toBeNull();
    const hollow = revolveShell(
      {
        outline: [
          { strand: WALL },
          { strand: [WALL[2], [12, -20]] },
          {
            strand: [
              [12, -20],
              [8, 0],
            ],
            inner: true,
          },
        ],
      },
      { segments: 8 },
    );
    expect(hollow.cavity).not.toBeNull();
  });
});
