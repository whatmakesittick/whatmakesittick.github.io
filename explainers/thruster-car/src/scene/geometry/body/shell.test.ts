import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three';
import { BODY, WHEEL, WHEEL_CENTRES } from '../../parts/car/dimensions';
import { BODY_X } from './profile';
import { BODY_REGIONS } from './regions';
import type { BodyRegion } from './regions';
import { SEGMENT_CELLS, SEGMENTS, StationSection } from './section';
import type { SegmentId } from './section';
import { buildShell } from './shell';
import { bodyStations } from './stations';

type Corner = readonly [number, number, number];

const TRIANGLE_RANGE = { min: 15000, max: 25000 } as const;
const AREA_EPSILON = 1e-12;
const KEY_DIGITS = 6;
const SIDES = 2;
const ROOF_FLOOR_Y = 0.9;
const EDGE_TOLERANCE = 1e-9;
const FLOAT_TOLERANCE = 1e-6;

const stations = bodyStations();
const sections = stations.map((x) => new StationSection(x));
const shell = buildShell(stations);

function triangles(geometry: BufferGeometry): Corner[][] {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  if (!index) throw new Error('shell regions are indexed');
  return Array.from({ length: index.count / 3 }, (_, face) =>
    [0, 1, 2].map((corner): Corner => {
      const vertex = index.getX(face * 3 + corner);
      return [position.getX(vertex), position.getY(vertex), position.getZ(vertex)];
    }),
  );
}

function squaredArea(a: Corner, b: Corner, c: Corner): number {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return normal.reduce((sum, value) => sum + value * value, 0);
}

function isLive([a, b, c, d]: readonly Corner[]): boolean {
  return Math.max(squaredArea(a, b, c), squaredArea(a, c, d)) >= AREA_EPSILON;
}

function node(section: StationSection, segment: SegmentId, row: number, mirror = 1): Corner {
  const [z, y] = section.point(segment, row / SEGMENT_CELLS[segment]);
  return [section.x, y, z * mirror];
}

function liveSideCells(): number {
  return SEGMENTS.reduce((sum, segment) => {
    let live = 0;
    sections.slice(0, -1).forEach((section, i) => {
      for (let row = 0; row < SEGMENT_CELLS[segment]; row += 1) {
        const next = sections[i + 1];
        const quad = [
          node(section, segment, row),
          node(next, segment, row),
          node(next, segment, row + 1),
          node(section, segment, row + 1),
        ];
        if (isLive(quad)) live += 1;
      }
    });
    return sum + live;
  }, 0);
}

function liveCapCells(): number {
  return [sections[0], sections[sections.length - 1]].reduce(
    (sum, section) =>
      sum +
      SEGMENTS.reduce((count, segment) => {
        let live = 0;
        for (let row = 0; row < SEGMENT_CELLS[segment]; row += 1) {
          const quad = [
            node(section, segment, row),
            node(section, segment, row + 1),
            node(section, segment, row + 1, -1),
            node(section, segment, row, -1),
          ];
          if (isLive(quad)) live += 1;
        }
        return count + live;
      }, 0),
    0,
  );
}

function regionTriangles(region: BodyRegion): Corner[][] {
  const geometry = shell.get(region);
  return geometry ? triangles(geometry) : [];
}

function regionCorners(region: BodyRegion): Corner[] {
  return regionTriangles(region).flat();
}

describe('bodyStations', () => {
  it('runs from tail to nose in order through every breakpoint', () => {
    expect(stations[0]).toBeCloseTo(-BODY.halfLength, 9);
    expect(stations[stations.length - 1]).toBeCloseTo(BODY.halfLength, 9);
    expect(stations.slice(1).every((x, index) => x > stations[index])).toBe(true);
    const missing = Object.values(BODY_X).filter(
      (x) => !stations.some((station) => Math.abs(station - x) < EDGE_TOLERANCE),
    );
    expect(missing).toEqual([]);
  });
});

describe('buildShell', () => {
  it('puts every live grid cell into exactly one region', () => {
    const all = BODY_REGIONS.flatMap(regionTriangles);
    const keys = new Set(
      all.map((corners) =>
        corners
          .flat()
          .map((value) => value.toFixed(KEY_DIGITS))
          .join(','),
      ),
    );
    expect(keys.size).toBe(all.length);
    expect(all.length).toBe(2 * (SIDES * liveSideCells() + liveCapCells()));
  });

  it('stays within a moderate triangle budget', () => {
    const total = BODY_REGIONS.reduce((sum, region) => sum + regionTriangles(region).length, 0);
    expect(total).toBeGreaterThan(TRIANGLE_RANGE.min);
    expect(total).toBeLessThan(TRIANGLE_RANGE.max);
  });

  it('keeps the wheel arches clear of the tyres', () => {
    const clearance = WHEEL.radius + 0.9 * WHEEL.archClearance;
    const halfTyre = WHEEL.tyreWidth / 2 + WHEEL.archClearance / 2;
    const closest = BODY_REGIONS.flatMap(regionCorners).reduce((nearest, [x, y, z]) => {
      const gaps = WHEEL_CENTRES.filter(([, , cz]) => Math.abs(z - cz) <= halfTyre).map(
        ([cx, cy]) => Math.hypot(x - cx, y - cy),
      );
      return Math.min(nearest, ...gaps);
    }, Infinity);
    expect(closest).toBeGreaterThanOrEqual(clearance);
  });

  it('keeps the cutaway panels on their side of the car', () => {
    const door = regionCorners('doorRight');
    expect(door.every(([, , z]) => z > 0)).toBe(true);
    expect(
      door.every(
        ([x]) => x >= BODY_X.doorRear - FLOAT_TOLERANCE && x <= BODY_X.doorFront + FLOAT_TOLERANCE,
      ),
    ).toBe(true);
    expect(regionCorners('doorLeft').every(([, , z]) => z < 0)).toBe(true);
    expect(regionCorners('windowRight').every(([, , z]) => z > 0)).toBe(true);
    expect(regionCorners('roof').every(([, y]) => y > ROOF_FLOOR_Y)).toBe(true);
  });
});
