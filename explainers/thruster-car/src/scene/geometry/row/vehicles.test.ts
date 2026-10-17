import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { PARKED_ROW } from '../../../model/layout';
import type { ParkedKind } from '../../../model/layout';
import { ROW_SWATCHES } from '../../parts/row/finishes';
import { createPalette } from '../body/palette';
import { CAR_MODEL } from './car';
import { PICKUP_MODEL } from './pickup';
import { TRUCK_MODEL } from './truck';
import { wheelPrints } from './vehicle';
import type { VehicleModel } from './vehicle';

const MODELS: Readonly<Record<ParkedKind, VehicleModel>> = {
  car: CAR_MODEL,
  pickup: PICKUP_MODEL,
  truck: TRUCK_MODEL,
};

const TOLERANCE = 0.002;
const CONTACT_TOLERANCE = 0.01;
const FILL_SHARE = 0.95;
const ROW_TRIANGLE_LIMIT = 15000;

const palette = createPalette(ROW_SWATCHES);
const kinds = [...new Set(PARKED_ROW.map((vehicle) => vehicle.kind))];
const builds = new Map(
  kinds.map((kind) => {
    const size = PARKED_ROW.find((vehicle) => vehicle.kind === kind)!;
    return [kind, { size, geometry: MODELS[kind].geometry(size, 'paintSlate', palette.uv) }];
  }),
);

function triangles(geometry: BufferGeometry): number {
  return (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
}

function lowestNear(geometry: BufferGeometry, x: number, z: number, reach: number): number {
  const position = geometry.getAttribute('position');
  let lowest = Infinity;
  for (let index = 0; index < position.count; index += 1) {
    if (Math.abs(position.getX(index) - x) > reach) continue;
    if (Math.abs(position.getZ(index) - z) > reach) continue;
    lowest = Math.min(lowest, position.getY(index));
  }
  return lowest;
}

describe.each(kinds)('the parked %s', (kind) => {
  const { size, geometry } = builds.get(kind)!;
  const bounds = new Box3().setFromBufferAttribute(geometry.getAttribute('position') as never);
  const extent = bounds.getSize(new Vector3());

  it('sits on the ground inside its box', () => {
    expect(bounds.min.y).toBeGreaterThanOrEqual(-TOLERANCE);
    expect(bounds.max.y).toBeLessThanOrEqual(size.height + TOLERANCE);
    expect(Math.max(-bounds.min.x, bounds.max.x)).toBeLessThanOrEqual(size.length / 2 + TOLERANCE);
    expect(Math.max(-bounds.min.z, bounds.max.z)).toBeLessThanOrEqual(size.width / 2 + TOLERANCE);
  });

  it('fills its box', () => {
    expect(extent.x).toBeGreaterThan(size.length * FILL_SHARE);
    expect(extent.y).toBeGreaterThan(size.height * FILL_SHARE);
    expect(extent.z).toBeGreaterThan(size.width * FILL_SHARE);
  });

  it('stands every wheel on the ground', () => {
    wheelPrints(MODELS[kind], size).forEach((print) => {
      const lowest = lowestNear(geometry, print.x, print.z, print.width / 2);
      expect(Math.abs(lowest)).toBeLessThan(CONTACT_TOLERANCE);
    });
  });

  it('paints every vertex from the swatch palette', () => {
    const uv = geometry.getAttribute('uv');
    expect(uv.count).toBe(geometry.getAttribute('position').count);
  });
});

describe('the parked row', () => {
  it('stays within the triangle budget', () => {
    const total = PARKED_ROW.reduce(
      (sum, vehicle) => sum + triangles(builds.get(vehicle.kind)!.geometry),
      0,
    );
    expect(total).toBeLessThan(ROW_TRIANGLE_LIMIT);
  });
});
