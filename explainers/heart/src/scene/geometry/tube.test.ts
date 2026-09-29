import { CatmullRomCurve3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { hollowTube, tubePieces } from './tube';

const CURVE = new CatmullRomCurve3([
  new Vector3(0, 0, 0),
  new Vector3(0, 30, 0),
  new Vector3(10, 50, 0),
]);

function tube(plugs: { start: boolean; end: boolean }) {
  return hollowTube({
    curve: CURVE,
    fromMm: 0,
    outer: () => 6,
    inner: () => 4.5,
    segmentMm: 3,
    radialSegments: 16,
    wallColour: '#ff0000',
    lumenColour: '#330000',
    plugInsetMm: 0.4,
    annuli: { start: true, end: true },
    plugs,
  });
}

describe('hollow tubes', () => {
  it('builds an outer wall, a lumen and end rings with colours', () => {
    const geometry = tube({ start: false, end: false });
    const positions = geometry.getAttribute('position').array;
    const colours = geometry.getAttribute('color').array;
    const radii = new Set<number>();
    for (let offset = 0; offset < 40 * 3; offset += 3) {
      radii.add(Math.round(Math.hypot(positions[offset], positions[offset + 2])));
    }
    expect(radii.has(6)).toBe(true);
    expect(colours[0]).toBeCloseTo(1, 3);
  });

  it('adds plugs only where asked', () => {
    const open = tube({ start: false, end: false }).getIndex()?.count ?? 0;
    const plugged = tube({ start: false, end: true }).getIndex()?.count ?? 0;
    expect(plugged - open).toBe(16 * 3);
  });

  it('faces the outer wall outward', () => {
    const geometry = tube({ start: false, end: false });
    const positions = geometry.getAttribute('position').array;
    const index = geometry.getIndex()?.array ?? [];
    const [a, b, c] = [index[0] * 3, index[1] * 3, index[2] * 3];
    const ab = new Vector3(
      positions[b] - positions[a],
      positions[b + 1] - positions[a + 1],
      positions[b + 2] - positions[a + 2],
    );
    const ac = new Vector3(
      positions[c] - positions[a],
      positions[c + 1] - positions[a + 1],
      positions[c + 2] - positions[a + 2],
    );
    const normal = ab.cross(ac);
    const radial = new Vector3(positions[a], 0, positions[a + 2]);
    expect(normal.dot(radial)).toBeGreaterThan(0);
  });

  it('fades the lumen colour from the given start', () => {
    const geometry = hollowTube({
      curve: CURVE,
      fromMm: 0,
      outer: () => 6,
      inner: () => 4.5,
      segmentMm: 3,
      radialSegments: 8,
      wallColour: '#ff0000',
      lumenColour: '#0000ff',
      plugInsetMm: 0.4,
      annuli: { start: true, end: true },
      plugs: { start: false, end: false },
      lumenFade: { colour: '#00ff00', fromMm: 0, toMm: 20 },
    });
    const colours = geometry.getAttribute('color').array;
    const rings = Math.ceil(CURVE.getLength() / 3) + 1;
    const lumenStart = rings * 9 * 3;
    expect(colours[lumenStart + 1]).toBeCloseTo(1, 3);
    expect(colours[colours.length / 2 + 1]).toBeLessThan(1);
  });

  it('splits a tube into pieces along its length that share their seam rings', () => {
    const geometry = tube({ start: false, end: true });
    const [first, second] = tubePieces(geometry, [20]);
    const ys = (piece: typeof first.wall) => {
      const positions = piece.getAttribute('position').array;
      const values: number[] = [];
      for (let offset = 1; offset < positions.length; offset += 3) values.push(positions[offset]);
      return values;
    };
    expect(Math.max(...ys(first.wall))).toBeLessThan(21);
    expect(Math.min(...ys(second.wall))).toBeGreaterThan(18);
    expect(first.lumen.getAttribute('position').count).toBeGreaterThan(0);
    expect(first.wall.getAttribute('layer')).toBeUndefined();
    const seamTop = Math.max(...ys(first.wall));
    expect(ys(second.wall).some((y) => Math.abs(y - seamTop) < 1e-4)).toBe(true);
  });

  it('leaves the end rings off when asked', () => {
    const open = hollowTube({
      curve: CURVE,
      fromMm: 0,
      outer: () => 6,
      inner: () => 4.5,
      segmentMm: 3,
      radialSegments: 16,
      wallColour: '#ff0000',
      lumenColour: '#330000',
      plugInsetMm: 0.4,
      annuli: { start: false, end: false },
      plugs: { start: false, end: false },
    });
    const closed = tube({ start: false, end: false });
    expect((closed.getIndex()?.count ?? 0) - (open.getIndex()?.count ?? 0)).toBe(2 * 16 * 6);
  });
});
