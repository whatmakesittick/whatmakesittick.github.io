import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Figure } from '@core/figure';
import { along, azimuthOf, isRightSide, vertexFields } from './hems';

const CHANNELS = 2;

describe('hem helpers', () => {
  it('measures the distance along an axis from an origin', () => {
    const origin = new Vector3(0, 1, 0);
    const axis = new Vector3(0, 1, 0);
    expect(along(new Vector3(3, 1.5, 2), origin, axis, new Vector3())).toBeCloseTo(0.5, 12);
  });

  it('reads the azimuth as an angle from the front, the same on both sides', () => {
    const centre = new Vector3();
    expect(azimuthOf(new Vector3(0, 0, 1), centre)).toBeCloseTo(0, 12);
    expect(azimuthOf(new Vector3(1, 0, 0), centre)).toBeCloseTo(Math.PI / 2, 12);
    expect(azimuthOf(new Vector3(-1, 0, 0), centre)).toBeCloseTo(Math.PI / 2, 12);
    expect(azimuthOf(new Vector3(0, 0, -1), centre)).toBeCloseTo(Math.PI, 12);
  });

  it('puts the character right on the negative x side', () => {
    expect(isRightSide(new Vector3(-0.1, 0, 0))).toBe(true);
    expect(isRightSide(new Vector3(0.1, 0, 0))).toBe(false);
  });

  it('writes one row per rest vertex into both channels', () => {
    const figure = { vertexCount: 2, restPositions: Float32Array.of(1, 2, 3, 4, 5, 6) } as Figure;
    const fields = vertexFields(figure, CHANNELS, (point, distances, extents, at) => {
      distances[at] = point.x;
      extents[at + 1] = point.z;
    });
    expect(Array.from(fields.distances)).toEqual([1, 0, 4, 0]);
    expect(Array.from(fields.extents)).toEqual([0, 3, 0, 6]);
  });
});
