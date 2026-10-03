import { Box3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { CROSSING } from '../../constants';
import { carGeometry } from './crossing';

function bounds(geometry: BufferGeometry): Box3 {
  geometry.computeBoundingBox();
  return geometry.boundingBox ?? new Box3();
}

describe('wrecked pickup', () => {
  it('stands on four wheels that show below and beside the body', () => {
    const { body, wheels } = carGeometry();
    const shell = bounds(body);
    const tyres = bounds(wheels);
    expect(tyres.min.y).toBeCloseTo(0);
    expect(tyres.min.y).toBeLessThan(shell.min.y - 0.3);
    expect(tyres.max.z).toBeGreaterThan(CROSSING.car.sill.halfWidth);
    expect(wheels.getAttribute('position').count).toBeGreaterThan(4 * CROSSING.car.wheel.segments);
  });

  it('rises from the bed to the bonnet to the cabin roof', () => {
    const { bed, bonnet, cabin } = CROSSING.car;
    expect(cabin.top).toBeGreaterThan(bed.top);
    expect(bed.top).toBeGreaterThan(bonnet.top);
    expect(bounds(carGeometry().body).max.y).toBeCloseTo(cabin.top);
  });
});
