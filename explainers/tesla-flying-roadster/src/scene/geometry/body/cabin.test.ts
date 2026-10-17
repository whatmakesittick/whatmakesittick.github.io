import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three';
import { TANK } from '../../../model/layout';
import { ARCH, archCeiling } from './arches';
import { buildCockpit } from './cabinCockpit';
import { shellCeiling, shellHalfWidth } from './cabinFit';
import { buildSeat } from './cabinSeat';
import { buildTub, SILL } from './cabinTub';
import type { Vec3 } from './mesh';

const TANK_CLEARANCE = 0.03;
const SHELL_MARGIN = 0.005;
const OPEN_SIDE = { from: -0.65, to: 1.05 } as const;
const TRIANGLE_BUDGET = 4500;

const seat = buildSeat();
const cockpit = buildCockpit();
const tub = buildTub();

function vertices(geometries: readonly BufferGeometry[]): Vec3[] {
  return geometries.flatMap((geometry) => {
    const position = geometry.getAttribute('position');
    return Array.from({ length: position.count }, (_, index): Vec3 => [
      position.getX(index),
      position.getY(index),
      position.getZ(index),
    ]);
  });
}

function triangles(geometries: readonly BufferGeometry[]): number {
  return geometries.reduce(
    (sum, geometry) => sum + (geometry.index?.count ?? geometry.getAttribute('position').count) / 3,
    0,
  );
}

function tankGap([x, y, z]: Vec3): number {
  const [cx, cy, cz] = TANK.centre;
  const reach = TANK.length / 2 + TANK_CLEARANCE;
  if (Math.abs(x - cx) > reach) return Infinity;
  return Math.hypot(y - cy, z - cz) - TANK.radius;
}

function insideShell([x, y, z]: Vec3): boolean {
  const across = Math.abs(z);
  const ceiling = archCeiling(x, 0);
  if (y < ceiling && across > ARCH.innerZ) return false;
  return across < shellHalfWidth(x, y) - SHELL_MARGIN && y < shellCeiling(x, across) - SHELL_MARGIN;
}

const seatParts = [...seat.shell, ...seat.cushion, ...seat.harness, ...seat.buckle];
const bodyParts = [
  ...cockpit.wheel,
  ...cockpit.dash,
  ...cockpit.screen,
  ...tub.floor,
  ...tub.walls,
];

describe('cabin seat', () => {
  it('sits on the driver side, clear of the tank', () => {
    const points = vertices(seatParts);
    expect(points.every(([, , z]) => z < 0)).toBe(true);
    expect(Math.min(...points.map(tankGap))).toBeGreaterThan(TANK_CLEARANCE);
  });

  it('builds a padded bucket with a harness and a buckle', () => {
    expect(seat.cushion.length).toBeGreaterThan(0);
    expect(seat.harness.length).toBeGreaterThanOrEqual(5);
    expect(seat.buckle.length).toBeGreaterThan(0);
  });
});

describe('cabin fit', () => {
  it('tells points inside the shell from points outside it', () => {
    expect(insideShell([0.2, 0.5, -0.5])).toBe(true);
    expect(insideShell([0.2, 0.5, -1.05])).toBe(false);
    expect(insideShell([0.2, 1.1, 0])).toBe(false);
    expect(insideShell([1.4, 0.3, -0.8])).toBe(false);
  });

  it('keeps every part inside the body shell', () => {
    const outside = vertices([...seatParts, ...bodyParts]).filter((point) => !insideShell(point));
    expect(outside).toEqual([]);
  });

  it('keeps the tank space clear', () => {
    expect(Math.min(...vertices(bodyParts).map(tankGap))).toBeGreaterThan(TANK_CLEARANCE);
  });

  it('leaves no wall beside the tank above the sills on the right', () => {
    const beside = vertices(bodyParts).filter(
      ([x, , z]) => z > 0 && x > OPEN_SIDE.from && x < OPEN_SIDE.to,
    );
    expect(Math.max(...beside.map(([, y]) => y))).toBeLessThanOrEqual(SILL.top + 1e-6);
  });

  it('stays within the triangle budget', () => {
    expect(triangles([...seatParts, ...bodyParts])).toBeLessThan(TRIANGLE_BUDGET);
  });
});
