import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { boundsOf } from './testing';
import { stitchRings } from './rings';
import type { Ring } from './rings';

const SIDES = 12;

function circle(x: number, radius: number, reverse = false): Ring {
  const ring = Array.from({ length: SIDES }, (_, index) => {
    const angle = (index / SIDES) * Math.PI * 2;
    return [x, radius * Math.sin(angle), radius * Math.cos(angle)] as const;
  });
  return reverse ? [...ring].reverse() : ring;
}

function outwardShare(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  let outward = 0;
  for (let index = 0; index < position.count; index += 1) {
    const radial = new Vector3(0, position.getY(index), position.getZ(index));
    const facing = new Vector3().fromBufferAttribute(normal, index);
    if (radial.length() < 1e-6 || radial.dot(facing) > 0) outward += 1;
  }
  return outward / position.count;
}

describe('stitchRings', () => {
  it('turns every side normal outward whichever way the rings run', () => {
    for (const reverse of [false, true]) {
      const tube = stitchRings([circle(0, 1, reverse), circle(2, 1, reverse)]);
      expect(outwardShare(tube)).toBe(1);
    }
  });

  it('closes both ends with caps that face away from the tube', () => {
    const capped = stitchRings([circle(0, 1), circle(2, 1)], { capStart: true, capEnd: true });
    const normal = capped.getAttribute('normal');
    const position = capped.getAttribute('position');
    const ends = { start: 0, end: 0 };
    for (let index = 0; index < position.count; index += 1) {
      if (Math.hypot(position.getY(index), position.getZ(index)) > 1e-6) continue;
      if (position.getX(index) === 0) ends.start = normal.getX(index);
      else ends.end = normal.getX(index);
    }
    expect(ends.start).toBeLessThan(0);
    expect(ends.end).toBeGreaterThan(0);
  });

  it('keeps the rings in place and spreads the texture along and around', () => {
    const tube = stitchRings([circle(0, 1), circle(3, 2)], { along: [0.2, 0.8] });
    const box = boundsOf(tube);
    expect(box.min.x).toBe(0);
    expect(box.max.x).toBe(3);
    expect(box.max.y).toBeCloseTo(2);
    const uv = tube.getAttribute('uv');
    expect(uv.getX(0)).toBeCloseTo(0.2);
    expect(uv.getX(uv.count - 1)).toBeCloseTo(0.8);
    expect(uv.getY(SIDES)).toBe(1);
  });

  it('stitches open strips without wrapping around', () => {
    const arc: Ring = [
      [0, -1, -1],
      [0, -1.2, 0],
      [0, -1, 1],
    ];
    const strip = stitchRings([arc, arc.map(([, y, z]) => [1, y, z] as const)], { open: true });
    expect(strip.getIndex()?.count).toBe(2 * 2 * 3);
    expect(strip.getAttribute('normal').getY(1)).toBeLessThan(0);
  });

  it('refuses a single ring', () => {
    expect(() => stitchRings([circle(0, 1)])).toThrow();
  });
});
