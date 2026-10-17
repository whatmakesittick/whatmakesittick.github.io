import { describe, expect, it } from 'vitest';
import { roundedPath, stationLine, surfaceRibbon } from './ribbon';
import { BodySurface, spot } from './surface';

const WIDTH = 0.01;
const LIFT = 0.002;
const SAG = 1e-3;

describe('surfaceRibbon', () => {
  const surface = new BodySurface();
  const path = stationLine(0.2, spot('side', 0.1), spot('shoulder', 0.9), 20);

  it('hugs the body surface on both sides of the car', () => {
    [1, -1].forEach((mirror) => {
      const geometry = surfaceRibbon(surface, { path, width: WIDTH, lift: LIFT }, mirror);
      const position = geometry.getAttribute('position');
      for (let vertex = 0; vertex < position.count; vertex += 1) {
        const [x, s] = path[Math.floor(vertex / 2)];
        const [px, py, pz] = surface.point(x, s, mirror);
        const gap = Math.hypot(
          position.getX(vertex) - px,
          position.getY(vertex) - py,
          position.getZ(vertex) - pz,
        );
        expect(gap).toBeLessThan(Math.hypot(WIDTH / 2, LIFT) + SAG);
        expect(Math.sign(position.getZ(vertex))).toBe(mirror);
      }
    });
  });

  it('faces away from the car', () => {
    const geometry = surfaceRibbon(surface, { path, width: WIDTH, lift: LIFT });
    geometry.computeVertexNormals();
    const normal = geometry.getAttribute('normal');
    for (let vertex = 0; vertex < normal.count; vertex += 1) {
      expect(normal.getZ(vertex)).toBeGreaterThan(0);
    }
  });
});

describe('roundedPath', () => {
  it('keeps the open ends and stays inside the corner box', () => {
    const path = roundedPath(
      [
        { at: [0, 0], round: 0 },
        { at: [1, 0], round: 0.3 },
        { at: [1, 1], round: 0 },
      ],
      false,
      4,
    );
    expect(path[0]).toEqual([0, 0]);
    expect(path[path.length - 1]).toEqual([1, 1]);
    path.forEach(([x, s]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    });
  });
});
